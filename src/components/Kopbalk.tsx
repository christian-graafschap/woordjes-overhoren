import { ACHIEVEMENTS } from '../shared/achievements';
import { useStore } from '../store';
import { datumString } from '../shared/state';
import { VakLevel } from './VakLevel';

interface Props {
  /** Vak waar de speler nu mee bezig is; daarvan staat het level in de balk. */
  vak?: string;
  naarHome: () => void;
  naarAchievements: () => void;
  naarInstellingen: () => void;
  naarProfiel: () => void;
}

export function Kopbalk({ vak, naarHome, naarAchievements, naarInstellingen, naarProfiel }: Props) {
  const { state, opslag } = useStore();
  const vandaagGeoefend = state.speler.laatsteOefendag === datumString();
  const aantalPrijzen =
    Object.keys(state.achievements).filter((id) => ACHIEVEMENTS.some((a) => a.id === id)).length +
    Object.values(state.medailles).reduce((n, m) => n + Object.keys(m).length, 0);
  const naam = state.instellingen.naam.trim();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2 hoog:gap-5 hoog:px-6 hoog:py-3">
        <button onClick={naarHome} className="text-xl font-black tracking-tight hoog:text-2xl">
          🧠 <span className="bg-gradient-to-r from-indigo-300 to-emerald-300 bg-clip-text text-transparent">Overhoren</span>
        </button>

        <div className="flex min-w-0 flex-1 items-center">{vak && <VakLevel vak={vak} toonVak />}</div>

        <div
          className={`flex items-center gap-1 rounded-xl px-3 py-2 text-lg font-bold ${vandaagGeoefend ? 'bg-orange-500/15 text-orange-300' : 'bg-slate-800 text-slate-500'}`}
          title={vandaagGeoefend ? 'Vandaag al geoefend' : 'Oefen vandaag om je streak te houden'}
        >
          🔥 <span className="tabular-nums">{state.speler.streakDagen}</span>
        </div>
        <button onClick={naarAchievements} className="rounded-xl bg-slate-800 px-3 py-2 text-lg font-bold hover:bg-slate-700" title="Prijzenkast: medailles en achievements">
          🏆 <span className="tabular-nums">{aantalPrijzen}</span>
        </button>
        <button onClick={naarInstellingen} className="rounded-xl bg-slate-800 px-3 py-2 text-lg hover:bg-slate-700" title="Instellingen">
          ⚙️
        </button>
        <button
          onClick={naarProfiel}
          className="flex max-w-40 items-center gap-2 rounded-xl bg-indigo-500/20 px-3 py-2 font-semibold text-indigo-100 ring-1 ring-indigo-400/40 hover:bg-indigo-500/35"
          title="Jouw profiel: per dag hoeveel je geoefend hebt"
        >
          <span>👤</span>
          <span className="truncate">{naam || 'Naam instellen'}</span>
        </button>
        <span
          className={`w-5 text-center text-sm ${opslag === 'fout' ? 'text-rose-400' : opslag === 'bezig' ? 'text-slate-500' : 'text-emerald-400'}`}
          title={opslag === 'fout' ? 'Opslaan mislukt, wordt opnieuw geprobeerd' : opslag === 'bezig' ? 'Opslaan…' : 'Alles opgeslagen'}
        >
          {opslag === 'fout' ? '⚠' : opslag === 'bezig' ? '•' : '✓'}
        </span>
      </div>
    </header>
  );
}
