import { Balk, SchermKop, Terug } from '../components/ui';
import type { Navigeer } from '../navigatie';
import { ACHIEVEMENTS } from '../shared/achievements';
import { MEDAILLES, NIVEAU_INFO, NIVEAUS, niveauVoor, volgendNiveau } from '../shared/medailles';
import { useStore } from '../store';

const datum = (iso: string) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

export function Achievements({ ga }: { ga: Navigeer }) {
  const { state } = useStore();
  const behaald = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  const medailles = MEDAILLES.reduce((n, m) => n + Object.keys(state.medailles[m.id] ?? {}).length, 0);
  const sp = state.speler;

  const stats: [string, string | number][] = [
    ['Goed beantwoord', sp.totaalGoed],
    ['Langste reeks', sp.langsteReeks],
    ['Sessierecord', `${sp.besteSessieGoed} goed`],
    ['Record tijdrace', sp.besteTijdrace],
    ['Streak', `${sp.streakDagen} ${sp.streakDagen === 1 ? 'dag' : 'dagen'}`],
    ['Beste proeftoets', sp.besteCijfer ? sp.besteCijfer.toFixed(1).replace('.', ',') : '–'],
  ];

  return (
    <div>
      <SchermKop
        titel="Prijzenkast"
        sub={`${medailles} van ${MEDAILLES.length * NIVEAUS.length} medailles · ${behaald} van ${ACHIEVEMENTS.length} achievements`}
        links={<Terug onClick={() => ga({ naam: 'home' })} />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map(([label, waarde]) => (
          <div key={label} className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
            <div className="text-sm text-slate-400">{label}</div>
            <div className="text-lg font-bold">{waarde}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-xl font-bold">Medailles</h2>
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {MEDAILLES.map((m) => {
          const waarde = m.waarde(state);
          const huidig = niveauVoor(m, waarde);
          const volgend = volgendNiveau(m, waarde);
          const vorigeGrens = volgend ? (NIVEAUS.indexOf(volgend.niveau) > 0 ? m.grenzen[NIVEAUS.indexOf(volgend.niveau) - 1] : 0) : 0;
          const gewonnen = state.medailles[m.id] ?? {};
          return (
            <div
              key={m.id}
              className={`rounded-2xl p-4 ring-1 ${huidig ? `bg-gradient-to-br ${NIVEAU_INFO[huidig].kleur} to-slate-900` : 'bg-slate-900/60 ring-slate-800'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">{m.titel}</div>
                  <div className="text-sm text-slate-400">{m.uitleg}</div>
                </div>
                <div className="flex gap-1 text-3xl">
                  {NIVEAUS.map((n, i) => (
                    <span
                      key={n}
                      className={gewonnen[n] ? '' : 'opacity-20 grayscale'}
                      title={`${NIVEAU_INFO[n].naam}: ${m.grenzen[i]} ${m.eenheid}${gewonnen[n] ? ` · gewonnen op ${datum(gewonnen[n]!)}` : ''}`}
                    >
                      {NIVEAU_INFO[n].icoon}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="font-semibold tabular-nums">
                  {waarde} {m.eenheid}
                </span>
                <span className="text-slate-400">
                  {volgend ? `nog ${volgend.grens - waarde} tot ${NIVEAU_INFO[volgend.niveau].naam.toLowerCase()} (${volgend.grens})` : 'Alle niveaus gewonnen!'}
                </span>
              </div>
              <div className="mt-1">
                <Balk
                  fractie={volgend ? (waarde - vorigeGrens) / (volgend.grens - vorigeGrens) : 1}
                  kleur={volgend ? 'bg-amber-400' : 'bg-cyan-300'}
                  hoogte="h-2"
                />
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 text-xl font-bold">Achievements</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const op = state.achievements[a.id];
          return (
            <div
              key={a.id}
              className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${
                op ? 'bg-gradient-to-br from-amber-500/20 to-slate-900 ring-amber-400/40' : 'bg-slate-900/60 ring-slate-800'
              }`}
            >
              <span className={`text-4xl hoog:text-5xl ${op ? '' : 'opacity-30 grayscale'}`}>{a.icoon}</span>
              <div>
                <div className={`text-lg font-bold ${op ? '' : 'text-slate-500'}`}>{a.titel}</div>
                <div className={op ? 'text-slate-300' : 'text-slate-500'}>{a.beschrijving}</div>
                {op && <div className="mt-1 text-sm text-amber-300/80">{datum(op)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
