// Pure functies die een antwoord/sessie verwerken in de complete state:
// woordvoortgang (Leitner), speler-statistieken, streak, punten (xp), dagoverzicht,
// achievements en medailles.

import { controleerAchievements, type AchievementDef } from './achievements';
import { verwerkAntwoord } from './leitner';
import { controleerMedailles, type NieuweMedaille } from './medailles';
import { datumString, legeDag } from './state';
import type { AppState, DagStatistiek, Richting, SessieVerslag, SessieVorm, Speler } from './types';
import { levelVan, puntenVoorVak, xpVoorAntwoord, type AntwoordSoort } from './xp';

/** Vanaf dit deel goed geldt een sessie als gehaald. */
export const GEHAALD_GRENS = 0.75;

export function isGehaald(goed: number, totaal: number): boolean {
  return totaal > 0 && goed / totaal >= GEHAALD_GRENS;
}

export interface AntwoordInvoer {
  woordId: string;
  richting: Richting;
  goed: boolean;
  soort: AntwoordSoort;
  herhaling?: boolean;
}

export interface Gevolg {
  state: AppState;
  xp: number;
  nieuweAchievements: AchievementDef[];
  nieuweMedailles: NieuweMedaille[];
  /** Vak en nieuw level als er in dat vak een level-up was, anders null. */
  levelUp: { vak: string; level: number } | null;
}

function werkDagBij(s: AppState, dag: string, f: (d: DagStatistiek) => DagStatistiek): AppState {
  return { ...s, dagen: { ...s.dagen, [dag]: f(s.dagen[dag] ?? legeDag()) } };
}

function gisteren(vandaag: string): string {
  const [j, m, d] = vandaag.split('-').map(Number);
  return datumString(new Date(j, m - 1, d - 1));
}

/** Dagelijkse streak bijwerken bij het eerste antwoord van de dag. */
export function werkStreakBij(speler: Speler, vandaag: string): Speler {
  if (speler.laatsteOefendag === vandaag) return speler;
  const streakDagen = speler.laatsteOefendag === gisteren(vandaag) ? speler.streakDagen + 1 : 1;
  return { ...speler, streakDagen, laatsteOefendag: vandaag };
}

function afronden(voor: AppState, na: AppState, xp: number, nu: string, vak?: string): Gevolg {
  const a = controleerAchievements(na, nu);
  const m = controleerMedailles(a.state, nu);
  let levelUp: Gevolg['levelUp'] = null;
  if (vak) {
    const levelNa = levelVan(puntenVoorVak(m.state.speler, vak));
    if (levelNa > levelVan(puntenVoorVak(voor.speler, vak))) levelUp = { vak, level: levelNa };
  }
  return { state: m.state, xp, nieuweAchievements: a.nieuw, nieuweMedailles: m.nieuw, levelUp };
}

export function registreerAntwoord(s: AppState, a: AntwoordInvoer, nu: Date = new Date()): Gevolg {
  const woord = s.woorden[a.woordId];
  if (!woord) return { state: s, xp: 0, nieuweAchievements: [], nieuweMedailles: [], levelUp: null };
  const iso = nu.toISOString();
  const vorig = woord.voortgang[a.richting];
  const nieuwV = verwerkAntwoord(vorig, a.goed, iso, a.herhaling);

  let sp = werkStreakBij(s.speler, datumString(nu));
  const huidigeReeks = a.goed ? sp.huidigeReeks + 1 : 0;
  const typReeks = a.soort === 'typen' ? (a.goed ? sp.typReeks + 1 : 0) : sp.typReeks;
  const xp = xpVoorAntwoord(a.soort, a.goed, huidigeReeks);
  // Doorzetter: woord met minstens 5 fouten dat nu voor het eerst 3 keer op rij goed ging.
  const doorzetter = a.goed && nieuwV.fout >= 5 && nieuwV.reeks === 3;
  sp = {
    ...sp,
    puntenPerVak: { ...sp.puntenPerVak, [woord.vak]: puntenVoorVak(sp, woord.vak) + xp },
    huidigeReeks,
    langsteReeks: Math.max(sp.langsteReeks, huidigeReeks),
    typReeks,
    langsteTypReeks: Math.max(sp.langsteTypReeks, typReeks),
    totaalGoed: sp.totaalGoed + (a.goed ? 1 : 0),
    totaalFout: sp.totaalFout + (a.goed ? 0 : 1),
    doorzetters: sp.doorzetters + (doorzetter ? 1 : 0),
  };

  let na: AppState = {
    ...s,
    speler: sp,
    woorden: {
      ...s.woorden,
      [woord.id]: { ...woord, voortgang: { ...woord.voortgang, [a.richting]: nieuwV } },
    },
  };
  na = werkDagBij(na, datumString(nu), (d) => {
    const v = d.perVak[woord.vak] ?? { antwoorden: 0, goed: 0, punten: 0 };
    return {
      ...d,
      antwoorden: d.antwoorden + 1,
      goed: d.goed + (a.goed ? 1 : 0),
      punten: d.punten + xp,
      perVak: {
        ...d.perVak,
        [woord.vak]: { antwoorden: v.antwoorden + 1, goed: v.goed + (a.goed ? 1 : 0), punten: v.punten + xp },
      },
    };
  });
  return afronden(s, na, xp, iso, woord.vak);
}

