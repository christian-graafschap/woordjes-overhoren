import { useEffect, useState } from 'react';
import { RichtingLabel, useToets, Voortgangsteller } from '../components/ui';
import { alternatieven, antwoordTekst, vraagTekst } from '../shared/vragen';
import { useSessie, type SpelProps } from './gedeeld';

export function Flashcards({ config, woorden, state, registreer, klaar }: SpelProps) {
  const s = useSessie(woorden, config, state.instellingen.sessieGrootte);
  const [om, setOm] = useState(false);

  useEffect(() => {
    if (s.wachtrij.klaar) klaar();
  }, [s.vraag]); // eslint-disable-line react-hooks/exhaustive-deps

  function beantwoord(goed: boolean) {
    if (!s.vraag || !om) return;
    registreer({ woordId: s.vraag.woordId, richting: s.vraag.richting, goed, soort: 'flashcards', herhaling: s.vraag.herhaling });
    setOm(false);
    // Even wachten zodat de kaart terugdraait voordat het volgende woord verschijnt.
    setTimeout(() => s.volgende(goed), 180);
  }

  useToets(
    (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setOm((x) => !x);
      } else if (om && (e.key === 'ArrowRight' || e.key.toLowerCase() === 'j')) beantwoord(true);
      else if (om && (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'n')) beantwoord(false);
    },
    [om, s.vraag],
  );

  if (!s.vraag || !s.woord) return null;
  const { woord, vraag } = s;
  const alts = alternatieven(woord, vraag.richting);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <RichtingLabel vak={woord.vak} richting={vraag.richting} />
        <Voortgangsteller gedaan={s.wachtrij.gedaan} totaal={s.wachtrij.totaal} />
      </div>

      <button className="flip block h-56 w-full hoog:h-80" onClick={() => setOm((x) => !x)}>
        <div className={`flip-binnen relative h-full w-full ${om ? 'omgedraaid' : ''}`}>
          <div className="flip-kant kaart absolute inset-0 flex flex-col items-center justify-center">
            {vraag.herhaling && <span className="absolute top-5 text-sm text-amber-300">↻ nog een keer</span>}
            <div className="vraagtekst">{vraagTekst(woord, vraag.richting)}</div>
            <div className="absolute bottom-5 text-slate-500">Klik of druk op spatie om om te draaien</div>
          </div>
          <div className="flip-kant flip-achter kaart absolute inset-0 flex flex-col items-center justify-center bg-indigo-950/80 ring-indigo-500/40">
            <div className="text-lg text-slate-400">{vraagTekst(woord, vraag.richting)}</div>
            <div className="vraagtekst mt-2 text-indigo-100">{antwoordTekst(woord, vraag.richting)}</div>
            {alts.length > 0 && <div className="mt-4 text-slate-300">ook goed: {alts.join(', ')}</div>}
          </div>
        </div>
      </button>

      <div className={`mt-4 grid grid-cols-2 gap-4 transition ${om ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
        <button className="knop-rood hoog:py-6 hoog:text-xl" onClick={() => beantwoord(false)}>
          ✗ Wist ik niet <span className="text-sm opacity-70">(N)</span>
        </button>
        <button className="knop-groen hoog:py-6 hoog:text-xl" onClick={() => beantwoord(true)}>
          ✓ Wist ik <span className="text-sm opacity-70">(J)</span>
        </button>
      </div>
    </div>
  );
}
