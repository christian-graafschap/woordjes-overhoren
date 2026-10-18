import { useEffect, useMemo, useRef, useState } from 'react';
import { RichtingLabel, useToets, Voortgangsteller } from '../components/ui';
import { antwoordTekst, maakOpties, vraagTekst } from '../shared/vragen';
import { useSessie, type SpelProps } from './gedeeld';

export function OptieKnoppen({
  opties,
  juist,
  gekozen,
  kies,
}: {
  opties: string[];
  juist: string;
  gekozen: string | null;
  kies: (o: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {opties.map((o, i) => {
        const stijl = !gekozen
          ? 'bg-slate-800 hover:bg-slate-700 ring-slate-700'
          : o === juist
            ? 'bg-emerald-500/25 ring-emerald-400'
            : o === gekozen
              ? 'bg-rose-500/25 ring-rose-400 animate-shake'
              : 'bg-slate-800/50 ring-slate-800 opacity-50';
        return (
          <button
            key={o + i}
            disabled={!!gekozen}
            onClick={() => kies(o)}
            className={`antwoordknop flex items-center gap-3 text-left ${stijl}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950/50 text-base text-slate-400">{i + 1}</span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Meerkeuze({ config, woorden, reserve, state, registreer, klaar }: SpelProps) {
  const s = useSessie(woorden, config, state.instellingen.sessieGrootte);
  const [gekozen, setGekozen] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (s.wachtrij.klaar) klaar();
  }, [s.vraag]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);

  const opties = useMemo(
    () => (s.woord && s.vraag ? maakOpties(s.woord, s.vraag.richting, woorden, reserve) : []),
    [s.wachtrij.gedaan, s.woord], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const juist = s.woord && s.vraag ? antwoordTekst(s.woord, s.vraag.richting) : '';

  function kies(o: string) {
    if (gekozen || !s.vraag) return;
    setGekozen(o);
    const goed = o === juist;
    const g = registreer({ woordId: s.vraag.woordId, richting: s.vraag.richting, goed, soort: 'meerkeuze', herhaling: s.vraag.herhaling });
    setXp(g.xp);
    if (goed) timer.current = setTimeout(() => verder(true), 700);
  }

  function verder(goed = gekozen === juist) {
    clearTimeout(timer.current);
    setGekozen(null);
    setXp(0);
    s.volgende(goed);
  }

  useToets(
    (e) => {
      const n = Number(e.key);
      if (!gekozen && n >= 1 && n <= opties.length) kies(opties[n - 1]);
      else if (gekozen && gekozen !== juist && e.key === 'Enter') verder(false);
    },
    [gekozen, opties],
  );

  if (!s.vraag || !s.woord) return null;
  const { woord, vraag } = s;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <RichtingLabel vak={woord.vak} richting={vraag.richting} />
        <Voortgangsteller gedaan={s.wachtrij.gedaan} totaal={s.wachtrij.totaal} />
      </div>
      <div className="kaart vraagkaart mb-4">
        {vraag.herhaling && <div className="mb-2 text-sm text-amber-300">↻ nog een keer</div>}
        <div className="vraagtekst">{vraagTekst(woord, vraag.richting)}</div>
        <div className="mt-2 h-6 text-lg font-bold text-indigo-300">{xp > 0 && `+${xp} punten`}</div>
      </div>
      <OptieKnoppen opties={opties} juist={juist} gekozen={gekozen} kies={kies} />
      {gekozen && gekozen !== juist && (
        <div className="mt-4 flex justify-end">
          <button className="knop-primair" onClick={() => verder(false)}>
            Verder ⏎
          </button>
        </div>
      )}
    </div>
  );
}
