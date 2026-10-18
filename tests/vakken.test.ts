import { describe, expect, it } from 'vitest';
import { registreerAntwoord, sluitSessie, totalenPerVak } from '../src/shared/engine';
import { leesWerkboek, naarRijen, vatSamen, voegSamen } from '../src/shared/importExcel';
import { legeState } from '../src/shared/state';
import { controleerVaknaam, hernoemVak, verwijderVak } from '../src/shared/vakken';
import * as XLSX from 'xlsx';

function excel(aoa: unknown[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Blad1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function basis() {
  const frans = leesWerkboek(excel([['Nederlands', 'Frans'], ['de hond', 'le chien'], ['de kat', 'le chat']]));
  const duits = leesWerkboek(excel([['Nederlands', 'Duits'], ['de hond', 'der Hund']]));
  let s = voegSamen(legeState(), naarRijen(frans.paren, 'Frans', 'H3'));
  s = voegSamen(s, naarRijen(duits.paren, 'Duits', 'K1'));
  s.vakken.Frans = { ...s.vakken.Frans, accenten: 'streng' };
  const nu = new Date(2026, 8, 30, 12);
  const id = Object.values(s.woorden).find((w) => w.vreemd === 'le chien')!.id;
  s = registreerAntwoord(s, { woordId: id, richting: 'naarNL', goed: true, soort: 'typen' }, nu).state;
  s = sluitSessie(s, { uitslag: { titel: 'Frans · H3', vak: 'Frans', vorm: 'typen', goed: 1, totaal: 1, punten: 20, seconden: 10 } }, nu).state;
  return s;
}

describe('vak hernoemen', () => {
  it('zet woorden, instellingen en dagoverzicht om en behoudt de voortgang', () => {
    const s = hernoemVak(basis(), 'Frans', 'Frans (2e klas)');
    const franse = Object.values(s.woorden).filter((w) => w.vak === 'Frans (2e klas)');
    expect(franse).toHaveLength(2);
    expect(Object.values(s.woorden).some((w) => w.vak === 'Frans')).toBe(false);
    const hond = franse.find((w) => w.vreemd === 'le chien')!;
    expect(hond.voortgang.naarNL.goed).toBe(1);
    expect(s.woorden[hond.id]).toBe(hond);
    expect(s.vakken['Frans (2e klas)'].accenten).toBe('streng');
    expect(s.vakken.Frans).toBeUndefined();
    expect(s.dagen['2026-09-30'].perVak['Frans (2e klas)'].punten).toBe(20);
    expect(s.dagen['2026-09-30'].sessies[0]).toMatchObject({ vak: 'Frans (2e klas)', titel: 'Frans (2e klas) · H3' });
    expect(totalenPerVak(s).map((t) => t.vak)).toContain('Frans (2e klas)');
    expect(s.speler.puntenPerVak).toEqual({ 'Frans (2e klas)': 20 });
    // Ander vak blijft ongemoeid.
    expect(Object.values(s.woorden).filter((w) => w.vak === 'Duits')).toHaveLength(1);
  });

  it('opnieuw inladen onder de nieuwe naam vindt de bestaande woorden terug', () => {
    const s = hernoemVak(basis(), 'Frans', 'Français');
    const r = leesWerkboek(excel([['Nederlands', 'Frans'], ['de hond', 'le chien'], ['het huis', 'la maison']]));
    expect(vatSamen(naarRijen(r.paren, 'Français', 'H3'), s)).toEqual([{ vak: 'Français', toets: 'H3', nieuw: 1, bestaand: 1 }]);
  });

  it('alleen hoofdletters wijzigen mag', () => {
    const s = hernoemVak(basis(), 'Frans', 'FRANS');
    expect(Object.values(s.woorden).filter((w) => w.vak === 'FRANS')).toHaveLength(2);
  });

  it('weigert lege, dubbele of ongeldige namen', () => {
    const s = basis();
    expect(controleerVaknaam(s, 'Frans', '  ')).toMatch(/naam/);
    expect(controleerVaknaam(s, 'Frans', 'duits')).toMatch(/al een vak "Duits"/);
    expect(controleerVaknaam(s, 'Frans', 'a|b')).toMatch(/\|/);
    expect(controleerVaknaam(s, 'Frans', 'Frans 2')).toBeNull();
    expect(() => hernoemVak(s, 'Frans', 'Duits')).toThrow();
  });
});

describe('vak verwijderen', () => {
  it('haalt woorden, instellingen, punten en dagoverzicht van het vak weg', () => {
    const nu = new Date(2026, 8, 30, 15);
    let s = basis();
    const hund = Object.values(s.woorden).find((w) => w.vak === 'Duits')!.id;
    s = registreerAntwoord(s, { woordId: hund, richting: 'naarNL', goed: true, soort: 'meerkeuze' }, nu).state;
    s = sluitSessie(s, { uitslag: { titel: 'Duits · K1', vak: 'Duits', vorm: 'meerkeuze', goed: 1, totaal: 1, punten: 10, seconden: 5 } }, nu).state;

    const r = verwijderVak(s, 'Frans');
    expect(Object.values(r.woorden).map((w) => w.vak)).toEqual(['Duits']);
    expect(r.vakken.Frans).toBeUndefined();
    expect(r.vakken.Duits).toBeDefined();
    expect(r.speler.puntenPerVak).toEqual({ Duits: 10 });
    const dag = r.dagen['2026-09-30'];
    expect(Object.keys(dag.perVak)).toEqual(['Duits']);
    expect(dag.sessies.map((x) => x.vak)).toEqual(['Duits']);
    expect(dag).toMatchObject({ antwoorden: 1, goed: 1, punten: 10, seconden: 5 });
  });

  it('laat een dag waarop alleen dat vak geoefend is verdwijnen', () => {
    const r = verwijderVak(basis(), 'Frans');
    expect(r.dagen).toEqual({});
  });
});
