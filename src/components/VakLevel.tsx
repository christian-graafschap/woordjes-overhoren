import { levelInfo, levelTitel, puntenVoorVak } from '../shared/xp';
import { useStore } from '../store';
import { Balk } from './ui';

/** Level van één vak met een balk naar het volgende level. Met toonVak staat de vaknaam erbij. */
export function VakLevel({ vak, toonVak = false }: { vak: string; toonVak?: boolean }) {
  const { state } = useStore();
  const info = levelInfo(puntenVoorVak(state.speler, vak));
  const titel = levelTitel(info.level);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3" title={`Nog ${info.breedte - info.binnenLevel} punten tot level ${info.level + 1} in ${vak}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-lg font-black shadow-lg shadow-indigo-500/30">
        {info.level}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2 text-sm">
          <span className="truncate font-semibold text-slate-200">{toonVak ? `${vak} · ${titel}` : titel}</span>
          <span className="shrink-0 tabular-nums text-slate-400">
            {info.binnenLevel} / {info.breedte} punten
          </span>
        </div>
        <Balk fractie={info.fractie} kleur="bg-gradient-to-r from-indigo-500 to-violet-400" hoogte="h-2.5" />
      </div>
    </div>
  );
}
