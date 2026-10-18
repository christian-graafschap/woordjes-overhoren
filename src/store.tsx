import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { haalState, opStatus, opWijzigingElders, planOpslaan, type OpslagStatus } from './api';
import { registreerAntwoord, sluitSessie as sluitSessieEngine, type AntwoordInvoer, type Gevolg, type SessieAfsluiting } from './shared/engine';
import { NIVEAU_INFO } from './shared/medailles';
import type { AppState } from './shared/types';
import { levelTitel, xpGrens } from './shared/xp';

export interface Melding {
  id: number;
  icoon: string;
  titel: string;
  tekst: string;
  soort: 'achievement' | 'medaille' | 'level' | 'info';
}

interface Store {
  state: AppState;
  opslag: OpslagStatus;
  update: (f: (s: AppState) => AppState) => void;
  antwoord: (a: AntwoordInvoer) => Gevolg;
  sluitSessie: (info?: SessieAfsluiting) => Gevolg;
  meldingen: Melding[];
  sluitMelding: (id: number) => void;
  melding: (m: Omit<Melding, 'id'>) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore buiten StoreProvider');
  return s;
}

let meldingTeller = 0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [opslag, setOpslag] = useState<OpslagStatus>('opgeslagen');
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const ref = useRef<AppState | null>(null);

  useEffect(() => {
    opStatus(setOpslag);
    haalState()
      .then(({ state: s, meldingen }) => {
        ref.current = s;
        setState(s);
        for (const tekst of meldingen) melding({ icoon: '⚠️', titel: 'Voortgang hersteld', tekst, soort: 'info' });
      })
      .catch((e) => setFout(e.message));
    // Oefent iemand in twee tabbladen tegelijk, dan neemt dit tabblad de nieuwste stand over.
    opWijzigingElders((s) => {
      ref.current = s;
      setState(s);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const zet = useCallback((s: AppState) => {
    ref.current = s;
    setState(s);
    planOpslaan(s);
  }, []);

  const melding = useCallback((m: Omit<Melding, 'id'>) => {
    const id = ++meldingTeller;
    setMeldingen((l) => [...l, { ...m, id }]);
    setTimeout(() => setMeldingen((l) => l.filter((x) => x.id !== id)), 5000);
  }, []);

  const toonGevolg = useCallback(
    (g: Gevolg) => {
      for (const m of g.nieuweMedailles) {
        const n = NIVEAU_INFO[m.niveau];
        melding({ icoon: n.icoon, titel: `${n.naam}: ${m.def.titel}`, tekst: m.def.uitleg, soort: 'medaille' });
      }
      for (const a of g.nieuweAchievements) {
        melding({ icoon: a.icoon, titel: `Achievement: ${a.titel}`, tekst: a.beschrijving, soort: 'achievement' });
      }
      if (g.levelUp) {
        const { vak, level } = g.levelUp;
        const titel = levelTitel(level);
        const tekst =
          titel !== levelTitel(level - 1)
            ? `Je bent nu ${titel} in ${vak}.`
            : `Voor level ${level + 1} in ${vak} heb je ${xpGrens(level + 1) - xpGrens(level)} punten nodig.`;
        melding({ icoon: '⬆️', titel: `${vak}: level ${level}!`, tekst, soort: 'level' });
      }
    },
    [melding],
  );

  const antwoord = useCallback(
    (a: AntwoordInvoer) => {
      const g = registreerAntwoord(ref.current!, a);
      zet(g.state);
      toonGevolg(g);
      return g;
    },
    [zet, toonGevolg],
  );

  const sluitSessie = useCallback(
    (info?: SessieAfsluiting) => {
      const g = sluitSessieEngine(ref.current!, info);
      zet(g.state);
      toonGevolg(g);
      return g;
    },
    [zet, toonGevolg],
  );

  const update = useCallback((f: (s: AppState) => AppState) => zet(f(ref.current!)), [zet]);
  const sluitMelding = useCallback((id: number) => setMeldingen((l) => l.filter((x) => x.id !== id)), []);

  if (fout) {
    return (
      <div className="mx-auto mt-24 max-w-xl kaart text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="kop mt-4">Voortgang kon niet worden geladen</h1>
        <p className="mt-4 text-slate-300">{fout}</p>
        <p className="mt-4 text-slate-400">
          De app bewaart je voortgang in deze browser. Staat het opslaan van websitegegevens uit, of gebruik je een privévenster? Zet het aan of open de app in
          een gewoon venster.
        </p>
        <button className="knop-primair mt-6" onClick={() => location.reload()}>
          Opnieuw proberen
        </button>
      </div>
    );
  }
  if (!state) {
    return <div className="mt-40 text-center text-2xl text-slate-400">Laden…</div>;
  }

  return (
    <Ctx.Provider value={{ state, opslag, update, antwoord, sluitSessie, meldingen, sluitMelding, melding }}>
      {children}
    </Ctx.Provider>
  );
}
