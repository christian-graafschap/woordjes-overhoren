import type { Richting, VakInstellingen, Woord } from './types';

export type Uitslag = 'goed' | 'lidwoordFout' | 'fout';

export interface DiffDeel {
  tekst: string;
  /** true = dit stuk wijkt af (in invoer: fout/extra; in juist antwoord: gemist). */
  anders: boolean;
}

export interface Beoordeling {
  uitslag: Uitslag;
  /** Het juiste antwoord waarmee is vergeleken (hoofdantwoord of dichtstbijzijnd alternatief). */
  juist: string;
  /** Uitleg voor de speler, bijv. "Woord goed, lidwoord fout". Leeg bij een gewoon goed antwoord. */
  melding: string;
  diffInvoer: DiffDeel[];
  diffJuist: DiffDeel[];
}

export interface NakijkOpties {
  /** Taalcode van het antwoord (fr, de, en, es, it, nl) voor lidwoorden. */
  taal: string;
  hoofdlettersBelangrijk: boolean;
  accenten: 'streng' | 'soepel';
}

// Lidwoorden (en voor Engels ook "to" bij werkwoorden), langste eerst zodat "l'" en "les" goed gaan.
const LIDWOORDEN: Record<string, string[]> = {
  fr: ['les', 'le', 'la', "l'", 'une', 'un', 'des', 'du'],
  de: ['der', 'die', 'das', 'den', 'dem', 'des', 'eine', 'einen', 'einem', 'einer', 'eines', 'ein'],
  en: ['the', 'an', 'a', 'to'],
  nl: ['het', 'de', 'een', "'t"],
  es: ['los', 'las', 'el', 'la', 'unos', 'unas', 'una', 'un'],
  it: ['gli', 'il', 'lo', 'la', 'le', "l'", 'uno', 'una', 'un', 'i'],
};

