import type { RefObject } from 'react';

/** Knopjes die een speciaal teken invoegen op de cursorpositie van het invoerveld. */
export function SpecialeTekens({
  tekens,
  invoer,
  waarde,
  zet,
}: {
  tekens: string[];
  invoer: RefObject<HTMLInputElement | null>;
  waarde: string;
  zet: (w: string) => void;
}) {
  if (tekens.length === 0) return null;
  const voegIn = (t: string) => {
    const el = invoer.current;
    const start = el?.selectionStart ?? waarde.length;
    const eind = el?.selectionEnd ?? waarde.length;
    zet(waarde.slice(0, start) + t + waarde.slice(eind));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + t.length, start + t.length);
    });
  };
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {tekens.map((t) => (
        <button
          key={t}
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => voegIn(t)}
          className="h-10 w-10 rounded-xl bg-slate-800 text-lg hoog:h-12 hoog:w-12 hoog:text-xl font-semibold ring-1 ring-slate-700 hover:bg-slate-700 active:scale-95"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
