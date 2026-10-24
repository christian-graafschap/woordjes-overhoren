import { describe, expect, it } from 'vitest';
import { beoordeel, geldigeAntwoorden, maakDiff, optiesVoor, splitsLidwoord, type NakijkOpties } from '../src/shared/grading';
import { legeVoortgang, standaardVakInstellingen } from '../src/shared/state';
import type { Woord } from '../src/shared/types';

const fr: NakijkOpties = { taal: 'fr', hoofdlettersBelangrijk: false, accenten: 'soepel' };
const frStreng: NakijkOpties = { ...fr, accenten: 'streng' };
const de: NakijkOpties = { taal: 'de', hoofdlettersBelangrijk: true, accenten: 'soepel' };
const nl: NakijkOpties = { taal: 'nl', hoofdlettersBelangrijk: false, accenten: 'soepel' };
const en: NakijkOpties = { taal: 'en', hoofdlettersBelangrijk: false, accenten: 'soepel' };

function woord(extra: Partial<Woord>): Woord {
  return {
    id: 'x',
    vak: 'Engels',
    toets: 'U2',
    vreemd: 'to buy',
    nederlands: 'kopen',
    altVreemd: [],
    altNederlands: [],
    toegevoegd: '2026-01-01',
    voortgang: { naarNL: legeVoortgang(), naarVreemd: legeVoortgang() },
    ...extra,
  };
}

describe('spaties en hoofdletters', () => {
  it('negeert spaties aan begin/eind en dubbele spaties', () => {
    expect(beoordeel('  le   chien ', ['le chien'], fr).uitslag).toBe('goed');
  });
  it('negeert een punt aan het eind, in invoer en in het juiste antwoord', () => {
    expect(beoordeel('le chien.', ['le chien'], fr).uitslag).toBe('goed');
    expect(beoordeel('le chien', ['le chien.'], fr).uitslag).toBe('goed');
    expect(beoordeel('Ça va.', ['Ça va'], fr).uitslag).toBe('goed');
  });
  it('een vraagteken aan het eind telt wel mee', () => {
    expect(beoordeel('ça va', ['ça va ?'], fr).uitslag).toBe('fout');
    expect(beoordeel('ça va ?', ['ça va ?'], fr).uitslag).toBe('goed');
  });
  it('is hoofdletterongevoelig als hoofdletters niet belangrijk zijn', () => {
    expect(beoordeel('LE CHIEN', ['le chien'], fr).uitslag).toBe('goed');
  });
  it('Duits: hoofdletter van zelfstandig naamwoord telt', () => {
    const r = beoordeel('der hund', ['der Hund'], de);
    expect(r.uitslag).toBe('fout');
    expect(r.melding).toMatch(/hoofdletter/);
  });
  it('Duits: hoofdletter aan het begin van het lidwoord maakt niet uit', () => {
    expect(beoordeel('Der Hund', ['der Hund'], de).uitslag).toBe('goed');
  });
  it('Duits: werkwoord zonder hoofdletter is goed', () => {
    expect(beoordeel('kaufen', ['kaufen'], de).uitslag).toBe('goed');
  });
  it('hoofdletters tellen alleen voor de vreemde taal, niet bij antwoorden in het Nederlands', () => {
    const vak = standaardVakInstellingen('Duits');
    expect(optiesVoor('naarNL', vak).hoofdlettersBelangrijk).toBe(false);
    expect(optiesVoor('naarVreemd', vak).hoofdlettersBelangrijk).toBe(true);
  });
});

describe('accenten', () => {
  it('soepel: zonder accent telt als goed, met spellingmelding', () => {
    const r = beoordeel("l'ecole", ["l'école"], fr);
    expect(r.uitslag).toBe('goed');
    expect(r.melding).toContain("l'école");
  });
  it('streng: zonder accent is fout', () => {
    const r = beoordeel("l'ecole", ["l'école"], frStreng);
    expect(r.uitslag).toBe('fout');
    expect(r.melding).toMatch(/accent/);
  });
  it('correcte accenten zijn altijd goed zonder melding', () => {
    const r = beoordeel("l'école", ["l'école"], frStreng);
    expect(r.uitslag).toBe('goed');
    expect(r.melding).toBe('');
  });
  it('soepel: ss voor ß', () => {
    expect(beoordeel('die Strasse', ['die Straße'], de).uitslag).toBe('goed');
  });
  it('accepteert een gekrulde apostrof', () => {
    expect(beoordeel('l’école', ["l'école"], frStreng).uitslag).toBe('goed');
  });
});