/** Wat er in een sessie gebeurd is, voor het dagoverzicht en de records. */
export interface SessieUitslag {
  titel: string;
  vak?: string;
  vorm: SessieVorm;
  goed: number;
  totaal: number;
  punten: number;
  seconden: number;
}

export interface SessieAfsluiting {
  tijdraceScore?: number;
  cijfer?: number;
  perfecteKoppels?: number;
  uitslag?: SessieUitslag;
}

/** Aan het eind van een sessie: sessieteller, records en dagoverzicht bijwerken. */
export function sluitSessie(s: AppState, info: SessieAfsluiting = {}, nu: Date = new Date()): Gevolg {
  const sp = s.speler;
  const u = info.uitslag;
  const gehaald = !!u && isGehaald(u.goed, u.totaal);
  let na: AppState = {
    ...s,
    speler: {
      ...sp,
      sessies: sp.sessies + 1,
      besteTijdrace: Math.max(sp.besteTijdrace, info.tijdraceScore ?? 0),
      besteCijfer: Math.max(sp.besteCijfer, info.cijfer ?? 0),
      perfecteKoppels: sp.perfecteKoppels + (info.perfecteKoppels ?? 0),
      besteSessieGoed: Math.max(sp.besteSessieGoed, u?.goed ?? 0),
      sessiesGehaald: sp.sessiesGehaald + (gehaald ? 1 : 0),
    },
  };
  if (u) {
    // Tijd per sessie begrenzen, zodat een vergeten open venster de dag niet opblaast.
    const seconden = Math.max(0, Math.min(Math.round(u.seconden), 60 * 60));
    na = werkDagBij(na, datumString(nu), (d) => ({
      ...d,
      seconden: d.seconden + seconden,
      sessies: [...d.sessies, { ...u, seconden, tijd: nu.toISOString(), gehaald, ...(info.cijfer !== undefined ? { cijfer: info.cijfer } : {}) }],
    }));
  }
  return afronden(s, na, 0, nu.toISOString());
}

export interface VakTotaal {
  vak: string;
  antwoorden: number;
  goed: number;
  punten: number;
  sessies: number;
  gehaald: number;
}

/** Vak van een sessie; oudere verslagen zonder vak-veld: het deel van de titel vóór " · ". */
export function sessieVak(x: SessieVerslag): string {
  return x.vak ?? x.titel.split(' · ')[0] ?? '';
}

/** Totalen per vak over de gegeven dagen (standaard: alle dagen). Hoogste punten eerst. */
export function totalenPerVak(s: AppState, dagen: string[] = Object.keys(s.dagen)): VakTotaal[] {
  const map = new Map<string, VakTotaal>();
  const van = (vak: string) => {
    const t = map.get(vak) ?? { vak, antwoorden: 0, goed: 0, punten: 0, sessies: 0, gehaald: 0 };
    map.set(vak, t);
    return t;
  };
  for (const dag of dagen) {
    const d = s.dagen[dag];
    if (!d) continue;
    for (const [vak, v] of Object.entries(d.perVak)) {
      const t = van(vak);
      t.antwoorden += v.antwoorden;
      t.goed += v.goed;
      t.punten += v.punten;
    }
    for (const x of d.sessies) {
      const vak = sessieVak(x);
      if (!vak) continue;
      const t = van(vak);
      t.sessies++;
      if (x.gehaald) t.gehaald++;
    }
  }
  return [...map.values()].sort((a, b) => b.punten - a.punten || a.vak.localeCompare(b.vak));
}

/** Maandag (lokale datum) van de week waarin `d` valt, verschoven met `weken` weken. */
export function maandagVan(d: Date, weken = 0): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7) + weken * 7);
  return m;
}

/** De zeven datums (ma t/m zo) van een week, als JJJJ-MM-DD. */
export function weekDagen(maandag: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => datumString(new Date(maandag.getFullYear(), maandag.getMonth(), maandag.getDate() + i)));
}

/** ISO-weeknummer. */
export function weekNummer(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const jaarStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - jaarStart.getTime()) / 864e5 + 1) / 7);
}

/** Cijfer 1–10 (één decimaal) voor een proeftoets. */
export function berekenCijfer(goed: number, totaal: number): number {
  if (totaal === 0) return 1;
  return Math.round((1 + (9 * goed) / totaal) * 10) / 10;
}
