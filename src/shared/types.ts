// Datamodel van data/voortgang.json. Verhoog HUIDIGE_VERSIE en voeg een migratie toe
// in state.ts als het formaat verandert.

export const HUIDIGE_VERSIE = 3;

/** naarNL = vreemd woord zien, Nederlands antwoorden; naarVreemd = andersom. */
export type Richting = 'naarNL' | 'naarVreemd';
export type RichtingKeuze = Richting | 'gemengd';

export type Spelvorm = 'flashcards' | 'meerkeuze' | 'typen' | 'koppel' | 'tijdrace';

export interface RichtingVoortgang {
  goed: number;
  fout: number;
  /** Aantal keer goed op rij voor dit woord in deze richting. */
  reeks: number;
  /** Leitner-bakje 1..5. */
  bakje: number;
  /** ISO-tijdstip van laatste keer geoefend. */
  laatst: string | null;
}

export interface Woord {
  id: string;
  vak: string;
  toets: string;
  vreemd: string;
  nederlands: string;
  /** Extra geldige antwoorden in de vreemde taal (richting naarVreemd). */
  altVreemd: string[];
  /** Extra geldige antwoorden in het Nederlands (richting naarNL). */
  altNederlands: string[];
  toegevoegd: string;
  voortgang: Record<Richting, RichtingVoortgang>;
}

export interface VakInstellingen {
  /** Taalcode voor lidwoorden (fr, de, en, es, it) of '' als onbekend. */
  taal: string;
  /** Hoofdletters tellen mee bij antwoorden in de vreemde taal (Duits). */
  hoofdlettersBelangrijk: boolean;
  accenten: 'streng' | 'soepel';
  /** Knopjes met speciale tekens onder het invoerveld. */
  tekens: string[];
}

export interface Speler {
  /** Vaknaam → verdiende punten (xp). Level en punten worden per vak bijgehouden. */
  puntenPerVak: Record<string, number>;
  streakDagen: number;
  /** Lokale datum JJJJ-MM-DD. */
  laatsteOefendag: string | null;
  /** Huidige reeks goed op rij (over alle spelvormen). */
  huidigeReeks: number;
  langsteReeks: number;
  /** Huidige reeks goed getypte antwoorden zonder fout. */
  typReeks: number;
  langsteTypReeks: number;
  totaalGoed: number;
  totaalFout: number;
  sessies: number;
  besteTijdrace: number;
  besteCijfer: number;
  doorzetters: number;
  perfecteKoppels: number;
  /** Meeste goede antwoorden in één sessie. */
  besteSessieGoed: number;
  /** Aantal sessies met 75% of meer goed. */
  sessiesGehaald: number;
}

export interface Instellingen {
  sessieGrootte: number;
  /** Naam van de speler, rechtsboven getoond. */
  naam: string;
}

export type SessieVorm = Spelvorm | 'proeftoets';

/** Verslag van één afgeronde sessie, voor het dagoverzicht. */
export interface SessieVerslag {
  /** ISO-tijdstip van afronden. */
  tijd: string;
  /** Bijv. "Frans · H3". */
  titel: string;
  vak?: string;
  vorm: SessieVorm;
  goed: number;
  totaal: number;
  punten: number;
  seconden: number;
  /** 75% of meer goed. */
  gehaald: boolean;
  /** Alleen bij een proeftoets. */
  cijfer?: number;
}

export interface VakTelling {
  antwoorden: number;
  goed: number;
  punten: number;
}

export interface DagStatistiek {
  antwoorden: number;
  goed: number;
  punten: number;
  seconden: number;
  sessies: SessieVerslag[];
  /** Dezelfde tellingen, uitgesplitst per vak. */
  perVak: Record<string, VakTelling>;
}

export type MedailleNiveau = 'brons' | 'zilver' | 'goud' | 'platina';

export interface AppState {
  versie: number;
  woorden: Record<string, Woord>;
  vakken: Record<string, VakInstellingen>;
  speler: Speler;
  /** Achievement-id → ISO-tijdstip waarop behaald. */
  achievements: Record<string, string>;
  /** Medaille-id → niveau → ISO-tijdstip waarop behaald. */
  medailles: Record<string, Partial<Record<MedailleNiveau, string>>>;
  /** Lokale datum JJJJ-MM-DD → wat er die dag geoefend is. */
  dagen: Record<string, DagStatistiek>;
  instellingen: Instellingen;
}
