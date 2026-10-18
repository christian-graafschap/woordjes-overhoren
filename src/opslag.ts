// Voortgang bewaren in de browser (localStorage). Elke browser op elk apparaat heeft zijn eigen
// voortgang; er gaat niets naar een server. Naast het hoofdbestand houden we een paar dagelijkse
// reservekopieën bij, zodat een beschadigde opslag hersteld kan worden.

import { datumString, legeState, migreer } from './shared/state';
import type { AppState } from './shared/types';

/** Het deel van de Web Storage API dat we gebruiken; in tests te vervangen door een nepopslag. */
export type SleutelOpslag = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export const MAX_BACKUPS = 3;
export const SLEUTEL = 'overhoren:voortgang';
const BACKUP_PREFIX = 'overhoren:backup:';
const BESCHADIGD_PREFIX = 'overhoren:beschadigd:';

export class BrowserOpslag {
  constructor(private readonly opslag: SleutelOpslag) {}

  /**
   * Leest de voortgang. Ontbreekt die, dan een lege begintoestand. Is ze onleesbaar, dan wordt ze
   * apart bewaard en hersteld uit de nieuwste reservekopie. Maakt daarna de reservekopie van vandaag.
   * Geeft de state en eventuele meldingen voor de speler terug.
   */
  laad(vandaag: string = datumString()): { state: AppState; meldingen: string[] } {
    const meldingen: string[] = [];
    let state: AppState;
    const tekst = this.opslag.getItem(SLEUTEL);
    if (tekst === null) {
      state = legeState();
    } else {
      try {
        state = migreer(JSON.parse(tekst));
      } catch (e: any) {
        this.zet(`${BESCHADIGD_PREFIX}${new Date().toISOString()}`, tekst);
        const herstel = this.herstelUitBackup();
        state = herstel?.state ?? legeState();
        meldingen.push(
          herstel
            ? `Je voortgang was beschadigd (${e.message}). Hersteld uit de reservekopie van ${herstel.dag}.`
            : `Je voortgang was beschadigd (${e.message}) en er was geen reservekopie. Zet zo nodig een gedownloade back-up terug.`,
        );
      }
    }
    this.schrijf(state);
    this.maakBackup(vandaag);
    return { state, meldingen };
  }

  /** Schrijft de voortgang. Gooit een fout als de browser niets meer kan opslaan (bijv. opslag vol). */
  schrijf(state: AppState): void {
    this.zet(SLEUTEL, JSON.stringify(migreer(state)));
  }

  /** Reservekopie van vandaag (één per dag); alleen de nieuwste MAX_BACKUPS blijven bewaard. */
  maakBackup(vandaag: string = datumString()): void {
    const tekst = this.opslag.getItem(SLEUTEL);
    if (tekst === null) return;
    try {
      this.zet(BACKUP_PREFIX + vandaag, tekst);
    } catch {
      // Geen ruimte voor een extra kopie: niet erg, de voortgang zelf is wel opgeslagen.
    }
    for (const oud of this.backups().slice(MAX_BACKUPS)) this.opslag.removeItem(BACKUP_PREFIX + oud);
  }

  /** Datums (JJJJ-MM-DD) van de reservekopieën in de browser, nieuwste eerst. */
  backups(): string[] {
    return this.sleutels()
      .filter((k) => k.startsWith(BACKUP_PREFIX))
      .map((k) => k.slice(BACKUP_PREFIX.length))
      .sort()
      .reverse();
  }

  private herstelUitBackup(): { state: AppState; dag: string } | null {
    for (const dag of this.backups()) {
      try {
        return { state: migreer(JSON.parse(this.opslag.getItem(BACKUP_PREFIX + dag)!)), dag };
      } catch {
        // Ook deze kopie is onleesbaar; probeer de volgende.
      }
    }
    return null;
  }

  private sleutels(): string[] {
    return Array.from({ length: this.opslag.length }, (_, i) => this.opslag.key(i)).filter((k): k is string => k !== null);
  }

  private zet(sleutel: string, waarde: string): void {
    try {
      this.opslag.setItem(sleutel, waarde);
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError') throw new Error('De opslag van deze browser is vol');
      throw e;
    }
  }
}

/** Leest een gedownload voortgangsbestand in. Gooit een fout als het geen geldige voortgang is. */
export function leesVoortgangBestand(tekst: string): AppState {
  let ruw: unknown;
  try {
    ruw = JSON.parse(tekst);
  } catch {
    throw new Error('Dit is geen voortgangsbestand (geen geldige JSON).');
  }
  if (typeof ruw !== 'object' || ruw === null || typeof (ruw as any).woorden !== 'object') {
    throw new Error('Dit is geen voortgangsbestand van Overhoren.');
  }
  return migreer(ruw);
}
