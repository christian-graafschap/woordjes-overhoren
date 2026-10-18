import { describe, expect, it } from 'vitest';
import { berekenCijfer, isGehaald, maandagVan, registreerAntwoord, sluitSessie, totalenPerVak, weekDagen, weekNummer, werkStreakBij } from '../src/shared/engine';
import { resetVoortgang } from '../src/shared/state';
import { controleerMedailles, niveauVoor, MEDAILLES, volgendNiveau } from '../src/shared/medailles';
import { legeSpeler, legeState, legeVoortgang } from '../src/shared/state';
import type { AppState } from '../src/shared/types';
import { levelVan, reeksBonus, xpGrens } from '../src/shared/xp';

function stateMetWoord(): AppState {
  const s = legeState();
  s.woorden.w = {
    id: 'w',
    vak: 'Frans',
    toets: 'H1',
    vreemd: 'le chien',
    nederlands: 'de hond',
    altVreemd: [],
    altNederlands: [],
    toegevoegd: '2026-01-01',
    voortgang: { naarNL: legeVoortgang(), naarVreemd: legeVoortgang() },
  };
  return s;
}

describe('XP en levels', () => {
  it('typen geeft meer XP dan meerkeuze', () => {
    const t = registreerAntwoord(stateMetWoord(), { woordId: 'w', richting: 'naarNL', goed: true, soort: 'typen' });
    const m = registreerAntwoord(stateMetWoord(), { woordId: 'w', richting: 'naarNL', goed: true, soort: 'meerkeuze' });
    expect(t.xp).toBeGreaterThan(m.xp);
  });
  it('reeksbonus per 5 op rij, maximaal 25', () => {
    expect(reeksBonus(4)).toBe(0);
    expect(reeksBonus(5)).toBe(5);
    expect(reeksBonus(10)).toBe(10);
    expect(reeksBonus(50)).toBe(25);
  });
  it('elk level kost 100 punten meer dan het vorige', () => {
    expect(xpGrens(1)).toBe(0);
    expect(xpGrens(2)).toBe(100);
    expect(xpGrens(3)).toBe(300);
    expect(xpGrens(4)).toBe(600);
    for (let n = 2; n < 30; n++) {
      expect(xpGrens(n + 1) - xpGrens(n)).toBe(xpGrens(n) - xpGrens(n - 1) + 100);
    }
  });
  it('level volgt uit de punten', () => {
    expect(levelVan(0)).toBe(1);
    expect(levelVan(99)).toBe(1);
    expect(levelVan(100)).toBe(2);
    expect(levelVan(xpGrens(4))).toBe(4);
    expect(levelVan(xpGrens(4) - 1)).toBe(3);
  });
});

describe('streak', () => {
  it('telt op bij oefenen op opeenvolgende dagen', () => {
    let sp = werkStreakBij(legeSpeler(), '2026-09-29');
    sp = werkStreakBij(sp, '2026-09-30');
    sp = werkStreakBij(sp, '2026-09-30');
    expect(sp.streakDagen).toBe(2);
  });
  it('over maand- en jaargrens', () => {
    expect(werkStreakBij({ ...legeSpeler(), laatsteOefendag: '2026-12-31', streakDagen: 4 }, '2027-01-01').streakDagen).toBe(5);
  });
  it('begint opnieuw na een gemiste dag', () => {
    expect(werkStreakBij({ ...legeSpeler(), laatsteOefendag: '2026-09-27', streakDagen: 9 }, '2026-09-30').streakDagen).toBe(1);
  });
});

describe('achievements', () => {
  it('eerste keer gehaald', () => {
    const g = sluitSessie(legeState(), { uitslag: { titel: 'Frans · H3', vorm: 'typen', goed: 15, totaal: 20, punten: 300, seconden: 120 } });
    expect(g.nieuweAchievements.map((a) => a.id)).toContain('eerste-gehaald');
  });
  it('Doorzetter: 5 keer fout, daarna 3 keer goed', () => {
    let s = stateMetWoord();
    for (let i = 0; i < 5; i++) s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: false, soort: 'typen' }).state;
    s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: true, soort: 'typen' }).state;
    s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: true, soort: 'typen' }).state;
    const g = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: true, soort: 'typen' });
    expect(g.nieuweAchievements.map((a) => a.id)).toContain('doorzetter');
  });
  it('eerste sessie en tijdrace-record', () => {
    const g = sluitSessie(legeState(), { tijdraceScore: 12 });
    expect(g.nieuweAchievements.map((a) => a.id)).toContain('eerste-sessie');
    expect(g.nieuweMedailles).toEqual([expect.objectContaining({ niveau: 'brons', def: expect.objectContaining({ id: 'tijdrace' }) })]);
    expect(g.state.speler.besteTijdrace).toBe(12);
  });
  it('behaalde achievements worden niet opnieuw gemeld', () => {
    const eerst = sluitSessie(legeState());
    const daarna = sluitSessie(eerst.state);
    expect(daarna.nieuweAchievements).toEqual([]);
  });
});

