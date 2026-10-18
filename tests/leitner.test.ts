import { describe, expect, it } from 'vitest';
import { gewicht, gewogenSteekproef, isBeheerst, maakSessie, SessieWachtrij, verwerkAntwoord, type Vraag } from '../src/shared/leitner';
import { legeVoortgang } from '../src/shared/state';
import type { RichtingVoortgang, Woord } from '../src/shared/types';

/** Deterministische pseudo-random generator voor tests. */
function rng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function v(extra: Partial<RichtingVoortgang> = {}): RichtingVoortgang {
  return { ...legeVoortgang(), ...extra };
}

function woord(id: string, naarNL: Partial<RichtingVoortgang> = {}, naarVreemd: Partial<RichtingVoortgang> = {}): Woord {
  return {
    id,
    vak: 'Frans',
    toets: 'H1',
    vreemd: id,
    nederlands: id,
    altVreemd: [],
    altNederlands: [],
    toegevoegd: '2026-01-01',
    voortgang: { naarNL: v(naarNL), naarVreemd: v(naarVreemd) },
  };
}

describe('bakjes', () => {
  it('goed → bakje omhoog, telt goed en reeks', () => {
    const r = verwerkAntwoord(v({ bakje: 2, reeks: 1 }), true, 't');
    expect(r).toMatchObject({ bakje: 3, goed: 1, reeks: 2, laatst: 't' });
  });
  it('niet hoger dan bakje 5', () => {
    expect(verwerkAntwoord(v({ bakje: 5 }), true, 't').bakje).toBe(5);
  });
  it('fout → terug naar bakje 1 en reeks 0', () => {
    const r = verwerkAntwoord(v({ bakje: 4, reeks: 3 }), false, 't');
    expect(r).toMatchObject({ bakje: 1, fout: 1, reeks: 0 });
  });
  it('herhaling in dezelfde sessie verhoogt het bakje niet', () => {
    const r = verwerkAntwoord(v({ bakje: 1 }), true, 't', true);
    expect(r.bakje).toBe(1);
    expect(r.goed).toBe(1);
  });
  it('beheerst = bakje ≥ 4 in beide richtingen', () => {
    expect(isBeheerst(woord('a', { bakje: 4 }, { bakje: 5 }))).toBe(true);
    expect(isBeheerst(woord('a', { bakje: 5 }, { bakje: 3 }))).toBe(false);
  });
});

describe('gewicht', () => {
  it('lage bakjes wegen zwaarder dan hoge', () => {
    expect(gewicht(v({ bakje: 1, goed: 1 }))).toBeGreaterThan(gewicht(v({ bakje: 5, goed: 5 })));
  });
  it('veel fouten wegen zwaarder bij hetzelfde bakje', () => {
    expect(gewicht(v({ bakje: 2, goed: 1, fout: 5 }))).toBeGreaterThan(gewicht(v({ bakje: 2, goed: 5, fout: 1 })));
  });
  it('nieuw woord weegt als bakje 1', () => {
    expect(gewicht(v())).toBe(25);
  });
});

describe('sessie samenstellen', () => {
  it('kiest niet meer dan gevraagd en geen dubbele woorden', () => {
    const woorden = Array.from({ length: 30 }, (_, i) => woord(`w${i}`));
    const s = maakSessie(woorden, 'naarNL', 20, rng());
    expect(s).toHaveLength(20);
    expect(new Set(s.map((x) => x.woordId)).size).toBe(20);
    expect(s.every((x) => x.richting === 'naarNL')).toBe(true);
  });
  it('kiest alle woorden als er minder zijn dan de sessiegrootte', () => {
    expect(maakSessie([woord('a'), woord('b')], 'naarVreemd', 20, rng())).toHaveLength(2);
  });
  it('gemengd levert beide richtingen op', () => {
    const woorden = Array.from({ length: 40 }, (_, i) => woord(`w${i}`));
    const r = new Set(maakSessie(woorden, 'gemengd', 40, rng()).map((x) => x.richting));
    expect(r).toEqual(new Set(['naarNL', 'naarVreemd']));
  });
  it('lastige woorden worden veel vaker gekozen dan beheerste', () => {
    const woorden = [
      ...Array.from({ length: 10 }, (_, i) => woord(`moeilijk${i}`, { bakje: 1, fout: 4, goed: 1 })),
      ...Array.from({ length: 10 }, (_, i) => woord(`makkelijk${i}`, { bakje: 5, goed: 8 })),
    ];
    let moeilijk = 0;
    const r = rng(7);
    for (let i = 0; i < 200; i++) {
      moeilijk += maakSessie(woorden, 'naarNL', 5, r).filter((x) => x.woordId.startsWith('moeilijk')).length;
    }
    expect(moeilijk / 1000).toBeGreaterThan(0.85);
  });
  it('gewogen steekproef zonder teruglegging', () => {
    const r = gewogenSteekproef([1, 2, 3, 4], () => 1, 4, rng());
    expect([...r].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('herhaalwachtrij', () => {
  const vragen = (n: number): Vraag[] =>
    Array.from({ length: n }, (_, i) => ({ woordId: `w${i}`, richting: 'naarNL', herhaling: false }));

  it('fout woord komt 3 tot 5 vragen later terug', () => {
    for (let seed = 1; seed < 20; seed++) {
      const q = new SessieWachtrij(vragen(10), rng(seed));
      q.antwoord(false); // w0 fout
      const rij = q.alle();
      const idx = rij.findIndex((x, i) => i > 0 && x.woordId === 'w0');
      expect(idx - 1).toBeGreaterThanOrEqual(3);
      expect(idx - 1).toBeLessThanOrEqual(5);
      expect(rij[idx].herhaling).toBe(true);
    }
  });
  it('goed antwoord voegt niets toe', () => {
    const q = new SessieWachtrij(vragen(5), rng());
    q.antwoord(true);
    expect(q.totaal).toBe(5);
    expect(q.huidige?.woordId).toBe('w1');
  });
  it('maximaal twee herhalingen per vraag, sessie eindigt altijd', () => {
    const q = new SessieWachtrij(vragen(1), rng());
    let stappen = 0;
    while (!q.klaar && stappen < 100) {
      q.antwoord(false);
      stappen++;
    }
    expect(q.klaar).toBe(true);
    expect(stappen).toBe(3);
  });
  it('herhaling aan het eind als er te weinig vragen over zijn', () => {
    const q = new SessieWachtrij(vragen(2), rng());
    q.antwoord(true);
    q.antwoord(false); // w1 fout, laatste vraag
    expect(q.klaar).toBe(false);
    expect(q.huidige).toMatchObject({ woordId: 'w1', herhaling: true });
  });
});
