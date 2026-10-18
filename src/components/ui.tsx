import { useEffect, type ReactNode } from 'react';
import type { DiffDeel } from '../shared/grading';

export function Balk({ fractie, kleur = 'bg-indigo-500', hoogte = 'h-3' }: { fractie: number; kleur?: string; hoogte?: string }) {
  const pct = Math.max(0, Math.min(1, fractie)) * 100;
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-800 ${hoogte}`}>
      <div className={`${hoogte} ${kleur} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Terug({ onClick, tekst = 'Terug' }: { onClick: () => void; tekst?: string }) {
  return (
    <button className="knop-secundair knop-klein" onClick={onClick}>
      ← {tekst}
    </button>
  );
}

export function SchermKop({ titel, sub, links, rechts }: { titel: string; sub?: ReactNode; links?: ReactNode; rechts?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 hoog:mb-6">
      {links}
      <div className="min-w-0 flex-1">
        <h1 className="kop truncate">{titel}</h1>
        {sub && <div className="mt-1 text-slate-400">{sub}</div>}
      </div>
      {rechts}
    </div>
  );
}

/** Tekst met de afwijkende stukken gemarkeerd. */
export function Diff({ delen, soort }: { delen: DiffDeel[]; soort: 'invoer' | 'juist' }) {
  return (
    <span className="font-mono">
      {delen.map((d, i) =>
        d.anders ? (
          <span
            key={i}
            className={
              soort === 'invoer'
                ? 'rounded bg-rose-500/30 text-rose-200 line-through decoration-rose-400'
                : 'rounded bg-emerald-500/30 px-0.5 text-emerald-200 underline decoration-emerald-400 decoration-2'
            }
          >
            {d.tekst.replace(/ /g, '␣')}
          </span>
        ) : (
          <span key={i}>{d.tekst}</span>
        ),
      )}
    </span>
  );
}

/** Voert f uit bij een toetsaanslag; negeert toetsen in invoervelden tenzij `ookInInvoer`. */
export function useToets(f: (e: KeyboardEvent) => void, deps: unknown[], ookInInvoer = false) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!ookInInvoer && t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      // Enter/spatie op een knop met focus klikt die knop al; niet dubbel afhandelen.
      if (t?.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        t.blur();
        f(e);
        return;
      }
      f(e);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function Voortgangsteller({ gedaan, totaal }: { gedaan: number; totaal: number }) {
  return (
    <div className="flex items-center gap-3 text-slate-400">
      <div className="w-40">
        <Balk fractie={totaal ? gedaan / totaal : 0} kleur="bg-emerald-500" hoogte="h-2" />
      </div>
      <span className="tabular-nums">
        {gedaan}/{totaal}
      </span>
    </div>
  );
}

export function RichtingLabel({ vak, richting }: { vak: string; richting: 'naarNL' | 'naarVreemd' }) {
  return (
    <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
      {richting === 'naarNL' ? `${vak} → Nederlands` : `Nederlands → ${vak}`}
    </span>
  );
}