describe('proeftoets-cijfer', () => {
  it('1 bij niets goed, 10 bij alles goed', () => {
    expect(berekenCijfer(0, 20)).toBe(1);
    expect(berekenCijfer(20, 20)).toBe(10);
    expect(berekenCijfer(15, 20)).toBe(7.8);
  });
});

describe('gehaald (75%)', () => {
  it('75% of meer is gehaald', () => {
    expect(isGehaald(15, 20)).toBe(true);
    expect(isGehaald(14, 20)).toBe(false);
    expect(isGehaald(20, 20)).toBe(true);
    expect(isGehaald(0, 0)).toBe(false);
  });
  it('telt gehaalde sessies en onthoudt het sessierecord', () => {
    let s = sluitSessie(legeState(), { uitslag: { titel: 'A', vorm: 'typen', goed: 18, totaal: 20, punten: 0, seconden: 0 } }).state;
    s = sluitSessie(s, { uitslag: { titel: 'B', vorm: 'typen', goed: 5, totaal: 20, punten: 0, seconden: 0 } }).state;
    expect(s.speler.sessiesGehaald).toBe(1);
    expect(s.speler.besteSessieGoed).toBe(18);
  });
});

describe('medailles', () => {
  const def = MEDAILLES.find((m) => m.id === 'totaal-goed')!;
  it('niveau volgt uit de grenzen', () => {
    expect(niveauVoor(def, 99)).toBeNull();
    expect(niveauVoor(def, 100)).toBe('brons');
    expect(niveauVoor(def, 1500)).toBe('goud');
    expect(volgendNiveau(def, 120)).toEqual({ niveau: 'zilver', grens: 500 });
    expect(volgendNiveau(def, 99999)).toBeNull();
  });
  it('goede antwoorden over sessies heen leveren een medaille op, eenmalig gemeld', () => {
    const s = legeState();
    s.speler.totaalGoed = 99;
    expect(controleerMedailles(s, 't').nieuw).toEqual([]);
    s.speler.totaalGoed = 100;
    const eerst = controleerMedailles(s, 't1');
    expect(eerst.nieuw.map((m) => `${m.def.id}:${m.niveau}`)).toEqual(['totaal-goed:brons']);
    expect(eerst.state.medailles['totaal-goed']).toEqual({ brons: 't1' });
    expect(controleerMedailles(eerst.state, 't2').nieuw).toEqual([]);
  });
  it('bij een sprong over meerdere niveaus alleen het hoogste melden, maar alle niveaus opslaan', () => {
    const s = legeState();
    s.speler.langsteReeks = 60;
    const r = controleerMedailles(s, 't');
    expect(r.nieuw.map((m) => m.niveau)).toEqual(['goud']);
    expect(Object.keys(r.state.medailles.reeks)).toEqual(['brons', 'zilver', 'goud']);
  });
});

describe('dagoverzicht', () => {
  it('telt antwoorden, goed en punten per dag', () => {
    const dag1 = new Date(2026, 8, 29, 16, 0);
    const dag2 = new Date(2026, 8, 30, 16, 0);
    let s = stateMetWoord();
    s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: true, soort: 'typen' }, dag1).state;
    s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: false, soort: 'typen' }, dag1).state;
    s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: true, soort: 'meerkeuze' }, dag2).state;
    expect(s.dagen['2026-09-29']).toMatchObject({ antwoorden: 2, goed: 1, punten: 20 });
    expect(s.dagen['2026-09-30']).toMatchObject({ antwoorden: 1, goed: 1, punten: 10 });
  });
  it('bewaart per sessie titel, score en tijd', () => {
    const nu = new Date(2026, 8, 30, 17, 0);
    const u = { titel: 'Frans · H3', vorm: 'typen' as const, goed: 12, totaal: 20, punten: 240, seconden: 300 };
    let s = sluitSessie(legeState(), { uitslag: u }, nu).state;
    s = sluitSessie(s, { uitslag: { ...u, seconden: 99999 } }, nu).state;
    const dag = s.dagen['2026-09-30'];
    expect(dag.sessies).toHaveLength(2);
    expect(dag.sessies[0]).toMatchObject({ titel: 'Frans · H3', goed: 12, totaal: 20, gehaald: false });
    // Tijd per sessie is begrensd op een uur.
    expect(dag.seconden).toBe(300 + 3600);
  });
});

