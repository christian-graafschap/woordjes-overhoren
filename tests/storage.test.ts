import { describe, expect, it } from 'vitest';
import { BrowserOpslag, leesVoortgangBestand, MAX_BACKUPS, SLEUTEL, type SleutelOpslag } from '../src/opslag';
import { legeState, migreer } from '../src/shared/state';
import { HUIDIGE_VERSIE } from '../src/shared/types';

/** Nep-localStorage in het geheugen, optioneel met een maximale grootte. */
function nepOpslag(maxTekens = Infinity): SleutelOpslag & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      const totaal = [...data].reduce((n, [a, b]) => n + (a === k ? 0 : a.length + b.length), 0) + k.length + v.length;
      if (totaal > maxTekens) throw Object.assign(new Error('vol'), { name: 'QuotaExceededError' });
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
  };
}

describe('opslag in de browser', () => {
  it('begint leeg als er nog niets is opgeslagen', () => {
    const o = nepOpslag();
    const { state, meldingen } = new BrowserOpslag(o).laad('2026-09-30');
    expect(state).toEqual(legeState());
    expect(meldingen).toEqual([]);
    expect(JSON.parse(o.data.get(SLEUTEL)!).versie).toBe(HUIDIGE_VERSIE);
  });

  it('schrijft en leest dezelfde gegevens terug', () => {
    const o = nepOpslag();
    const s = legeState();
    s.speler.puntenPerVak = { Frans: 123 };
    new BrowserOpslag(o).schrijf(s);
    expect(new BrowserOpslag(o).laad().state.speler.puntenPerVak.Frans).toBe(123);
  });

  it('migreert een ouder formaat bij het laden', () => {
    const o = nepOpslag();
    o.data.set(SLEUTEL, JSON.stringify({ versie: 1, woorden: {}, speler: { xp: 10 } }));
    expect(new BrowserOpslag(o).laad().state.versie).toBe(HUIDIGE_VERSIE);
  });

  it('maakt één reservekopie per dag en bewaart alleen de nieuwste', () => {
    const o = nepOpslag();
    const opslag = new BrowserOpslag(o);
    for (let d = 1; d <= MAX_BACKUPS + 2; d++) opslag.laad(`2026-09-0${d}`);
    opslag.laad('2026-09-05');
    expect(opslag.backups()).toEqual(['2026-09-05', '2026-09-04', '2026-09-03'].slice(0, MAX_BACKUPS));
  });

  it('herstelt beschadigde voortgang uit de nieuwste reservekopie en bewaart het kapotte origineel', () => {
    const o = nepOpslag();
    const opslag = new BrowserOpslag(o);
    const s = legeState();
    s.speler.puntenPerVak = { Frans: 77 };
    opslag.schrijf(s);
    opslag.maakBackup('2026-09-29');
    o.data.set(SLEUTEL, '{"versie": 1, "woorden": {'); // half geschreven
    const { state, meldingen } = opslag.laad('2026-09-30');
    expect(state.speler.puntenPerVak.Frans).toBe(77);
    expect(meldingen.join(' ')).toMatch(/beschadigd.*2026-09-29/);
    expect([...o.data.keys()].some((k) => k.startsWith('overhoren:beschadigd:'))).toBe(true);
    expect(JSON.parse(o.data.get(SLEUTEL)!).speler.puntenPerVak.Frans).toBe(77);
  });

  it('begint leeg met een melding als er geen bruikbare reservekopie is', () => {
    const o = nepOpslag();
    o.data.set(SLEUTEL, 'kapot');
    const { state, meldingen } = new BrowserOpslag(o).laad();
    expect(state).toEqual(legeState());
    expect(meldingen.join(' ')).toMatch(/geen reservekopie/);
  });

  it('geeft een duidelijke fout als de opslag vol is', () => {
    const o = nepOpslag(50);
    expect(() => new BrowserOpslag(o).schrijf(legeState())).toThrow(/vol/);
  });

  it('weigert ongeldige gegevens', () => {
    expect(() => new BrowserOpslag(nepOpslag()).schrijf('geen object' as any)).toThrow();
  });
});

