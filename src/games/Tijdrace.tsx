import { useEffect, useMemo, useRef, useState } from 'react';
import { RichtingLabel, useToets } from '../components/ui';
import { beoordeel, geldigeAntwoorden, optiesVoor } from '../shared/grading';
import { kiesVolgende, type Vraag } from '../shared/leitner';
import { standaardVakInstellingen } from '../shared/state';
import { antwoordTekst, maakOpties, vraagTekst } from '../shared/vragen';
import type { SpelProps } from './gedeeld';
import { OptieKnoppen } from './Meerkeuze';
import { TypVeld } from './TypVeld';

const DUUR = 60;

export function Tijdrace({ config, woorden, reserve, state, registreer, klaar }: SpelProps) {
  const modus = config.tijdraceModus ?? 'meerkeuze';
  const [gestart, setGestart] = useState(false);
  const [over, setOver] = useState(DUUR);
  const [score, setScore] = useState(0);
  const [fouten, setFouten] = useState(0);
  const [vraag, setVraag] = useState<Vraag>(() => kiesVolgende(woorden, config.richting, null));
  const [teller, setTeller] = useState(0);
  const [feedback, setFeedback] = useState<{ goed: boolean; juist: string; gekozen?: string } | null>(null);
  const scoreRef = useRef(0);
  const einde = useRef(0);
  const record = state.speler.besteTijdrace;

  const woord = woorden.find((w) => w.id === vraag.woordId)!;
  const vak = state.vakken[woord.vak] ?? standaardVakInstellingen(woord.vak);
  const opties = useMemo(() => maakOpties(woord, vraag.richting, woorden, reserve), [teller]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gestart) return;
    einde.current = Date.now() + DUUR * 1000;
    const iv = setInterval(() => {
      const rest = Math.max(0, Math.ceil((einde.current - Date.now()) / 1000));
      setOver(rest);
      if (rest <= 0) {
        clearInterval(iv);
        klaar({ tijdraceScore: scoreRef.current });
      }
    }, 200);
    return () => clearInterval(iv);
  }, [gestart]); // eslint-disable-line react-hooks/exhaustive-deps

  function volgende() {
    setFeedback(null);
    setVraag(kiesVolgende(woorden, config.richting, vraag.woordId));
    setTeller((t) => t + 1);
  }

  function verwerk(goed: boolean, gekozen?: string) {
    if (feedback || over <= 0) return;
    registreer({ woordId: vraag.woordId, richting: vraag.richting, goed, soort: modus });
    if (goed) {
      scoreRef.current++;
      setScore(scoreRef.current);
    } else setFouten((f) => f + 1);
    setFeedback({ goed, juist: antwoordTekst(woord, vraag.richting), gekozen });
    setTimeout(volgende, goed ? 250 : 1100);
  }

  useToets(
    (e) => {
      if (!gestart && (e.key === 'Enter' || e.key === ' ')) setGestart(true);
      if (gestart && modus === 'meerkeuze' && !feedback) {
        const n = Number(e.key);
        if (n >= 1 && n <= opties.length) verwerk(opties[n - 1] === antwoordTekst(woord, vraag.richting), opties[n - 1]);
      }
    },
    [gestart, feedback, opties],
  );

  if (!gestart) {
    return (
      <div className="kaart mx-auto max-w-xl py-8 text-center hoog:py-14">
        <div className="text-5xl hoog:text-6xl">⏱️</div>
        <h2 className="kop mt-4">Tijdrace</h2>
        <p className="mt-3 text-lg text-slate-300">
          Zoveel mogelijk goed in {DUUR} seconden ({modus === 'meerkeuze' ? 'meerkeuze, toetsen 1–4 werken ook' : 'typen'}).
        </p>
        {record > 0 && <p className="mt-2 text-amber-300">Jouw record: {record}</p>}
        <button className="knop-primair mt-6 px-10 text-xl hoog:text-2xl" onClick={() => setGestart(true)}>
          Start!
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <RichtingLabel vak={woord.vak} richting={vraag.richting} />
        <div className="flex items-center gap-4 text-xl font-bold tabular-nums hoog:gap-6 hoog:text-2xl">
          <span className="text-emerald-300">✓ {score}</span>
          <span className="text-rose-300">✗ {fouten}</span>
          <span className={`rounded-xl px-4 py-1 ${over <= 10 ? 'animate-pulse bg-rose-500/30 text-rose-200' : 'bg-slate-800'}`}>{over}s</span>
        </div>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-2 bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-200" style={{ width: `${(over / DUUR) * 100}%` }} />
      </div>
      <div className="kaart vraagkaart mb-4">
        <div className="vraagtekst">{vraagTekst(woord, vraag.richting)}</div>
        <div className="mt-2 h-7 text-xl">
          {feedback && !feedback.goed && <span className="text-rose-300">→ {feedback.juist}</span>}
          {feedback?.goed && <span className="text-emerald-300">✓</span>}
        </div>
      </div>
      {modus === 'meerkeuze' ? (
        <OptieKnoppen
          key={teller}
          opties={opties}
          juist={antwoordTekst(woord, vraag.richting)}
          gekozen={feedback ? (feedback.gekozen ?? null) : null}
          kies={(o) => verwerk(o === antwoordTekst(woord, vraag.richting), o)}
        />
      ) : (
        <TypVeld
          key={teller}
          tekens={vraag.richting === 'naarVreemd' ? vak.tekens : []}
          uit={!!feedback}
          onNakijken={(t) => {
            const b = beoordeel(t, geldigeAntwoorden(woord, vraag.richting), optiesVoor(vraag.richting, vak));
            verwerk(b.uitslag === 'goed');
          }}
        />
      )}
    </div>
  );
}