describe('punten per vak', () => {
  it('telt punten en goede antwoorden per vak, en sessies per vak', () => {
    let s = stateMetWoord();
    s.woorden.d = { ...s.woorden.w, id: 'd', vak: 'Duits', vreemd: 'der Hund' };
    const nu = new Date(2026, 8, 30, 12);
    s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: true, soort: 'typen' }, nu).state;
    s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: false, soort: 'typen' }, nu).state;
    s = registreerAntwoord(s, { woordId: 'd', richting: 'naarNL', goed: true, soort: 'meerkeuze' }, nu).state;
    s = sluitSessie(s, { uitslag: { titel: 'Frans · H1', vak: 'Frans', vorm: 'typen', goed: 1, totaal: 2, punten: 20, seconden: 10 } }, nu).state;
    expect(s.dagen['2026-09-30'].perVak).toEqual({
      Frans: { antwoorden: 2, goed: 1, punten: 20 },
      Duits: { antwoorden: 1, goed: 1, punten: 10 },
    });
    expect(totalenPerVak(s)).toEqual([
      { vak: 'Frans', antwoorden: 2, goed: 1, punten: 20, sessies: 1, gehaald: 0 },
      { vak: 'Duits', antwoorden: 1, goed: 1, punten: 10, sessies: 0, gehaald: 0 },
    ]);
    expect(totalenPerVak(s, ['2026-09-29'])).toEqual([]);
  });
});

describe('weken', () => {
  it('week loopt van maandag tot en met zondag', () => {
    // Woensdag 30 september 2026
    const wo = new Date(2026, 8, 30);
    expect(weekDagen(maandagVan(wo))).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    // Zondag hoort bij de week ervoor
    expect(weekDagen(maandagVan(new Date(2026, 9, 4)))[0]).toBe('2026-09-28');
    expect(weekDagen(maandagVan(wo, -1))[0]).toBe('2026-09-21');
    expect(weekDagen(maandagVan(wo, 1))[6]).toBe('2026-10-11');
  });
  it('ISO-weeknummer', () => {
    expect(weekNummer(new Date(2026, 8, 30))).toBe(40);
    expect(weekNummer(new Date(2026, 0, 1))).toBe(1);
    expect(weekNummer(new Date(2027, 0, 1))).toBe(53);
  });
});

describe('punten per vak', () => {
  it('telt punten en level-ups alleen bij het vak van het woord', () => {
    let s = stateMetWoord();
    s.woorden.d = { ...s.woorden.w, id: 'd', vak: 'Duits', vreemd: 'der Hund' };
    s.speler.puntenPerVak = { Frans: 95, Duits: 500 };
    const g = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: true, soort: 'meerkeuze' });
    expect(g.state.speler.puntenPerVak).toEqual({ Frans: 105, Duits: 500 });
    expect(g.levelUp).toEqual({ vak: 'Frans', level: 2 });
    s = registreerAntwoord(g.state, { woordId: 'd', richting: 'naarNL', goed: true, soort: 'flashcards' }).state;
    expect(s.speler.puntenPerVak).toEqual({ Frans: 105, Duits: 505 });
  });
});

describe('reset', () => {
  it('zet alle voortgang op nul maar houdt woorden, instellingen en naam', () => {
    let s = stateMetWoord();
    s.instellingen.naam = 'Sam';
    for (let i = 0; i < 12; i++) s = registreerAntwoord(s, { woordId: 'w', richting: 'naarNL', goed: true, soort: 'typen' }).state;
    s = sluitSessie(s, { uitslag: { titel: 'x', vorm: 'typen', goed: 12, totaal: 12, punten: 0, seconden: 0 } }).state;
    expect(s.speler.puntenPerVak.Frans).toBeGreaterThan(0);
    expect(Object.keys(s.medailles).length).toBeGreaterThan(0);
    const r = resetVoortgang(s);
    expect(r.speler).toEqual(legeState().speler);
    expect(r.achievements).toEqual({});
    expect(r.medailles).toEqual({});
    expect(r.dagen).toEqual({});
    expect(r.woorden.w.voortgang.naarNL).toEqual(legeVoortgang());
    expect(r.woorden.w.vreemd).toBe('le chien');
    expect(r.instellingen.naam).toBe('Sam');
    expect(r.vakken).toEqual(s.vakken);
  });
});