/** Spaties opschonen en rare apostroffen gelijktrekken. */
export function schoon(s: string): string {
  return s.normalize('NFC').replace(/[’‘`´]/g, "'").trim().replace(/\s+/g, ' ');
}

/** Accenten verwijderen (é → e) en ß/œ/æ uitschrijven. */
export function zonderAccenten(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'Oe')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'Ae')
    .normalize('NFC');
}

/** Splitst "le chien" in { lidwoord: 'le', kern: 'chien' }. Lidwoord is altijd lowercase. */
export function splitsLidwoord(s: string, taal: string): { lidwoord: string; kern: string } {
  const t = schoon(s);
  const lijst = LIDWOORDEN[taal] ?? [];
  const klein = t.toLowerCase();
  for (const lw of lijst) {
    if (lw.endsWith("'")) {
      if (klein.startsWith(lw) && t.length > lw.length) {
        return { lidwoord: lw, kern: t.slice(lw.length).trim() };
      }
    } else if (klein.startsWith(lw + ' ') && t.length > lw.length + 1) {
      return { lidwoord: lw, kern: t.slice(lw.length + 1) };
    }
  }
  return { lidwoord: '', kern: t };
}

type Vergelijk = 'exact' | 'hoofdletter' | 'accent' | 'anders';

/** Vergelijkt twee kernen (zonder lidwoord) en zegt hoe ver ze uit elkaar liggen. */
function vergelijkKern(a: string, b: string, opties: NakijkOpties): Vergelijk {
  const caseA = opties.hoofdlettersBelangrijk ? a : a.toLowerCase();
  const caseB = opties.hoofdlettersBelangrijk ? b : b.toLowerCase();
  if (caseA === caseB) return 'exact';
  if (a.toLowerCase() === b.toLowerCase()) return 'hoofdletter';
  if (zonderAccenten(caseA) === zonderAccenten(caseB)) return 'accent';
  if (zonderAccenten(a.toLowerCase()) === zonderAccenten(b.toLowerCase())) return 'hoofdletter';
  return 'anders';
}

/** Levenshtein-afstand, hoofdletterongevoelig; om het dichtstbijzijnde alternatief te kiezen. */
export function afstand(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const rij = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let vorige = rij[0];
    rij[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = rij[j];
      rij[j] = Math.min(rij[j] + 1, rij[j - 1] + 1, vorige + (a[i - 1] === b[j - 1] ? 0 : 1));
      vorige = tmp;
    }
  }
  return rij[b.length];
}

function voegToe(delen: DiffDeel[], teken: string, anders: boolean) {
  const laatste = delen[delen.length - 1];
  if (laatste && laatste.anders === anders) laatste.tekst += teken;
  else delen.push({ tekst: teken, anders });
}

/**
 * Tekenverschil via langste gemeenschappelijke deelreeks. Geeft voor de invoer aan welke tekens
 * fout/overbodig zijn, en voor het juiste antwoord welke tekens gemist zijn.
 */
export function maakDiff(invoer: string, juist: string, hoofdletters = false): { invoer: DiffDeel[]; juist: DiffDeel[] } {
  const norm = (c: string) => (hoofdletters ? c : c.toLowerCase());
  const a = [...invoer];
  const b = [...juist];
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = norm(a[i]) === norm(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const dInvoer: DiffDeel[] = [];
  const dJuist: DiffDeel[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && norm(a[i]) === norm(b[j])) {
      voegToe(dInvoer, a[i++], false);
      voegToe(dJuist, b[j++], false);
    } else if (j < b.length && (i >= a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      voegToe(dJuist, b[j++], true);
    } else {
      voegToe(dInvoer, a[i++], true);
    }
  }
  return { invoer: dInvoer, juist: dJuist };
}

/** Alle geldige antwoorden voor een woord in een richting: hoofdantwoord eerst. */
export function geldigeAntwoorden(woord: Woord, richting: Richting): string[] {
  const lijst = richting === 'naarNL' ? [woord.nederlands, ...woord.altNederlands] : [woord.vreemd, ...woord.altVreemd];
  return lijst.map(schoon).filter(Boolean);
}

/** Nakijkopties voor een woord in een richting: vak-instellingen gelden alleen voor de vreemde taal. */
export function optiesVoor(richting: Richting, vak: VakInstellingen): NakijkOpties {
  if (richting === 'naarNL') {
    return { taal: 'nl', hoofdlettersBelangrijk: false, accenten: vak.accenten };
  }
  return { taal: vak.taal, hoofdlettersBelangrijk: vak.hoofdlettersBelangrijk, accenten: vak.accenten };
}

/** Kijkt een getypt antwoord na tegen een lijst geldige antwoorden. */
export function beoordeel(invoerRuw: string, kandidaten: string[], opties: NakijkOpties): Beoordeling {
  const invoer = schoon(invoerRuw);
  const hoofd = kandidaten[0] ?? '';
  const resultaat = (uitslag: Uitslag, juist: string, melding: string): Beoordeling => {
    const d = maakDiff(invoer, juist, opties.hoofdlettersBelangrijk);
    return { uitslag, juist, melding, diffInvoer: d.invoer, diffJuist: d.juist };
  };
  if (!invoer) return resultaat('fout', hoofd, 'Geen antwoord ingevuld');

  const inv = splitsLidwoord(invoer, opties.taal);
  let accentMatch: string | null = null;
  let hoofdletterMatch: string | null = null;
  let lidwoordMatch: string | null = null;

  for (const k of kandidaten) {
    const kan = splitsLidwoord(k, opties.taal);
    const kern = vergelijkKern(inv.kern, kan.kern, opties);
    const zelfdeLidwoord = inv.lidwoord === kan.lidwoord;
    if (kern === 'exact' && zelfdeLidwoord) return resultaat('goed', k, '');
    if (kern === 'accent' && zelfdeLidwoord) accentMatch ??= k;
    if (kern === 'hoofdletter' && zelfdeLidwoord) hoofdletterMatch ??= k;
    if ((kern === 'exact' || (kern === 'accent' && opties.accenten === 'soepel')) && !zelfdeLidwoord) {
      lidwoordMatch ??= k;
    }
    // Invoer zonder lidwoord die precies gelijk is aan een kandidaat zonder lidwoord-splitsing
    // (bijv. een alternatief dat met "de" begint maar geen lidwoord bedoelt) is ook goed.
    if (vergelijkKern(invoer, schoon(k), opties) === 'exact') return resultaat('goed', k, '');
  }

  if (accentMatch) {
    if (opties.accenten === 'soepel') return resultaat('goed', accentMatch, `Goed! Let op de spelling: ${accentMatch}`);
    return resultaat('fout', accentMatch, 'Bijna: let op de accenten');
  }
  if (lidwoordMatch) {
    const juistLw = splitsLidwoord(lidwoordMatch, opties.taal).lidwoord;
    const melding = !juistLw
      ? 'Woord goed, maar hier hoort geen lidwoord bij'
      : juistLw === 'to'
        ? "Woord goed, maar vergeet 'to' niet"
        : !inv.lidwoord
        ? `Woord goed, maar het lidwoord ontbreekt (${juistLw})`
        : `Woord goed, lidwoord fout (${juistLw})`;
    return resultaat('lidwoordFout', lidwoordMatch, melding);
  }
  if (hoofdletterMatch) return resultaat('fout', hoofdletterMatch, 'Bijna: let op de hoofdletters');

  let beste = hoofd;
  let besteAfstand = Infinity;
  for (const k of kandidaten) {
    const d = afstand(invoer, k);
    if (d < besteAfstand) {
      beste = k;
      besteAfstand = d;
    }
  }
  return resultaat('fout', beste, '');
}
