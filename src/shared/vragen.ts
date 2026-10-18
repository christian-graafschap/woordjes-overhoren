import type { Richting, Woord } from './types';

export function vraagTekst(w: Woord, r: Richting): string {
  return r === 'naarNL' ? w.vreemd : w.nederlands;
}

export function antwoordTekst(w: Woord, r: Richting): string {
  return r === 'naarNL' ? w.nederlands : w.vreemd;
}

export function alternatieven(w: Woord, r: Richting): string[] {
  return r === 'naarNL' ? w.altNederlands : w.altVreemd;
}

export function schud<T>(lijst: T[], rng: () => number = Math.random): T[] {
  const a = [...lijst];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Vier antwoordopties: het juiste antwoord plus afleiders, eerst uit `pool` (dezelfde toets(en)),
 * aangevuld uit `reserve` (hetzelfde vak) als dat nodig is.
 */
export function maakOpties(w: Woord, r: Richting, pool: Woord[], reserve: Woord[], aantal = 4, rng = Math.random): string[] {
  const juist = antwoordTekst(w, r);
  const verboden = new Set([juist, ...alternatieven(w, r)].map((s) => s.toLowerCase()));
  const afleiders: string[] = [];
  for (const bron of [pool, reserve]) {
    for (const ander of schud(bron, rng)) {
      if (afleiders.length >= aantal - 1) break;
      const t = antwoordTekst(ander, r);
      if (verboden.has(t.toLowerCase())) continue;
      verboden.add(t.toLowerCase());
      afleiders.push(t);
    }
  }
  return schud([juist, ...afleiders], rng);
}
