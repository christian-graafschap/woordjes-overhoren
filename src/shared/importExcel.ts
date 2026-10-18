import * as XLSX from 'xlsx';
import { schoon } from './grading';
import { datumString, legeVoortgang, standaardVakInstellingen } from './state';
import type { AppState, Woord } from './types';

// Formaat: één Excelbestand per vak per toets, met twee kolommen. De kolomkoppen zijn de talen,
// bijv. "Nederlands" | "Frans". De kolom "Nederlands" is het Nederlands, de andere de vreemde taal;
// de volgorde maakt niet uit. Vak en toets kiest de gebruiker bij het inladen; de bestandsnaam telt niet.

/** Eén ingelezen woordpaar, nog zonder vak/toets. */
export interface ImportPaar {
  vreemd: string;
  nederlands: string;
  /** Rijnummer zoals in Excel, voor meldingen. */
  bron: string;
}

export interface ImportRij extends ImportPaar {
  id: string;
  vak: string;
  toets: string;
}

export interface ImportFout {
  bron: string;
  melding: string;
}

export interface ImportResultaat {
  paren: ImportPaar[];
  fouten: ImportFout[];
  /** Kolomkop van de vreemde taal, bijv. "Frans". */
  taal: string;
}

export interface ToetsSamenvatting {
  vak: string;
  toets: string;
  nieuw: number;
  bestaand: number;
}

/** Sleutel van een woord: vak + toets + vreemd woord, hoofdletterongevoelig. */
export function woordId(vak: string, toets: string, vreemd: string): string {
  return [vak, toets, vreemd].map((s) => schoon(s).toLowerCase()).join('|');
}

const leeg = (c: unknown) => schoon(String(c ?? '')) === '';

/** Leest het eerste niet-lege tabblad van een Excel- of CSV-bestand. */
export function leesWerkboek(data: ArrayBuffer | Uint8Array): ImportResultaat {
  const niets = (melding: string): ImportResultaat => ({ paren: [], fouten: [{ bron: 'Bestand', melding }], taal: '' });
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  // .xlsx is een zip (PK), .xls een OLE-bestand (D0 CF). Al het andere behandelen we als tekst (CSV)
  // en lezen we als UTF-8, anders worden tekens als ä en é verminkt.
  const isBinair = (bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf);
  let wb: XLSX.WorkBook;
  try {
    wb = isBinair ? XLSX.read(bytes, { type: 'array' }) : XLSX.read(new TextDecoder('utf-8').decode(bytes), { type: 'string' });
  } catch {
    return niets('Dit bestand kan niet als Excel worden gelezen.');
  }

  const tabel = wb.SheetNames.map((n) =>
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, defval: '', blankrows: true, raw: false }),
  ).find((t) => t.some((rij) => (rij ?? []).some((c) => !leeg(c))));
  if (!tabel) return niets('Het bestand is leeg.');

  const koppen = (tabel[0] ?? []).map((c) => schoon(String(c ?? '')));
  const gevuld = koppen.map((k, i) => ({ k, i })).filter((x) => x.k);
  const nl = gevuld.filter((x) => x.k.toLowerCase() === 'nederlands');
  const vreemd = gevuld.filter((x) => x.k.toLowerCase() !== 'nederlands');
  if (nl.length !== 1 || vreemd.length !== 1) {
    return niets(
      `De eerste rij moet precies twee kolomkoppen hebben: "Nederlands" en de vreemde taal (bijv. "Frans"). Gevonden: ${
        gevuld.map((x) => `"${x.k}"`).join(', ') || 'niets'
      }.`,
    );
  }
  const iNl = nl[0].i;
  const iVreemd = vreemd[0].i;

  const paren: ImportPaar[] = [];
  const fouten: ImportFout[] = [];
  const gezien = new Map<string, string>();
  for (let r = 1; r < tabel.length; r++) {
    const rij = tabel[r] ?? [];
    if (rij.every(leeg)) continue;
    const bron = `Rij ${r + 1}`;
    const v = schoon(String(rij[iVreemd] ?? ''));
    const n = schoon(String(rij[iNl] ?? ''));
    if (!v || !n) {
      fouten.push({ bron, melding: `Kolom "${!v ? vreemd[0].k : 'Nederlands'}" is leeg. Rij overgeslagen.` });
      continue;
    }
    const sleutel = v.toLowerCase();
    const eerder = gezien.get(sleutel);
    if (eerder) {
      fouten.push({ bron, melding: `"${v}" staat dubbel (ook ${eerder}). Rij overgeslagen.` });
      continue;
    }
    gezien.set(sleutel, bron);
    paren.push({ vreemd: v, nederlands: n, bron });
  }
  if (paren.length === 0 && fouten.length === 0) fouten.push({ bron: 'Bestand', melding: 'Geen woorden gevonden onder de koprij.' });
  return { paren, fouten, taal: vreemd[0].k };
}

