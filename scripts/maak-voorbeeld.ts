// Schrijft het voorbeeldbestand (dezelfde inhoud als de downloadknop in de app).
// Gebruik: npx tsx scripts/maak-voorbeeld.ts
import * as XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';
import { maakTemplate, TEMPLATE_BESTANDSNAAM } from '../src/shared/template.ts';

writeFileSync(TEMPLATE_BESTANDSNAAM, XLSX.write(maakTemplate(), { type: 'buffer', bookType: 'xlsx' }));
console.log(`${TEMPLATE_BESTANDSNAAM} aangemaakt`);
