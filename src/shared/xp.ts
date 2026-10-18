import type { Speler, Spelvorm } from './types';

/** Soort antwoord, bepaalt de basis-XP. Tijdrace telt als meerkeuze of typen. */
export type AntwoordSoort = Exclude<Spelvorm, 'tijdrace'>;

export const BASIS_XP: Record<AntwoordSoort, number> = {
  flashcards: 5,
  meerkeuze: 10,
  koppel: 10,
  typen: 20,
};

/** Bonus bij elke 5 goed op rij: +5 bij 5, +10 bij 10, ... tot maximaal +25. */
export function reeksBonus(reeks: number): number {
  if (reeks <= 0 || reeks % 5 !== 0) return 0;
  return Math.min(25, reeks);
}

export function xpVoorAntwoord(soort: AntwoordSoort, goed: boolean, reeksNa: number): number {
  if (!goed) return 0;
  return BASIS_XP[soort] + reeksBonus(reeksNa);
}

/** Extra punten per level: level 2 kost 100, level 3 daarna 200, level 4 daarna 300, enz. */
export const LEVEL_STAP = 100;

/**
 * Totaal aantal punten dat nodig is om level n te bereiken (level 1 = 0).
 * Elk volgend level kost LEVEL_STAP punten meer dan het vorige, dus omhoog gaan wordt steeds lastiger.
 */
export function xpGrens(level: number): number {
  return (LEVEL_STAP * (level - 1) * level) / 2;
}

export function levelVan(xp: number): number {
  let level = 1;
  while (xpGrens(level + 1) <= xp) level++;
  return level;
}

export interface LevelInfo {
  level: number;
  /** XP binnen het huidige level. */
  binnenLevel: number;
  /** XP die het huidige level breed is. */
  breedte: number;
  /** 0..1 */
  fractie: number;
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelVan(xp);
  const onder = xpGrens(level);
  const boven = xpGrens(level + 1);
  return {
    level,
    binnenLevel: xp - onder,
    breedte: boven - onder,
    fractie: (xp - onder) / (boven - onder),
  };
}

export function levelTitel(level: number): string {
  const titels = [
    'Beginner',
    'Leerling',
    'Woordjager',
    'Taalridder',
    'Vocabulaire-pro',
    'Polyglot',
    'Taalmeester',
    'Woordenwizard',
    'Legende',
  ];
  return titels[Math.min(titels.length - 1, Math.floor((level - 1) / 3))];
}

export function puntenVoorVak(speler: Speler, vak: string): number {
  return speler.puntenPerVak[vak] ?? 0;
}

/** Punten van het vak waarin de speler het verst is (voor medailles en level-achievements). */
export function hoogstePunten(speler: Speler): number {
  return Math.max(0, ...Object.values(speler.puntenPerVak));
}
