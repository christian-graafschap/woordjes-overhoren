import { useRef, useState } from 'react';
import { Samenvatting } from '../components/Samenvatting';
import { RichtingLabel, SchermKop, Terug, Voortgangsteller } from '../components/ui';
import { TypVeld } from '../games/TypVeld';
import type { Navigeer } from '../navigatie';
import { berekenCijfer } from '../shared/engine';
import { beoordeel, geldigeAntwoorden, optiesVoor, type Uitslag } from '../shared/grading';
import { standaardVakInstellingen } from '../shared/state';
import type { Richting } from '../shared/types';
import { antwoordTekst, schud, vraagTekst } from '../shared/vragen';
import { useStore } from '../store';

interface Antwoord {
  woordId: string;
  richting: Richting;
  invoer: string;
  uitslag: Uitslag;
  melding: string;
}

/** "Toetsklaar?": alle woorden in beide richtingen, typen, zonder tussentijdse feedback. */
export function Proeftoets({ ga, woordIds, titel }: { ga: Navigeer; woordIds: string[]; titel: string }) {
  const { state, antwoord, sluitSessie } = useStore();
  const [vragen] = useState(() =>
    schud(woordIds.flatMap((id) => (['naarNL', 'naarVreemd'] as Richting[]).map((richting) => ({ woordId: id, richting })))),
  );
  const [gestart, setGestart] = useState(false);
  const [antwoorden, setAntwoorden] = useState<Antwoord[]>([]);
  const [cijfer, setCijfer] = useState<number | null>(null);
  const [punten, setPunten] = useState(0);
  const start = useRef(0);

  const i = antwoorden.length;
  const vraag = vragen[i];
  const woord = vraag ? state.woorden[vraag.woordId] : undefined;

  function nakijken(invoer: string) {
    if (!vraag || !woord) return;
    const vak = state.vakken[woord.vak] ?? standaardVakInstellingen(woord.vak);
    const b = beoordeel(invoer, geldigeAntwoorden(woord, vraag.richting), optiesVoor(vraag.richting, vak));
    const g = antwoord({ woordId: vraag.woordId, richting: vraag.richting, goed: b.uitslag === 'goed', soort: 'typen' });
    const totaalPunten = punten + g.xp;
    setPunten(totaalPunten);
    const nieuw = [...antwoorden, { ...vraag, invoer, uitslag: b.uitslag, melding: b.melding }];
    setAntwoorden(nieuw);
    if (nieuw.length === vragen.length) {
      const goed = nieuw.filter((a) => a.uitslag === 'goed').length;
      const c = berekenCijfer(goed, nieuw.length);
      setCijfer(c);
      sluitSessie({
        cijfer: c,
        uitslag: { titel, vak: state.woorden[woordIds[0]]?.vak, vorm: 'proeftoets', goed, totaal: nieuw.length, punten: totaalPunten, seconden: (Date.now() - start.current) / 1000 },
      });
    }
  }

  if (!gestart) {
    return (
      <div className="kaart mx-auto max-w-xl py-8 text-center hoog:py-12">
        <div className="text-5xl hoog:text-6xl">📝</div>
        <h1 className="kop mt-4">Toetsklaar?</h1>
        <p className="mt-2 text-xl text-slate-300">{titel}</p>
        <p className="mt-4 text-slate-400">
          {vragen.length} vragen: alle woorden in beide richtingen. Je typt de antwoorden en ziet pas aan het eind wat goed was. Precies zoals op de toets.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="knop-secundair" onClick={() => ga({ naam: 'home' })}>
            Terug
          </button>
          <button className="knop-primair px-10" onClick={() => {
              start.current = Date.now();
              setGestart(true);
            }}
          >
            Begin
          </button>
        </div>
      </div>
    );
  }

  if (cijfer !== null) {
    const fout = antwoorden.filter((a) => a.uitslag !== 'goed');
    const kleur = cijfer >= 8 ? 'text-emerald-300' : cijfer >= 5.5 ? 'text-amber-300' : 'text-rose-300';
    return (
      <div className="mx-auto max-w-2xl">
        <div className="kaart animate-pop text-center">
          <div className="text-slate-400">Je cijfer</div>
          <div className={`text-6xl font-black hoog:text-8xl tabular-nums ${kleur}`}>{cijfer.toFixed(1).replace('.', ',')}</div>
          <div className="mb-4 mt-1 text-lg text-slate-300">
            {cijfer >= 8 ? 'Je bent toetsklaar! 🎉' : cijfer >= 5.5 ? 'Voldoende, maar er valt nog wat te winnen.' : 'Nog even oefenen, dan komt het goed.'}
          </div>
          <Samenvatting goed={antwoorden.length - fout.length} totaal={antwoorden.length} punten={punten} vak={state.woorden[woordIds[0]]?.vak} />
        </div>
        {fout.length > 0 && (
          <div className="kaart mt-6">
            <h2 className="mb-3 text-xl font-bold">Fouten</h2>
            <ul className="space-y-2">
              {fout.map((a, k) => {
                const w = state.woorden[a.woordId];
                return (
                  <li key={k} className="rounded-xl bg-slate-800/60 px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-semibold">{vraagTekst(w, a.richting)}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-emerald-300">{antwoordTekst(w, a.richting)}</span>
                      <span className="text-rose-300 line-through">{a.invoer || '(leeg)'}</span>
                    </div>
                    {a.melding && <div className="text-sm text-amber-300">{a.melding}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          {fout.length > 0 && (
            <button
              className="knop-primair"
              onClick={() => ga({ naam: 'kies', woordIds: [...new Set(fout.map((a) => a.woordId))], titel: `${titel} · fouten proeftoets` })}
            >
              Oefen de fouten
            </button>
          )}
          <button className="knop-secundair" onClick={() => ga({ naam: 'home' })}>
            Naar start
          </button>
        </div>
      </div>
    );
  }

  if (!vraag || !woord) return null;
  const vak = state.vakken[woord.vak] ?? standaardVakInstellingen(woord.vak);
  return (
    <div className="mx-auto max-w-2xl">
      <SchermKop titel={`Proeftoets · ${titel}`} links={<Terug tekst="Stoppen" onClick={() => ga({ naam: 'home' })} />} />
      <div className="mb-4 flex items-center justify-between">
        <RichtingLabel vak={woord.vak} richting={vraag.richting} />
        <Voortgangsteller gedaan={i} totaal={vragen.length} />
      </div>
      <div className="kaart vraagkaart mb-4">
        <div className="vraagtekst">{vraagTekst(woord, vraag.richting)}</div>
      </div>
      <TypVeld key={i} tekens={vraag.richting === 'naarVreemd' ? vak.tekens : []} onNakijken={nakijken} />
      <div className="mt-3 flex justify-end">
        <button className="knop-secundair knop-klein" onClick={() => nakijken('')} title="Telt als fout">
          Weet ik niet →
        </button>
      </div>
    </div>
  );
}
