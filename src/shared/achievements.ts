import { isBeheerst } from './leitner';
import type { AppState } from './types';
import { hoogstePunten, levelVan } from './xp';

export interface AchievementDef {
  id: string;
  titel: string;
  beschrijving: string;
  icoon: string;
  behaald: (s: AppState) => boolean;
}

/** Hoogste aantal woorden in één toets dat volledig beheerst wordt (minimaal 5 woorden per toets). */
function heeftBeheersteToets(s: AppState): boolean {
  const perToets = new Map<string, { totaal: number; beheerst: number }>();
  for (const w of Object.values(s.woorden)) {
    const k = `${w.vak}|${w.toets}`;
    const t = perToets.get(k) ?? { totaal: 0, beheerst: 0 };
    t.totaal++;
    if (isBeheerst(w)) t.beheerst++;
    perToets.set(k, t);
  }
  return [...perToets.values()].some((t) => t.totaal >= 5 && t.beheerst === t.totaal);
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'eerste-sessie', titel: 'Eerste stap', beschrijving: 'Rond je eerste oefensessie af', icoon: '🚀', behaald: (s) => s.speler.sessies >= 1 },
  { id: 'eerste-gehaald', titel: 'Gehaald!', beschrijving: 'Haal voor het eerst 75% of meer in een sessie', icoon: '✅', behaald: (s) => s.speler.sessiesGehaald >= 1 },
  { id: 'gehaald-10', titel: 'Op koers', beschrijving: 'Haal 10 sessies met 75% of meer', icoon: '🎖️', behaald: (s) => s.speler.sessiesGehaald >= 10 },
  { id: 'gehaald-50', titel: 'Topper', beschrijving: 'Haal 50 sessies met 75% of meer', icoon: '👑', behaald: (s) => s.speler.sessiesGehaald >= 50 },
  { id: 'typen-100', titel: 'Spellingkampioen', beschrijving: '100 woorden getypt zonder fout', icoon: '⌨️', behaald: (s) => s.speler.langsteTypReeks >= 100 },
  { id: 'toets-beheerst', titel: 'Toetsklaar', beschrijving: 'Beheers alle woorden van een toets (min. 5 woorden)', icoon: '🎯', behaald: heeftBeheersteToets },
  { id: 'doorzetter', titel: 'Doorzetter', beschrijving: 'Een woord dat 5 keer fout ging eindelijk 3 keer goed op rij', icoon: '💪', behaald: (s) => s.speler.doorzetters >= 1 },
  { id: 'koppel-perfect', titel: 'Perfecte match', beschrijving: 'Een koppelronde zonder fout', icoon: '🧩', behaald: (s) => s.speler.perfecteKoppels >= 1 },
  { id: 'proeftoets-8', titel: 'Voldoende+', beschrijving: 'Haal een 8 of hoger bij een proeftoets', icoon: '📝', behaald: (s) => s.speler.besteCijfer >= 8 },
  { id: 'proeftoets-10', titel: 'Foutloos', beschrijving: 'Haal een 10 bij een proeftoets', icoon: '🏆', behaald: (s) => s.speler.besteCijfer >= 10 },
  { id: 'level-5', titel: 'Level 5', beschrijving: 'Bereik level 5 in een vak', icoon: '⭐', behaald: (s) => levelVan(hoogstePunten(s.speler)) >= 5 },
  { id: 'level-10', titel: 'Level 10', beschrijving: 'Bereik level 10 in een vak', icoon: '🌟', behaald: (s) => levelVan(hoogstePunten(s.speler)) >= 10 },
  { id: 'level-20', titel: 'Level 20', beschrijving: 'Bereik level 20 in een vak', icoon: '🌠', behaald: (s) => levelVan(hoogstePunten(s.speler)) >= 20 },
];

/** Zet nieuw behaalde achievements in de state en geeft de nieuwe terug. */
export function controleerAchievements(s: AppState, nu: string): { state: AppState; nieuw: AchievementDef[] } {
  const nieuw = ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.behaald(s));
  if (nieuw.length === 0) return { state: s, nieuw };
  const achievements = { ...s.achievements };
  for (const a of nieuw) achievements[a.id] = nu;
  return { state: { ...s, achievements }, nieuw };
}
