import {
  HUIDIGE_VERSIE,
  type AppState,
  type DagStatistiek,
  type RichtingVoortgang,
  type Speler,
  type VakInstellingen,
  type VakTelling,
  type Woord,
} from './types';

export function legeSpeler(): Speler {
  return {
    puntenPerVak: {},
    streakDagen: 0,
    laatsteOefendag: null,
    huidigeReeks: 0,
    langsteReeks: 0,
    typReeks: 0,
    langsteTypReeks: 0,
    totaalGoed: 0,
    totaalFout: 0,
    sessies: 0,
    besteTijdrace: 0,
    besteCijfer: 0,
    doorzetters: 0,
    perfecteKoppels: 0,
    besteSessieGoed: 0,
    sessiesGehaald: 0,
  };
}

export function legeState(): AppState {
  return {
    versie: HUIDIGE_VERSIE,
    woorden: {},
    vakken: {},
    speler: legeSpeler(),
    achievements: {},
    medailles: {},
    dagen: {},
    instellingen: { sessieGrootte: 20, naam: '' },
  };
}

export function legeDag(): DagStatistiek {
  return { antwoorden: 0, goed: 0, punten: 0, seconden: 0, sessies: [], perVak: {} };
}

/**
 * Zet alle voortgang op nul: punten en levels van alle vakken, medailles, achievements, dagoverzicht, streak en de
 * bakjes per woord. Woordenlijsten, vak-instellingen en de naam blijven bewaard.
 */
export function resetVoortgang(state: AppState): AppState {
  const woorden = Object.fromEntries(
    Object.entries(state.woorden).map(([id, w]) => [id, { ...w, voortgang: { naarNL: legeVoortgang(), naarVreemd: legeVoortgang() } }]),
  );
  return { ...state, woorden, speler: legeSpeler(), achievements: {}, medailles: {}, dagen: {} };
}

export function legeVoortgang(): RichtingVoortgang {
  return { goed: 0, fout: 0, reeks: 0, bakje: 1, laatst: null };
}

/** Lokale datum als JJJJ-MM-DD. */
export function datumString(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const BEKENDE_VAKKEN: Record<string, Omit<VakInstellingen, 'accenten'>> = {
  frans: {
    taal: 'fr',
    hoofdlettersBelangrijk: false,
    tekens: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'œ'],
  },
  duits: { taal: 'de', hoofdlettersBelangrijk: true, tekens: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'] },
  engels: { taal: 'en', hoofdlettersBelangrijk: false, tekens: [] },
  spaans: {
    taal: 'es',
    hoofdlettersBelangrijk: false,
    tekens: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'],
  },
  italiaans: { taal: 'it', hoofdlettersBelangrijk: false, tekens: ['à', 'è', 'é', 'ì', 'ò', 'ù'] },
};

export function standaardVakInstellingen(vak: string): VakInstellingen {
  const bekend = BEKENDE_VAKKEN[vak.trim().toLowerCase()];
  return {
    taal: bekend?.taal ?? '',
    hoofdlettersBelangrijk: bekend?.hoofdlettersBelangrijk ?? false,
    accenten: 'soepel',
    tekens: bekend ? [...bekend.tekens] : ['é', 'è', 'ê', 'ë', 'à', 'ç', 'ô', 'ù', 'û', 'ü', 'ö', 'ä', 'ß', 'œ'],
  };
}

/** Verwijdert alle woorden (en hun voortgang) van één toets. Vak-instellingen blijven bewaard. */
export function verwijderToets(state: AppState, vak: string, toets: string): AppState {
  const woorden = Object.fromEntries(Object.entries(state.woorden).filter(([, w]) => !(w.vak === vak && w.toets === toets)));
  return { ...state, woorden };
}

/** Stappen om een ouder formaat naar het volgende op te hogen: MIGRATIES[n] zet versie n om naar n+1. */
const MIGRATIES: Record<number, (s: any) => any> = {
  // Versie 2: medailles, dagoverzicht en spelersnaam erbij. Bestaande voortgang blijft ongewijzigd.
  1: (s) => ({ ...s, medailles: {}, dagen: {}, versie: 2 }),
  // Versie 3: punten per vak in plaats van één totaal (speler.xp → speler.puntenPerVak).
  2: (s) => {
    const { xp, ...speler } = isObject(s.speler) ? s.speler : ({} as Record<string, any>);
    return { ...s, speler: { ...speler, puntenPerVak: puntenPerVakUitXp(s, Number(xp) || 0) }, versie: 3 };
  },
};

/**
 * Verdeelt het oude puntentotaal over de vakken volgens het dagoverzicht. Punten van vóór het
 * dagoverzicht (het verschil met het totaal) gaan naar het vak met de meeste punten, of bij geen
 * historie naar het vak met de meeste woorden.
 */
function puntenPerVakUitXp(s: any, xp: number): Record<string, number> {
  const uit: Record<string, number> = {};
  for (const d of Object.values(isObject(s.dagen) ? s.dagen : {})) {
    if (!isObject(d)) continue;
    const perVak = isObject(d.perVak) ? d.perVak : perVakUitSessies(Array.isArray(d.sessies) ? d.sessies : []);
    for (const [vak, t] of Object.entries(perVak)) uit[vak] = (uit[vak] ?? 0) + (Number((t as any)?.punten) || 0);
  }
  const rest = xp - Object.values(uit).reduce((a, b) => a + b, 0);
  if (rest > 0) {
    let vak = Object.entries(uit).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!vak) {
      const woorden: Record<string, number> = {};
      for (const w of Object.values(isObject(s.woorden) ? s.woorden : {})) {
        if (isObject(w) && typeof w.vak === 'string') woorden[w.vak] = (woorden[w.vak] ?? 0) + 1;
      }
      vak = Object.entries(woorden).sort((a, b) => b[1] - a[1])[0]?.[0];
    }
    if (vak) uit[vak] = (uit[vak] ?? 0) + rest;
  }
  return uit;
}