/** Bestaande naam met dezelfde schrijfwijze zoeken (frans = Frans), zodat vakken/toetsen niet dubbel verschijnen. */
function canoniekeNaam(naam: string, bestaand: Iterable<string>): string {
  for (const b of bestaand) if (b.toLowerCase() === naam.trim().toLowerCase()) return b;
  return naam.trim();
}

/** Koppelt ingelezen paren aan een vak en toets. */
export function naarRijen(paren: ImportPaar[], vak: string, toets: string): ImportRij[] {
  return paren.map((p) => ({ ...p, vak: vak.trim(), toets: toets.trim(), id: woordId(vak, toets, p.vreemd) }));
}

/** Aantal nieuwe en al bestaande woorden per vak/toets. */
export function vatSamen(rijen: ImportRij[], state: AppState): ToetsSamenvatting[] {
  const map = new Map<string, ToetsSamenvatting>();
  for (const r of rijen) {
    const k = `${r.vak.toLowerCase()}|${r.toets.toLowerCase()}`;
    const s = map.get(k) ?? { vak: r.vak, toets: r.toets, nieuw: 0, bestaand: 0 };
    if (state.woorden[r.id]) s.bestaand++;
    else s.nieuw++;
    map.set(k, s);
  }
  return [...map.values()];
}

/**
 * Voegt ingelezen woorden toe. Bestaande woorden (zelfde vak, toets en vreemd woord) houden hun
 * voortgang; alleen de Nederlandse vertaling wordt bijgewerkt.
 */
export function voegSamen(state: AppState, rijen: ImportRij[], vandaag: string = datumString()): AppState {
  const woorden = { ...state.woorden };
  const vakken = { ...state.vakken };
  const vakNamen = new Set([...Object.keys(vakken), ...Object.values(woorden).map((w) => w.vak)]);
  const toetsNamen = new Set(Object.values(woorden).map((w) => `${w.vak}|${w.toets}`));

  for (const r of rijen) {
    const vak = canoniekeNaam(r.vak, vakNamen);
    vakNamen.add(vak);
    const toetsSleutel = canoniekeNaam(`${vak}|${r.toets}`, toetsNamen);
    toetsNamen.add(toetsSleutel);
    const toets = toetsSleutel.slice(vak.length + 1);
    if (!vakken[vak]) vakken[vak] = standaardVakInstellingen(vak);

    const bestaand = woorden[r.id];
    if (bestaand) {
      woorden[r.id] = { ...bestaand, nederlands: r.nederlands };
    } else {
      const w: Woord = {
        id: r.id,
        vak,
        toets,
        vreemd: r.vreemd,
        nederlands: r.nederlands,
        altVreemd: [],
        altNederlands: [],
        toegevoegd: vandaag,
        voortgang: { naarNL: legeVoortgang(), naarVreemd: legeVoortgang() },
      };
      woorden[r.id] = w;
    }
  }
  return { ...state, woorden, vakken };
}
