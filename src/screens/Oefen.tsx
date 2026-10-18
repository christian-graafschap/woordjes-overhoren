import { useMemo, useRef, useState, type ReactElement } from 'react';
import { Samenvatting } from '../components/Samenvatting';
import { SchermKop, Terug } from '../components/ui';
import { Flashcards } from '../games/Flashcards';
import type { SpelProps } from '../games/gedeeld';
import { Koppel } from '../games/Koppel';
import { Meerkeuze } from '../games/Meerkeuze';
import { Tijdrace } from '../games/Tijdrace';
import { Typen } from '../games/Typen';
import type { Navigeer, SessieConfig } from '../navigatie';
import type { AntwoordInvoer, SessieAfsluiting } from '../shared/engine';
import type { Woord } from '../shared/types';
import { useStore } from '../store';

const SPELLEN = { flashcards: Flashcards, meerkeuze: Meerkeuze, typen: Typen, koppel: Koppel, tijdrace: Tijdrace };
const VORM_NAAM = { flashcards: 'Flashcards', meerkeuze: 'Meerkeuze', typen: 'Typen', koppel: 'Koppelspel', tijdrace: 'Tijdrace' };

interface Stats {
  goed: number;
  fout: number;
  xp: number;
  foutIds: Set<string>;
  tijdrace?: number;
}

export function Oefen({ ga, config }: { ga: Navigeer; config: SessieConfig }) {
  const store = useStore();
  const { state } = store;
  // Woordenlijst vastzetten bij de start van de sessie; voortgang wordt wel live bijgewerkt in de store.
  const [woorden] = useState<Woord[]>(() => config.woordIds.map((id) => state.woorden[id]).filter(Boolean));
  const reserve = useMemo(() => {
    const vakken = new Set(woorden.map((w) => w.vak));
    return Object.values(state.woorden).filter((w) => vakken.has(w.vak) && !config.woordIds.includes(w.id));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [stats, setStats] = useState<Stats>({ goed: 0, fout: 0, xp: 0, foutIds: new Set() });
  const [klaar, setKlaar] = useState(false);
  const recordVoor = useRef(state.speler.besteTijdrace);
  const start = useRef(Date.now());
  // Ook in een ref, zodat sluit() direct na het laatste antwoord de juiste stand ziet.
  const statsRef = useRef(stats);
  const registreer = (a: AntwoordInvoer) => {
    const g = store.antwoord(a);
    const s = statsRef.current;
    statsRef.current = {
      ...s,
      goed: s.goed + (a.goed ? 1 : 0),
      fout: s.fout + (a.goed ? 0 : 1),
      xp: s.xp + g.xp,
      foutIds: a.goed ? s.foutIds : new Set(s.foutIds).add(a.woordId),
    };
    setStats(statsRef.current);
    return g;
  };

  function sluit(info?: SessieAfsluiting) {
    const s = statsRef.current;
    store.sluitSessie({
      ...info,
      uitslag: {
        titel: config.titel,
        vak: woorden[0]?.vak,
        vorm: config.vorm,
        goed: s.goed,
        totaal: s.goed + s.fout,
        punten: s.xp,
        seconden: (Date.now() - start.current) / 1000,
      },
    });
    statsRef.current = { ...s, tijdrace: info?.tijdraceScore };
    setStats(statsRef.current);
    setKlaar(true);
  }

  if (woorden.length === 0) {
    return (
      <div className="kaart text-center">
        Geen woorden gevonden.{' '}
        <button className="knop-secundair knop-klein" onClick={() => ga({ naam: 'home' })}>
          Naar start
        </button>
      </div>
    );
  }

  if (klaar) {
    const totaal = stats.goed + stats.fout;
    const foutWoorden = [...stats.foutIds].map((id) => state.woorden[id]).filter(Boolean);
    const nieuwRecord = config.vorm === 'tijdrace' && (stats.tijdrace ?? 0) > recordVoor.current;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="kaart text-center">
          <h1 className="kop mb-3">
            {config.titel} <span className="text-lg font-normal text-slate-400">· {VORM_NAAM[config.vorm]}</span>
          </h1>
          <Samenvatting
            goed={stats.goed}
            totaal={totaal}
            punten={stats.xp}
            vak={woorden[0]?.vak}
            extra={
              config.vorm === 'tijdrace'
                ? `${stats.tijdrace ?? 0} goed in 60 seconden${nieuwRecord ? ' · nieuw record!' : ''}`
                : undefined
            }
          />
          {foutWoorden.length > 0 && (
            <div className="mt-6 text-left">
              <h2 className="mb-2 text-lg font-semibold text-slate-300">Nog even goed bekijken:</h2>
              <ul className="max-h-48 space-y-1 overflow-auto hoog:max-h-none">
                {foutWoorden.map((w) => (
                  <li key={w.id} className="flex justify-between rounded-xl bg-slate-800/60 px-4 py-2">
                    <span className="font-semibold">{w.vreemd}</span>
                    <span className="text-slate-300">{w.nederlands}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button className="knop-primair" onClick={() => ga({ naam: 'oefen', config })}>
              ↻ Nog een ronde
            </button>
            {foutWoorden.length > 0 && (
              <button className="knop-secundair" onClick={() => ga({ naam: 'oefen', config: { ...config, titel: `${config.titel} · fouten`, woordIds: foutWoorden.map((w) => w.id) } })}>
                Oefen de fouten
              </button>
            )}
            <button className="knop-secundair" onClick={() => ga({ naam: 'home' })}>
              Naar start
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Spel = SPELLEN[config.vorm] as (p: SpelProps) => ReactElement | null;
  return (
    <div>
      <SchermKop
        titel={config.titel}
        sub={VORM_NAAM[config.vorm]}
        links={<Terug tekst="Stoppen" onClick={() => (stats.goed + stats.fout > 0 ? sluit() : ga({ naam: 'home' }))} />}
        rechts={<div className="text-lg font-bold text-indigo-300">+{stats.xp} punten</div>}
      />
      <Spel config={config} woorden={woorden} reserve={reserve} state={state} registreer={registreer} klaar={sluit} />
    </div>
  );
}
