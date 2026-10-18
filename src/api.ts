import { BrowserOpslag, SLEUTEL } from './opslag';
import { datumString, migreer } from './shared/state';
import type { AppState } from './shared/types';

export type OpslagStatus = 'opgeslagen' | 'bezig' | 'fout';

const LAATSTE_DOWNLOAD = 'overhoren:laatste-download';

let opslag: BrowserOpslag | null = null;

function browserOpslag(): BrowserOpslag {
  // localStorage opvragen kan een fout geven als de browser opslag blokkeert.
  opslag ??= new BrowserOpslag(window.localStorage);
  return opslag;
}

export async function haalState(): Promise<{ state: AppState; meldingen: string[] }> {
  const uit = browserOpslag().laad();
  // Vraag de browser de voortgang niet zelf op te ruimen als de schijf vol raakt.
  navigator.storage?.persist?.().catch(() => {});
  return uit;
}

const VERTRAGING_MS = 300;
let timer: ReturnType<typeof setTimeout> | null = null;
let wachtend: AppState | null = null;
let statusLuisteraar: (s: OpslagStatus) => void = () => {};

export function opStatus(f: (s: OpslagStatus) => void) {
  statusLuisteraar = f;
}

function schrijfNu(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!wachtend) return;
  const state = wachtend;
  try {
    browserOpslag().schrijf(state);
    if (wachtend === state) wachtend = null;
    statusLuisteraar('opgeslagen');
  } catch {
    // Opnieuw proberen; intussen blijft de nieuwste stand wachten.
    statusLuisteraar('fout');
    timer = setTimeout(schrijfNu, 3000);
  }
}

/** Gebundeld opslaan: wacht even, zodat snel achter elkaar beantwoorde woorden één schrijfactie worden. */
export function planOpslaan(state: AppState): void {
  wachtend = state;
  statusLuisteraar('bezig');
  if (timer) clearTimeout(timer);
  timer = setTimeout(schrijfNu, VERTRAGING_MS);
}

/** Bestandsnaam met datum en tijd, bijv. voortgang-2026-10-18-140509.json. */
function bestandsnaam(soort: string, nu: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${soort}-${datumString(nu)}-${p(nu.getHours())}${p(nu.getMinutes())}${p(nu.getSeconds())}.json`;
}

function download(naam: string, tekst: string): void {
  const url = URL.createObjectURL(new Blob([tekst], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Biedt de voortgang aan als download en onthoudt wanneer dat was. Geeft de bestandsnaam terug. */
export function downloadVoortgang(state: AppState, soort = 'voortgang'): string {
  const naam = bestandsnaam(soort);
  download(naam, JSON.stringify(migreer(state), null, 2));
  try {
    localStorage.setItem(LAATSTE_DOWNLOAD, new Date().toISOString());
  } catch {
    // Alleen een geheugensteuntje; niet erg als dit niet lukt.
  }
  return naam;
}

/** ISO-tijdstip van de laatste download van de voortgang, of null. */
export function laatsteDownload(): string | null {
  try {
    return localStorage.getItem(LAATSTE_DOWNLOAD);
  } catch {
    return null;
  }
}

/**
 * Slaat de huidige stand direct op en biedt een reservekopie als download aan.
 * Gebruikt vlak voor een reset of het verwijderen van een vak; geeft de bestandsnaam terug.
 */
export async function backupVoorReset(huidig: AppState): Promise<string> {
  wachtend = huidig;
  schrijfNu();
  if (wachtend) throw new Error('Opslaan mislukt');
  return downloadVoortgang(huidig, 'voortgang-voor-reset');
}

/** Roept f aan als de voortgang in een ander tabblad van dezelfde browser is gewijzigd. */
export function opWijzigingElders(f: (s: AppState) => void): void {
  window.addEventListener('storage', (e) => {
    if (e.key !== SLEUTEL || e.newValue === null) return;
    try {
      f(migreer(JSON.parse(e.newValue)));
    } catch {
      // Half of onleesbaar geschreven: negeren, het volgende event komt vanzelf.
    }
  });
}

/** Direct wegschrijven bij het sluiten of verbergen van het venster. */
export function flushNu(): void {
  if (wachtend) schrijfNu();
}

window.addEventListener('pagehide', flushNu);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushNu();
});