describe('lidwoorden', () => {
  it('fout lidwoord geeft lidwoordFout met specifieke melding', () => {
    const r = beoordeel('la chien', ['le chien'], fr);
    expect(r.uitslag).toBe('lidwoordFout');
    expect(r.melding).toBe('Woord goed, lidwoord fout (le)');
  });
  it('ontbrekend lidwoord', () => {
    const r = beoordeel('chien', ['le chien'], fr);
    expect(r.uitslag).toBe('lidwoordFout');
    expect(r.melding).toMatch(/ontbreekt/);
  });
  it("l' wordt als lidwoord herkend", () => {
    expect(splitsLidwoord("l'école", 'fr')).toEqual({ lidwoord: "l'", kern: 'école' });
    expect(beoordeel('le école', ["l'école"], fr).uitslag).toBe('lidwoordFout');
  });
  it('Duits der/die/das', () => {
    expect(beoordeel('die Hund', ['der Hund'], de).uitslag).toBe('lidwoordFout');
  });
  it('Nederlands de/het', () => {
    const r = beoordeel('de huis', ['het huis'], nl);
    expect(r.uitslag).toBe('lidwoordFout');
    expect(r.melding).toContain('het');
  });
  it("Engels: 'to' vergeten", () => {
    const r = beoordeel('buy', ['to buy'], en);
    expect(r.uitslag).toBe('lidwoordFout');
    expect(r.melding).toMatch(/to/);
  });
  it('lidwoord goed maar woord fout is gewoon fout', () => {
    expect(beoordeel('le chat', ['le chien'], fr).uitslag).toBe('fout');
  });
  it('lidwoord waar het niet hoort', () => {
    const r = beoordeel('het kopen', ['kopen'], nl);
    expect(r.uitslag).toBe('lidwoordFout');
    expect(r.melding).toMatch(/geen lidwoord/);
  });
});

describe('alternatieven', () => {
  const w = woord({ altVreemd: ['to purchase'], altNederlands: ['aanschaffen'] });
  it('alternatief in de vreemde taal geldt voor richting naarVreemd', () => {
    expect(beoordeel('to purchase', geldigeAntwoorden(w, 'naarVreemd'), en).uitslag).toBe('goed');
    expect(beoordeel('to purchase', geldigeAntwoorden(w, 'naarNL'), nl).uitslag).toBe('fout');
  });
  it('Nederlands alternatief geldt voor richting naarNL', () => {
    expect(beoordeel('aanschaffen', geldigeAntwoorden(w, 'naarNL'), nl).uitslag).toBe('goed');
    expect(beoordeel('aanschaffen', geldigeAntwoorden(w, 'naarVreemd'), en).uitslag).toBe('fout');
  });
  it('bij fout wordt het dichtstbijzijnde alternatief getoond', () => {
    const r = beoordeel('to purchse', geldigeAntwoorden(w, 'naarVreemd'), en);
    expect(r.uitslag).toBe('fout');
    expect(r.juist).toBe('to purchase');
  });
  it('lidwoordfout ook bij een alternatief', () => {
    expect(beoordeel('purchase', geldigeAntwoorden(w, 'naarVreemd'), en).uitslag).toBe('lidwoordFout');
  });
});

describe('diff', () => {
  it('markeert gemiste en foute tekens', () => {
    const d = maakDiff('chein', 'chien');
    expect(d.invoer.map((x) => x.tekst).join('')).toBe('chein');
    expect(d.juist.map((x) => x.tekst).join('')).toBe('chien');
    expect(d.juist.some((x) => x.anders)).toBe(true);
  });
  it('geen verschillen bij gelijke tekst', () => {
    expect(maakDiff('abc', 'abc').juist).toEqual([{ tekst: 'abc', anders: false }]);
  });
  it('leeg antwoord is fout', () => {
    expect(beoordeel('   ', ['le chien'], fr).uitslag).toBe('fout');
  });
});
