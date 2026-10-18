import { GEHAALD_GRENS, isGehaald } from '../shared/engine';
import { levelInfo, puntenVoorVak } from '../shared/xp';
import { useStore } from '../store';
import { Balk } from './ui';

/** Grote melding "Gehaald!" of "Niet gehaald" (grens 75%), met goed/fout/punten en de levelvoortgang van het vak. */
export function Samenvatting({ goed, totaal, punten, vak, extra }: { goed: number; totaal: number; punten: number; vak?: string; extra?: string }) {
  const { state } = useStore();
  const gehaald = isGehaald(goed, totaal);
  const pct = totaal ? Math.round((goed / totaal) * 100) : 0;
  const grensPct = Math.round(GEHAALD_GRENS * 100);
  const nogNodig = Math.max(0, Math.ceil(GEHAALD_GRENS * totaal) - goed);
  const info = vak ? levelInfo(puntenVoorVak(state.speler, vak)) : null;

  return (
    <div>
      <div
        className={`animate-pop rounded-2xl p-4 text-center ring-2 hoog:p-6 ${
          gehaald ? 'bg-emerald-500/15 ring-emerald-400/60' : 'bg-rose-500/15 ring-rose-400/60'
        }`}
      >
        <div className="text-4xl hoog:text-5xl">{gehaald ? '✅' : '❌'}</div>
        <div className={`mt-1 text-3xl font-black hoog:text-4xl ${gehaald ? 'text-emerald-300' : 'text-rose-300'}`}>
          {gehaald ? 'Gehaald!' : 'Niet gehaald'}
        </div>
        <div className="mt-1 text-lg text-slate-200">
          {pct}% goed · {gehaald ? `je had minimaal ${grensPct}% nodig` : `je hebt ${grensPct}% nodig`}
        </div>
        {!gehaald && totaal > 0 && (
          <div className="text-slate-400">
            Nog {nogNodig} {nogNodig === 1 ? 'antwoord' : 'antwoorden'} meer goed en je had het gehaald.
          </div>
        )}
        {extra && <div className="mt-1 font-semibold text-amber-300">{extra}</div>}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-emerald-500/15 p-3">
          <div className="text-2xl font-bold text-emerald-300 hoog:text-3xl">{goed}</div>
          <div className="text-slate-400">goed</div>
        </div>
        <div className="rounded-2xl bg-rose-500/15 p-3">
          <div className="text-2xl font-bold text-rose-300 hoog:text-3xl">{totaal - goed}</div>
          <div className="text-slate-400">fout</div>
        </div>
        <div className="rounded-2xl bg-indigo-500/15 p-3">
          <div className="text-2xl font-bold text-indigo-300 hoog:text-3xl">+{punten}</div>
          <div className="text-slate-400">punten</div>
        </div>
      </div>

      {info && (
      <div className="mt-4 rounded-2xl bg-slate-950/40 p-3 text-left ring-1 ring-slate-800">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-semibold">
            {vak} · level {info.level}
          </span>
          <span className="text-slate-400">
            nog {info.breedte - info.binnenLevel} punten tot level {info.level + 1}
          </span>
        </div>
        <Balk fractie={info.fractie} kleur="bg-gradient-to-r from-indigo-500 to-violet-400" />
      </div>
      )}
    </div>
  );
}
