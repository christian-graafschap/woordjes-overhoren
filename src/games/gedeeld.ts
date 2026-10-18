import { useMemo, useReducer, useState } from 'react';
import type { SessieConfig } from '../navigatie';
import type { AntwoordInvoer, Gevolg, SessieAfsluiting } from '../shared/engine';
import { maakSessie, SessieWachtrij } from '../shared/leitner';
import type { AppState, Woord } from '../shared/types';

export interface SpelProps {
  config: SessieConfig;
  /** Woorden van deze sessie (geselecteerde toetsen). */
  woorden: Woord[];
  /** Reservewoorden voor meerkeuze-afleiders: hetzelfde vak. */
  reserve: Woord[];
  state: AppState;
  registreer: (a: AntwoordInvoer) => Gevolg;  klaar: (info?: SessieAfsluiting) => void;
}

/** Sessie met Leitner-selectie en herhaalwachtrij; rendert opnieuw na elk antwoord. */
export function useSessie(woorden: Woord[], config: SessieConfig, grootte: number) {
  const [wachtrij] = useState(() => new SessieWachtrij(maakSessie(woorden, config.richting, grootte)));
  const [, herteken] = useReducer((x: number) => x + 1, 0);
  const vraag = wachtrij.huidige;
  const woord = useMemo(() => (vraag ? woorden.find((w) => w.id === vraag.woordId) : undefined), [vraag, woorden]);
  return {
    wachtrij,
    vraag,
    woord,
    volgende(goed: boolean) {
      wachtrij.antwoord(goed);
      herteken();
    },
  };
}
