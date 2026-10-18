import { sessieVak } from './engine';
import { schoon } from './grading';
import { woordId } from './importExcel';
import type { AppState, DagStatistiek, VakTelling, Woord } from './types';

/** Controleert een nieuwe vaknaam; geeft een foutmelding terug of null als de naam goed is. */
export function controleerVaknaam(state: AppState, oud: string, nieuw: string): string | null {
  const naam = schoon(nieuw);
  if (!naam) return 'Vul een naam in.';
  if (naam.includes('|')) return 'Het teken | mag niet in een vaknaam.';
  if (naam.length > 40) return 'Maximaal 40 tekens.';
  const bestaand = new Set([...Object.keys(state.vakken), ...Object.values(state.woorden).map((w) => w.vak)]);
  for (const v of bestaand) {
    if (v !== oud && v.toLowerCase() === naam.toLowerCase()) return `Er is al een vak "${v}".`;
  }
  return null;
}

/**
 * Hernoemt een vak overal: de woorden (inclusief hun id, zodat opnieuw inladen onder de nieuwe
 * naam de voortgang terugvindt), de vak-instellingen, de punten en het dagoverzicht. Voortgang blijft behouden.
 * Gooit een fout als de nieuwe naam ongeldig is of al bij een ander vak hoort.
 */
export function hernoemVak(state: AppState, oud: string, nieuwRuw: string): AppState {
  const fout = controleerVaknaam(state, oud, nieuwRuw);
  if (fout) throw new Error(fout);
  const nieuw = schoon(nieuwRuw);
  if (nieuw === oud) return state;

  const woorden: Record<string, Woord> = {};
  for (const w of Object.values(state.woorden)) {
    if (w.vak !== oud) {
      woorden[w.id] = w;
      continue;
    }
    const id = woordId(nieuw, w.toets, w.vreemd);
    woorden[id] = { ...w, id, vak: nieuw };
  }

  const vakken = Object.fromEntries(Object.entries(state.vakken).map(([naam, v]) => [naam === oud ? nieuw : naam, v]));

  const prefixOud = `${oud} · `;
  const dagen: Record<string, DagStatistiek> = {};
  for (const [dag, d] of Object.entries(state.dagen)) {
    const perVak: Record<string, VakTelling> = {};
    for (const [v, t] of Object.entries(d.perVak)) perVak[v === oud ? nieuw : v] = t;
    const sessies = d.sessies.map((x) => {
      const hoortBijVak = x.vak === oud || (!x.vak && x.titel.startsWith(prefixOud));
      if (!hoortBijVak) return x;
      const titel = x.titel.startsWith(prefixOud) ? `${nieuw} · ${x.titel.slice(prefixOud.length)}` : x.titel;
      return { ...x, vak: nieuw, titel };
    });
    dagen[dag] = { ...d, perVak, sessies };
  }

  const puntenPerVak = Object.fromEntries(Object.entries(state.speler.puntenPerVak).map(([naam, p]) => [naam === oud ? nieuw : naam, p]));

  return { ...state, woorden, vakken, dagen, speler: { ...state.speler, puntenPerVak } };
}

/**
 * Verwijdert een vak helemaal: alle woorden (met hun voortgang), de vak-instellingen, de punten
 * van dat vak en het vak uit het dagoverzicht. De dagtotalen worden daarop aangepast; dagen
 * waarop alleen dit vak geoefend is verdwijnen. Medailles en achievements blijven staan.
 */
export function verwijderVak(state: AppState, vak: string): AppState {
  const woorden = Object.fromEntries(Object.entries(state.woorden).filter(([, w]) => w.vak !== vak));
  const vakken = Object.fromEntries(Object.entries(state.vakken).filter(([naam]) => naam !== vak));
  const puntenPerVak = Object.fromEntries(Object.entries(state.speler.puntenPerVak).filter(([naam]) => naam !== vak));

  const dagen: Record<string, DagStatistiek> = {};
  for (const [dag, d] of Object.entries(state.dagen)) {
    const t = d.perVak[vak];
    const weg = d.sessies.filter((x) => sessieVak(x) === vak);
    if (!t && weg.length === 0) {
      dagen[dag] = d;
      continue;
    }
    const perVak = Object.fromEntries(Object.entries(d.perVak).filter(([v]) => v !== vak));
    const sessies = d.sessies.filter((x) => sessieVak(x) !== vak);
    const nieuw: DagStatistiek = {
      ...d,
      antwoorden: Math.max(0, d.antwoorden - (t?.antwoorden ?? 0)),
      goed: Math.max(0, d.goed - (t?.goed ?? 0)),
      punten: Math.max(0, d.punten - (t?.punten ?? 0)),
      seconden: Math.max(0, d.seconden - weg.reduce((s, x) => s + x.seconden, 0)),
      sessies,
      perVak,
    };
    if (nieuw.antwoorden > 0 || sessies.length > 0) dagen[dag] = nieuw;
  }

  return { ...state, woorden, vakken, dagen, speler: { ...state.speler, puntenPerVak } };
}
