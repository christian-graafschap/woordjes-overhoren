// Medailles: per categorie vier niveaus. Een medaille wordt gewonnen zodra de waarde
// (bijv. het totaal aantal goede antwoorden) de grens van dat niveau haalt.

import type { AppState, MedailleNiveau } from './types';
import { hoogstePunten } from './xp';

export const NIVEAUS: MedailleNiveau[] = ['brons', 'zilver', 'goud', 'platina'];

export const NIVEAU_INFO: Record<MedailleNiveau, { naam: string; icoon: string; kleur: string }> = {
  brons: { naam: 'Brons', icoon: '🥉', kleur: 'from-orange-700/40 ring-orange-600/60' },
  zilver: { naam: 'Zilver', icoon: '🥈', kleur: 'from-slate-300/30 ring-slate-300/60' },
  goud: { naam: 'Goud', icoon: '🥇', kleur: 'from-amber-400/35 ring-amber-300/70' },
  platina: { naam: 'Platina', icoon: '💎', kleur: 'from-cyan-300/30 ring-cyan-200/70' },
};

export interface MedailleDef {
  id: string;
  titel: string;
  /** Korte uitleg, bijv. "Goede antwoorden, alle sessies samen". */
  uitleg: string;
  /** Eenheid achter het getal, bijv. "goed". */
  eenheid: string;
  waarde: (s: AppState) => number;
  /** Grens voor brons, zilver, goud en platina. */
  grenzen: [number, number, number, number];
}

export const MEDAILLES: MedailleDef[] = [
  {
    id: 'totaal-goed',
    titel: 'Woordenverzamelaar',
    uitleg: 'Goede antwoorden, alle sessies bij elkaar opgeteld',
    eenheid: 'goed',
    waarde: (s) => s.speler.totaalGoed,
    grenzen: [100, 500, 1500, 5000],
  },
  {
    id: 'punten',
    titel: 'Puntenjager',
    uitleg: 'Punten in je beste vak',
    eenheid: 'punten',
    waarde: (s) => hoogstePunten(s.speler),
    grenzen: [1000, 5000, 15000, 50000],
  },
  {
    id: 'sessierecord',
    titel: 'Sessierecord',
    uitleg: 'Meeste goede antwoorden in één sessie',
    eenheid: 'goed',
    waarde: (s) => s.speler.besteSessieGoed,
    grenzen: [15, 25, 40, 60],
  },
  {
    id: 'reeks',
    titel: 'Reeks',
    uitleg: 'Langste reeks goed op rij',
    eenheid: 'op rij',
    waarde: (s) => s.speler.langsteReeks,
    grenzen: [10, 25, 50, 100],
  },
  {
    id: 'streak',
    titel: 'Volhouder',
    uitleg: 'Dagen achter elkaar geoefend',
    eenheid: 'dagen',
    waarde: (s) => s.speler.streakDagen,
    grenzen: [3, 7, 14, 30],
  },
  {
    id: 'oefendagen',
    titel: 'Trouwe oefenaar',
    uitleg: 'Aantal dagen waarop je hebt geoefend',
    eenheid: 'dagen',
    waarde: (s) => Object.values(s.dagen).filter((d) => d.antwoorden > 0).length,
    grenzen: [5, 20, 50, 100],
  },
  {
    id: 'tijdrace',
    titel: 'Snelheidsduivel',
    uitleg: 'Record in de tijdrace (goed in 60 seconden)',
    eenheid: 'goed',
    waarde: (s) => s.speler.besteTijdrace,
    grenzen: [10, 15, 20, 30],
  },
];

/** Hoogste behaalde niveau op basis van de waarde, of null. */
export function niveauVoor(def: MedailleDef, waarde: number): MedailleNiveau | null {
  let beste: MedailleNiveau | null = null;
  NIVEAUS.forEach((n, i) => {
    if (waarde >= def.grenzen[i]) beste = n;
  });
  return beste;
}

/** Volgend niveau en de grens ervan, of null als platina al gehaald is. */
export function volgendNiveau(def: MedailleDef, waarde: number): { niveau: MedailleNiveau; grens: number } | null {
  const i = NIVEAUS.findIndex((_, k) => waarde < def.grenzen[k]);
  return i === -1 ? null : { niveau: NIVEAUS[i], grens: def.grenzen[i] };
}

export interface NieuweMedaille {
  def: MedailleDef;
  niveau: MedailleNiveau;
}

/** Zet nieuw gewonnen medailles (alle niveaus tot en met het huidige) in de state. */
export function controleerMedailles(s: AppState, nu: string): { state: AppState; nieuw: NieuweMedaille[] } {
  const nieuw: NieuweMedaille[] = [];
  let medailles = s.medailles;
  for (const def of MEDAILLES) {
    const waarde = def.waarde(s);
    const behaald = { ...(medailles[def.id] ?? {}) };
    let gewijzigd = false;
    NIVEAUS.forEach((n, i) => {
      if (waarde >= def.grenzen[i] && !behaald[n]) {
        behaald[n] = nu;
        gewijzigd = true;
        nieuw.push({ def, niveau: n });
      }
    });
    if (gewijzigd) medailles = { ...medailles, [def.id]: behaald };
  }
  // Alleen het hoogste nieuwe niveau per medaille melden.
  const hoogste = nieuw.filter((m, i) => !nieuw.slice(i + 1).some((x) => x.def.id === m.def.id));
  return { state: medailles === s.medailles ? s : { ...s, medailles }, nieuw: hoogste };
}
