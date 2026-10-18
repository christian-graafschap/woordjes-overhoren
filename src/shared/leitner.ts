import type { Richting, RichtingKeuze, RichtingVoortgang, Woord } from './types';

export const MAX_BAKJE = 5;
/** Vanaf dit bakje (in beide richtingen) geldt een woord als beheerst. */
export const BEHEERST_BAKJE = 4;

export type Rng = () => number;

/** Een vraag in een sessie: welk woord, in welke richting. */
export interface Vraag {
  woordId: string;
  richting: Richting;
  /** true als dit een herhaling is van een eerder fout beantwoorde vraag in dezelfde sessie. */
  herhaling: boolean;
}

/**
 * Past de voortgang aan na een antwoord (Leitner): goed → bakje omhoog, fout → terug naar bakje 1.
 * Bij een herhaling in dezelfde sessie gaat het bakje niet omhoog: het woord moet eerst een
 * volgende sessie weer goed gaan.
 */
export function verwerkAntwoord(
  v: RichtingVoortgang,
  goed: boolean,
  nu: string,
  herhaling = false,
): RichtingVoortgang {
  if (goed) {
    return {
      ...v,
      goed: v.goed + 1,
      reeks: v.reeks + 1,
      bakje: herhaling ? v.bakje : Math.min(MAX_BAKJE, v.bakje + 1),
      laatst: nu,
    };
  }
  return { ...v, fout: v.fout + 1, reeks: 0, bakje: 1, laatst: nu };
}

/** Hoe vaak een woord terug moet komen: lage bakjes en veel fouten wegen zwaarder. */
export function gewicht(v: RichtingVoortgang): number {
  const pogingen = v.goed + v.fout;
  const foutratio = pogingen === 0 ? 0 : v.fout / pogingen;
  const bakje = pogingen === 0 ? 1 : v.bakje;
  return (MAX_BAKJE + 1 - bakje) ** 2 * (1 + foutratio);
}

export function isBeheerst(w: Woord): boolean {
  return w.voortgang.naarNL.bakje >= BEHEERST_BAKJE && w.voortgang.naarVreemd.bakje >= BEHEERST_BAKJE;
}

export function kiesRichting(keuze: RichtingKeuze, rng: Rng): Richting {
  if (keuze !== 'gemengd') return keuze;
  return rng() < 0.5 ? 'naarNL' : 'naarVreemd';
}

/** Gewogen trekking zonder teruglegging. */
export function gewogenSteekproef<T>(items: T[], gewichtVan: (t: T) => number, n: number, rng: Rng): T[] {
  const pool = items.map((item) => ({ item, g: Math.max(gewichtVan(item), 0.0001) }));
  const gekozen: T[] = [];
  while (gekozen.length < n && pool.length > 0) {
    const totaal = pool.reduce((s, p) => s + p.g, 0);
    let r = rng() * totaal;
    let idx = 0;
    while (idx < pool.length - 1 && r >= pool[idx].g) {
      r -= pool[idx].g;
      idx++;
    }
    gekozen.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return gekozen;
}

/**
 * Stelt een sessie samen: maximaal `aantal` woorden, gewogen gekozen zodat lastige woorden
 * vaker voorkomen. De volgorde is ook gewogen, dus de lastigste woorden komen meestal eerst.
 */
export function maakSessie(woorden: Woord[], keuze: RichtingKeuze, aantal: number, rng: Rng = Math.random): Vraag[] {
  const kandidaten = woorden.map((w) => ({ w, richting: kiesRichting(keuze, rng) }));
  const gekozen = gewogenSteekproef(kandidaten, (k) => gewicht(k.w.voortgang[k.richting]), aantal, rng);
  return gekozen.map((k) => ({ woordId: k.w.id, richting: k.richting, herhaling: false }));
}

/** Kiest één volgende vraag voor een doorlopende sessie (tijdrace), niet hetzelfde woord als de vorige. */
export function kiesVolgende(woorden: Woord[], keuze: RichtingKeuze, vorigeId: string | null, rng: Rng = Math.random): Vraag {
  const pool = woorden.length > 1 ? woorden.filter((w) => w.id !== vorigeId) : woorden;
  const [v] = maakSessie(pool, keuze, 1, rng);
  return v;
}

/**
 * Wachtrij voor een sessie. Een fout beantwoorde vraag komt na 3–5 andere vragen nog een keer
 * terug (hoogstens twee keer extra per vraag, zodat een sessie altijd eindigt).
 */
export class SessieWachtrij {
  private rij: Vraag[];
  private positie = 0;
  private herhalingen = new Map<string, number>();

  constructor(vragen: Vraag[], private rng: Rng = Math.random, private maxHerhalingen = 2) {
    this.rij = [...vragen];
  }

  get huidige(): Vraag | undefined {
    return this.rij[this.positie];
  }

  get klaar(): boolean {
    return this.positie >= this.rij.length;
  }

  /** Aantal vragen dat nog komt, inclusief de huidige. */
  get resterend(): number {
    return this.rij.length - this.positie;
  }

  get totaal(): number {
    return this.rij.length;
  }

  get gedaan(): number {
    return this.positie;
  }

  /** Verwerkt het antwoord op de huidige vraag en gaat door naar de volgende. */
  antwoord(goed: boolean): void {
    const vraag = this.huidige;
    if (!vraag) return;
    if (!goed) {
      const sleutel = `${vraag.woordId}|${vraag.richting}`;
      const aantal = this.herhalingen.get(sleutel) ?? 0;
      if (aantal < this.maxHerhalingen) {
        this.herhalingen.set(sleutel, aantal + 1);
        const afstand = 3 + Math.floor(this.rng() * 3); // 3, 4 of 5 vragen later
        const plek = Math.min(this.positie + 1 + afstand, this.rij.length);
        this.rij.splice(plek, 0, { ...vraag, herhaling: true });
      }
    }
    this.positie++;
  }

  /** Alle vragen (voor tests en overzicht). */
  alle(): readonly Vraag[] {
    return this.rij;
  }
}
