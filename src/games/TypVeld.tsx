import { useEffect, useRef, useState } from 'react';
import { SpecialeTekens } from '../components/SpecialeTekens';
import { Diff } from '../components/ui';
import type { Beoordeling } from '../shared/grading';

/**
 * Invoerveld met speciale-tekenknoppen. Enter = nakijken, maar alleen als er iets is ingevuld:
 * een leeg antwoord (of alleen spaties) wordt niet doorgegeven.
 */
export function TypVeld({ tekens, onNakijken, uit = false }: { tekens: string[]; onNakijken: (tekst: string) => void; uit?: boolean }) {
  const [tekst, setTekst] = useState('');
  const [leegGeprobeerd, setLeegGeprobeerd] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const leeg = tekst.trim() === '';
  useEffect(() => {
    if (!uit) ref.current?.focus();
  }, [uit]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (uit) return;
        if (leeg) {
          // Teller in plaats van boolean, zodat de schud-animatie bij elke poging opnieuw afspeelt.
          setLeegGeprobeerd((n) => n + 1);
          ref.current?.focus();
          return;
        }
        onNakijken(tekst);
        setTekst('');
        setLeegGeprobeerd(0);
      }}
    >
      <div className="flex gap-3">
        <input
          key={leegGeprobeerd}
          ref={ref}
          className={`invoer ${leegGeprobeerd > 0 && leeg ? 'animate-shake ring-amber-400' : ''}`}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => {
            // Met een uitgeschakelde knop verstuurt de browser het formulier niet; dan hier de melding tonen.
            if (e.key === 'Enter' && leeg) {
              e.preventDefault();
              setLeegGeprobeerd((n) => n + 1);
            }
          }}
          disabled={uit}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Typ je antwoord…"
          aria-invalid={leegGeprobeerd > 0 && leeg}
        />
        <button className="knop-primair shrink-0" disabled={uit || leeg}>
          Nakijken ⏎
        </button>
      </div>
      {leegGeprobeerd > 0 && leeg && !uit && <div className="mt-2 text-sm font-semibold text-amber-300">Typ eerst een antwoord.</div>}
      {!uit && <SpecialeTekens tekens={tekens} invoer={ref} waarde={tekst} zet={setTekst} />}
    </form>
  );
}

/** Feedback na nakijken: goed/fout, melding en gemarkeerde verschillen. */
export function TypFeedback({ b, invoer, xp }: { b: Beoordeling; invoer: string; xp?: number }) {
  const goed = b.uitslag === 'goed';
  return (
    <div
      className={`mt-4 animate-pop rounded-2xl p-4 ring-2 hoog:p-5 ${
        goed ? 'bg-emerald-500/15 ring-emerald-500/50' : b.uitslag === 'lidwoordFout' ? 'bg-amber-500/15 ring-amber-500/50' : 'animate-shake bg-rose-500/15 ring-rose-500/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold hoog:text-2xl">
          {goed ? '✓ Goed!' : b.uitslag === 'lidwoordFout' ? '½ Bijna!' : '✗ Helaas'}
        </div>
        {!!xp && <div className="text-lg font-bold text-indigo-300">+{xp} punten</div>}
      </div>
      {b.melding && <div className="mt-1 text-lg">{b.melding}</div>}
      {!goed && (
        <div className="mt-2 space-y-1 text-lg hoog:text-xl">
          {invoer.trim() && (
            <div>
              <span className="inline-block w-36 text-base text-slate-400">Jouw antwoord:</span>
              <Diff delen={b.diffInvoer} soort="invoer" />
            </div>
          )}
          <div>
            <span className="inline-block w-36 text-base text-slate-400">Juist:</span>
            <Diff delen={b.diffJuist} soort="juist" />
          </div>
        </div>
      )}
    </div>
  );
}