/**
 * Voor dagen van vóór de telling per vak: afleiden uit de sessieverslagen van die dag
 * (vak = deel van de titel vóór " · "). Antwoorden buiten een afgeronde sessie tellen dan niet mee.
 */
function perVakUitSessies(sessies: any[]): Record<string, VakTelling> {
  const uit: Record<string, VakTelling> = {};
  for (const x of sessies) {
    const vak = x?.vak ?? String(x?.titel ?? '').split(' · ')[0];
    if (!vak) continue;
    const t = (uit[vak] ??= { antwoorden: 0, goed: 0, punten: 0 });
    t.antwoorden += Number(x.totaal) || 0;
    t.goed += Number(x.goed) || 0;
    t.punten += Number(x.punten) || 0;
  }
  return uit;
}

function isObject(x: unknown): x is Record<string, any> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Zet ingelezen JSON om naar een geldige AppState van de huidige versie.
 * Ontbrekende velden krijgen een standaardwaarde; onbekende velden blijven bewaard.
 */
export function migreer(raw: unknown): AppState {
  if (!isObject(raw)) throw new Error('Voortgangsbestand bevat geen geldig object');
  let s: any = { ...raw };
  let versie = typeof s.versie === 'number' ? s.versie : 1;
  if (versie > HUIDIGE_VERSIE) {
    throw new Error(
      `Voortgangsbestand heeft versie ${versie}, deze app kent maximaal versie ${HUIDIGE_VERSIE}. Werk de app bij.`,
    );
  }
  while (versie < HUIDIGE_VERSIE) {
    const stap = MIGRATIES[versie];
    if (!stap) throw new Error(`Geen migratie van versie ${versie}`);
    s = stap(s);
    versie++;
  }

  const leeg = legeState();
  const woorden: Record<string, Woord> = {};
  for (const [id, w] of Object.entries(isObject(s.woorden) ? s.woorden : {})) {
    if (!isObject(w)) continue;
    woorden[id] = {
      ...w,
      id,
      altVreemd: Array.isArray(w.altVreemd) ? w.altVreemd : [],
      altNederlands: Array.isArray(w.altNederlands) ? w.altNederlands : [],
      voortgang: {
        naarNL: { ...legeVoortgang(), ...(w.voortgang?.naarNL ?? {}) },
        naarVreemd: { ...legeVoortgang(), ...(w.voortgang?.naarVreemd ?? {}) },
      },
    } as Woord;
  }
  const vakken: Record<string, VakInstellingen> = {};
  for (const [naam, v] of Object.entries(isObject(s.vakken) ? s.vakken : {})) {
    vakken[naam] = { ...standaardVakInstellingen(naam), ...(isObject(v) ? v : {}) };
  }

  return {
    ...s,
    versie: HUIDIGE_VERSIE,
    woorden,
    vakken,
    speler: {
      ...leeg.speler,
      ...(isObject(s.speler) ? s.speler : {}),
      puntenPerVak: isObject(s.speler?.puntenPerVak) ? s.speler.puntenPerVak : {},
    },
    achievements: isObject(s.achievements) ? s.achievements : {},
    medailles: isObject(s.medailles) ? s.medailles : {},
    dagen: Object.fromEntries(
      Object.entries(isObject(s.dagen) ? s.dagen : {})
        .filter(([, d]) => isObject(d))
        .map(([dag, d]: [string, any]) => {
          const sessies = Array.isArray(d.sessies) ? d.sessies : [];
          return [dag, { ...legeDag(), ...d, sessies, perVak: isObject(d.perVak) ? d.perVak : perVakUitSessies(sessies) }];
        }),
    ),
    instellingen: { ...leeg.instellingen, ...(isObject(s.instellingen) ? s.instellingen : {}) },
  };
}
