import { useEffect, useRef, useState } from 'react';
import { RichtingLabel, useToets, Voortgangsteller } from '../components/ui';
import { beoordeel, geldigeAntwoorden, optiesVoor, type Beoordeling } from '../shared/grading';
import { standaardVakInstellingen } from '../shared/state';
import { vraagTekst } from '../shared/vragen';
import { useSessie, type SpelProps } from './gedeeld';
import { TypFeedback, TypVeld } from './TypVeld';

export function Typen({ config, woorden, state, registreer, klaar }: SpelProps) {
  const s = useSessie(woorden, config, state.instellingen.sessieGrootte);
  const [feedback, setFeedback] = useState<{ b: Beoordeling; invoer: string; xp: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (s.wachtrij.klaar) klaar();
  }, [s.vraag]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);

  const vak = s.woord ? (state.vakken[s.woord.vak] ?? standaardVakInstellingen(s.woord.vak)) : null;

  function nakijken(invoer: string) {
    if (!s.vraag || !s.woord || !vak) return;
    const b = beoordeel(invoer, geldigeAntwoorden(s.woord, s.vraag.richting), optiesVoor(s.vraag.richting, vak));
    const goed = b.uitslag === 'goed';
    const g = registreer({ woordId: s.vraag.woordId, richting: s.vraag.richting, goed, soort: 'typen', herhaling: s.vraag.herhaling });
    setFeedback({ b, invoer, xp: g.xp });
    // Goed zonder opmerking: automatisch door. Anders wachten tot de speler verder klikt.
    if (goed && !b.melding) timer.current = setTimeout(() => verder(true), 900);
  }

  function verder(goed = feedback?.b.uitslag === 'goed') {
    clearTimeout(timer.current);
    setFeedback(null);
    s.volgende(goed);
  }

  useToets(
    (e) => {
      if (feedback && e.key === 'Enter') {
        e.preventDefault();
        verder();
      }
    },
    [feedback],
  );

  if (!s.vraag || !s.woord || !vak) return null;
  const { woord, vraag } = s;
  const tekens = vraag.richting === 'naarVreemd' ? vak.tekens : [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <RichtingLabel vak={woord.vak} richting={vraag.richting} />
        <Voortgangsteller gedaan={s.wachtrij.gedaan} totaal={s.wachtrij.totaal} />
      </div>

      <div className="kaart vraagkaart mb-4">
        {vraag.herhaling && <div className="mb-1 text-sm text-amber-300">↻ nog een keer</div>}
        <div className="vraagtekst">{vraagTekst(woord, vraag.richting)}</div>
        {vraag.richting === 'naarVreemd' && vak.hoofdlettersBelangrijk && (
          <div className="mt-2 text-sm text-slate-500">Hoofdletters tellen mee</div>
        )}
      </div>

      <TypVeld key={`${s.wachtrij.gedaan}`} tekens={tekens} onNakijken={nakijken} uit={!!feedback} />

      {feedback && (
        <>
          <TypFeedback b={feedback.b} invoer={feedback.invoer} xp={feedback.xp} />
          <div className="mt-3 flex justify-end">
            <button className="knop-primair" onClick={() => verder()}>
              Verder ⏎
            </button>
          </div>
        </>
      )}
    </div>
  );
}
