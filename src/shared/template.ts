import * as XLSX from 'xlsx';

/** Voorbeeldbestand: één vak, één toets, twee kolommen (de talen). */
export const TEMPLATE_BESTANDSNAAM = 'frans_voorbeeld.xlsx';

const WOORDEN: [string, string][] = [
  ['de hond', 'le chien'],
  ['de kat', 'le chat'],
  ['het huis', 'la maison'],
  ['de school', "l'école"],
  ['het boek', 'le livre'],
  ['de auto', 'la voiture'],
  ['de fiets', 'le vélo'],
  ['het meisje', 'la fille'],
  ['de jongen', 'le garçon'],
  ['de vriend', "l'ami"],
  ['het brood', 'le pain'],
  ['de kaas', 'le fromage'],
  ['kopen', 'acheter'],
  ['eten', 'manger'],
  ['drinken', 'boire'],
  ['spreken', 'parler'],
  ['vandaag', "aujourd'hui"],
  ['morgen', 'demain'],
  ['mooi', 'beau'],
  ['groot', 'grand'],
];

export function maakTemplate(): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet([['Nederlands', 'Frans'], ...WOORDEN]);
  ws['!cols'] = [{ wch: 24 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Woorden');
  return wb;
}

export function downloadTemplate(): void {
  XLSX.writeFile(maakTemplate(), TEMPLATE_BESTANDSNAAM);
}
