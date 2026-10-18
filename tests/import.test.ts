import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { leesWerkboek, naarRijen, vatSamen, voegSamen } from '../src/shared/importExcel';
import { legeState, verwijderToets } from '../src/shared/state';
import { maakTemplate } from '../src/shared/template';

function excel(...bladen: unknown[][][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  bladen.forEach((aoa, i) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), `Blad${i + 1}`));
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('Excel inlezen', () => {
  it('leest twee kolommen met de talen als kop', () => {
    const r = leesWerkboek(excel([['Frans', 'Nederlands'], ['le chien', 'de hond'], ['acheter', 'kopen']]));
    expect(r.fouten).toEqual([]);
    expect(r.taal).toBe('Frans');
    expect(r.paren.map(({ vreemd, nederlands }) => [vreemd, nederlands])).toEqual([
      ['le chien', 'de hond'],
      ['acheter', 'kopen'],
    ]);
  });

  it('volgorde van de kolommen maakt niet uit', () => {
    const r = leesWerkboek(excel([['nederlands', 'Duits'], ['de hond', 'der Hund']]));
    expect(r.taal).toBe('Duits');
    expect(r.paren[0]).toMatchObject({ vreemd: 'der Hund', nederlands: 'de hond' });
  });

  it('geen alternatieven: een puntkomma blijft gewoon tekst', () => {
    const r = leesWerkboek(excel([['Engels', 'Nederlands'], ['to buy; to purchase', 'kopen']]));
    expect(r.paren[0].vreemd).toBe('to buy; to purchase');
  });

  it('meldt lege cellen met rijnummer en slaat lege rijen over', () => {
    const r = leesWerkboek(excel([['Frans', 'Nederlands'], ['le chien', 'de hond'], [], ['le chat', '']]));
    expect(r.paren).toHaveLength(1);
    expect(r.fouten).toEqual([{ bron: 'Rij 4', melding: expect.stringContaining('"Nederlands"') }]);
  });

  it('meldt een ontbrekende of onjuiste koprij', () => {
    expect(leesWerkboek(excel([['le chien', 'de hond']])).fouten[0].melding).toMatch(/Nederlands/);
    expect(leesWerkboek(excel([['Frans', 'Engels'], ['le chien', 'the dog']])).fouten[0].melding).toMatch(/Nederlands/);
    expect(leesWerkboek(excel([['Frans', 'Nederlands', 'Opmerking']])).fouten[0].melding).toMatch(/precies twee/);
  });

  it('meldt dubbele woorden', () => {
    const r = leesWerkboek(excel([['Frans', 'Nederlands'], ['le chien', 'de hond'], ['Le Chien', 'hond']]));
    expect(r.paren).toHaveLength(1);
    expect(r.fouten[0].melding).toMatch(/dubbel/);
  });

  it('slaat een leeg eerste tabblad over', () => {
    const r = leesWerkboek(excel([], [['Frans', 'Nederlands'], ['le chien', 'de hond']]));
    expect(r.paren).toHaveLength(1);
  });

  it('leest het voorbeeldbestand zonder fouten', () => {
    const r = leesWerkboek(XLSX.write(maakTemplate(), { type: 'array', bookType: 'xlsx' }));
    expect(r.fouten).toEqual([]);
    expect(r.taal).toBe('Frans');
    expect(r.paren.length).toBeGreaterThan(5);
  });

  it('leest een UTF-8 CSV met speciale tekens en puntkomma als scheidingsteken', () => {
    const csv = 'Nederlands;Duits\nhet meisje;das Mädchen\nde straat;die Straße';
    const r = leesWerkboek(new TextEncoder().encode(csv));
    expect(r.fouten).toEqual([]);
    expect(r.paren.map((x) => x.vreemd)).toEqual(['das Mädchen', 'die Straße']);
  });

  it('meldt een bestand dat geen Excel is', () => {
    const r = leesWerkboek(new TextEncoder().encode('\u0000\u0001 geen excel \u0002'));
    expect(r.paren).toHaveLength(0);
    expect(r.fouten.length).toBeGreaterThan(0);
  });
});

describe('samenvoegen', () => {
  it('voegt nieuwe woorden toe en behoudt voortgang van bestaande', () => {
    const eerste = leesWerkboek(excel([['Frans', 'Nederlands'], ['le chien', 'de hond']]));
    let s = voegSamen(legeState(), naarRijen(eerste.paren, 'Frans', 'H3'), '2026-09-01');
    const id = Object.keys(s.woorden)[0];
    s.woorden[id].voortgang.naarNL = { goed: 4, fout: 1, reeks: 2, bakje: 3, laatst: 'x' };

    const tweede = leesWerkboek(excel([['Nederlands', 'Frans'], ['hond', 'le chien'], ['de kat', 'le chat']]));
    const rijen = naarRijen(tweede.paren, 'frans', 'h3');
    expect(vatSamen(rijen, s)).toEqual([{ vak: 'frans', toets: 'h3', nieuw: 1, bestaand: 1 }]);
    s = voegSamen(s, rijen, '2026-09-02');

    expect(Object.keys(s.woorden)).toHaveLength(2);
    expect(s.woorden[id].voortgang.naarNL.bakje).toBe(3);
    expect(s.woorden[id].nederlands).toBe('hond');
    // Vak- en toetsnaam worden niet dubbel (frans = Frans, h3 = H3).
    expect(new Set(Object.values(s.woorden).map((w) => `${w.vak} ${w.toets}`))).toEqual(new Set(['Frans H3']));
    expect(Object.keys(s.vakken)).toEqual(['Frans']);
  });

  it('andere toets van hetzelfde vak blijft apart', () => {
    const r = leesWerkboek(excel([['Frans', 'Nederlands'], ['le chien', 'de hond']]));
    let s = voegSamen(legeState(), naarRijen(r.paren, 'Frans', 'H3'));
    s = voegSamen(s, naarRijen(r.paren, 'Frans', 'H4'));
    expect(Object.keys(s.woorden)).toHaveLength(2);
  });

  it('toets verwijderen haalt alleen de woorden van die toets weg', () => {
    const r = leesWerkboek(excel([['Frans', 'Nederlands'], ['le chien', 'de hond'], ['le chat', 'de kat']]));
    let s = voegSamen(legeState(), naarRijen(r.paren, 'Frans', 'H3'));
    s = voegSamen(s, naarRijen(r.paren, 'Frans', 'H4'));
    s = verwijderToets(s, 'Frans', 'H3');
    expect(Object.values(s.woorden).map((w) => w.toets)).toEqual(['H4', 'H4']);
    expect(s.vakken.Frans).toBeDefined();
  });

  it('nieuw vak krijgt standaardinstellingen (Duits: hoofdletters belangrijk)', () => {
    const r = leesWerkboek(excel([['Duits', 'Nederlands'], ['der Hund', 'de hond']]));
    const s = voegSamen(legeState(), naarRijen(r.paren, 'Duits', 'K1'));
    expect(s.vakken.Duits).toMatchObject({ taal: 'de', hoofdlettersBelangrijk: true });
    expect(s.vakken.Duits.tekens).toContain('ß');
  });
});