describe('voortgangsbestand terugzetten', () => {
  it('leest een gedownload bestand in, ook van een oudere versie', () => {
    const s = leesVoortgangBestand(JSON.stringify({ versie: 2, woorden: {}, speler: { xp: 0 } }));
    expect(s.versie).toBe(HUIDIGE_VERSIE);
  });

  it('weigert iets dat geen voortgangsbestand is', () => {
    expect(() => leesVoortgangBestand('hallo')).toThrow(/geen voortgangsbestand/);
    expect(() => leesVoortgangBestand('{"naam": "x"}')).toThrow(/Overhoren/);
  });
});

describe('migratie en versie', () => {
  it('vult ontbrekende velden aan zonder bestaande voortgang te verliezen', () => {
    const oud = {
      versie: 1,
      woorden: { a: { vak: 'Frans', toets: 'H1', vreemd: 'le chien', nederlands: 'de hond', voortgang: { naarNL: { goed: 3, bakje: 4 } } } },
      speler: { xp: 500 },
      eigenVeld: 'blijft',
    };
    const s = migreer(oud) as any;
    expect(s.speler.puntenPerVak).toEqual({ Frans: 500 });
    expect(s.speler.xp).toBeUndefined();
    expect(s.speler.streakDagen).toBe(0);
    expect(s.woorden.a.voortgang.naarNL).toMatchObject({ goed: 3, bakje: 4, fout: 0 });
    expect(s.woorden.a.voortgang.naarVreemd.bakje).toBe(1);
    expect(s.woorden.a.altVreemd).toEqual([]);
    expect(s.eigenVeld).toBe('blijft');
  });

  it('migreert versie 1 naar de huidige versie met behoud van voortgang', () => {
    const v1 = { versie: 1, woorden: {}, speler: { xp: 250, totaalGoed: 40 }, achievements: { 'eerste-sessie': 'x' }, instellingen: { sessieGrootte: 30 } };
    const s = migreer(v1);
    expect(s.versie).toBe(HUIDIGE_VERSIE);
    // Geen woorden en geen dagoverzicht: de punten zijn aan geen vak toe te wijzen.
    expect(s.speler.puntenPerVak).toEqual({});
    expect(s.speler.besteSessieGoed).toBe(0);
    expect(s.medailles).toEqual({});
    expect(s.dagen).toEqual({});
    expect(s.instellingen).toEqual({ sessieGrootte: 30, naam: '' });
    expect(s.achievements['eerste-sessie']).toBe('x');
  });

  it('leidt punten per vak af uit sessies voor dagen zonder telling per vak', () => {
    const s = migreer({
      versie: 2,
      dagen: {
        '2026-09-30': {
          antwoorden: 10,
          goed: 8,
          punten: 150,
          seconden: 60,
          sessies: [
            { titel: 'Frans · H3', vorm: 'typen', goed: 5, totaal: 6, punten: 100, seconden: 30, gehaald: true, tijd: 'a' },
            { titel: 'Duits · K1 · fouten', vorm: 'meerkeuze', goed: 3, totaal: 4, punten: 50, seconden: 30, gehaald: true, tijd: 'b' },
          ],
        },
      },
    });
    expect(s.dagen['2026-09-30'].perVak).toEqual({
      Frans: { antwoorden: 6, goed: 5, punten: 100 },
      Duits: { antwoorden: 4, goed: 3, punten: 50 },
    });
  });

  it('verdeelt bij versie 2 het puntentotaal over de vakken volgens het dagoverzicht', () => {
    const s = migreer({
      versie: 2,
      speler: { xp: 2165, totaalGoed: 10 },
      dagen: {
        '2026-09-30': { antwoorden: 197, goed: 137, punten: 1680, perVak: { FR: { antwoorden: 197, goed: 137, punten: 1680 } }, sessies: [] },
        '2026-10-18': { antwoorden: 5, goed: 2, punten: 40, perVak: { Duits: { antwoorden: 5, goed: 2, punten: 40 } }, sessies: [] },
      },
    });
    // De 445 punten van vóór het dagoverzicht gaan naar het vak met de meeste punten.
    expect(s.speler.puntenPerVak).toEqual({ FR: 2125, Duits: 40 });
    expect(s.speler.totaalGoed).toBe(10);
    expect((s.speler as any).xp).toBeUndefined();
  });

  it('weigert een bestand van een nieuwere versie', () => {
    expect(() => migreer({ versie: HUIDIGE_VERSIE + 1 })).toThrow(/versie/);
  });

  it('weigert geen-object', () => {
    expect(() => migreer([])).toThrow();
  });
});
