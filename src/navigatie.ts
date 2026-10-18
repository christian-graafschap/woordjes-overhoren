import type { RichtingKeuze, Spelvorm } from './shared/types';

export interface SessieConfig {
  titel: string;
  woordIds: string[];
  richting: RichtingKeuze;
  vorm: Spelvorm;
  /** Alleen bij tijdrace: hoe er geantwoord wordt. */
  tijdraceModus?: 'meerkeuze' | 'typen';
}

export type Scherm =
  | { naam: 'home' }
  | { naam: 'import' }
  | { naam: 'kies'; vak?: string; toetsen?: string[]; woordIds?: string[]; titel?: string }
  | { naam: 'oefen'; config: SessieConfig }
  | { naam: 'overzicht'; vak: string; toets: string }
  | { naam: 'proeftoets'; woordIds: string[]; titel: string }
  | { naam: 'achievements' }
  | { naam: 'instellingen' }
  | { naam: 'profiel' };

export type Navigeer = (s: Scherm) => void;
