import { useMemo, useState } from 'react';
import { SchermKop, Terug } from '../components/ui';
import type { Navigeer } from '../navigatie';
import { maandagVan, sessieVak, totalenPerVak, weekDagen, weekNummer } from '../shared/engine';
import { datumString } from '../shared/state';
import type { AppState, SessieVorm } from '../shared/types';
import { levelTitel, levelVan, puntenVoorVak } from '../shared/xp';
import { useStore } from '../store';

const VORM_NAAM: Record<SessieVorm, string> = {
  flashcards: 'Flashcards',
  meerkeuze: 'Meerkeuze',
  typen: 'Typen',
  koppel: 'Koppelspel',
  tijdrace: 'Tijdrace',
  proeftoets: 'Proeftoets',
};

export function duur(seconden: number): string {
  const min = Math.round(seconden / 60);
  if (seconden > 0 && min === 0) return '< 1 min';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} u ${min % 60} min`;
}

function datumVan(dag: string): Date {
  const [j, m, d] = dag.split('-').map(Number);
  return new Date(j, m - 1, d);
}

function dagNaam(dag: string): string {
  const s = datumVan(dag).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  const extra = dag === datumString() ? ' (vandaag)' : dag === datumString(new Date(Date.now() - 864e5)) ? ' (gisteren)' : '';
  return s[0].toUpperCase() + s.slice(1) + extra;
}

const pct = (goed: number, totaal: number) => (totaal ? Math.round((goed / totaal) * 100) : 0);

/** Tellingen van één dag, eventueel alleen voor één vak. */
function dagTelling(state: AppState, dag: string, vak: string | null) {
  const d = state.dagen[dag];
  if (!d) return { antwoorden: 0, goed: 0, punten: 0, seconden: 0, sessies: [] };
  const sessies = vak ? d.sessies.filter((x) => sessieVak(x) === vak) : d.sessies;
  const t = vak ? (d.perVak[vak] ?? { antwoorden: 0, goed: 0, punten: 0 }) : d;
  // Tijd is alleen per sessie bekend; bij een vakfilter tellen we de tijd van de sessies van dat vak.
  const seconden = vak ? sessies.reduce((s, x) => s + x.seconden, 0) : d.seconden;
  return { antwoorden: t.antwoorden, goed: t.goed, punten: t.punten, seconden, sessies };
}

function Weekgrafiek({ dagen, punten, gekozen, kies }: { dagen: string[]; punten: number[]; gekozen: string | null; kies: (d: string) => void }) {
  const max = Math.max(1, ...punten);
  const vandaag = datumString();
  return (
    <div className="flex h-36 items-end gap-2 hoog:h-44">
      {dagen.map((dag, i) => {
        const d = datumVan(dag);
        const p = punten[i];
        return (
          <button
            key={dag}
            onClick={() => kies(dag)}
            className={`flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-xl px-1 pb-1 transition hover:bg-slate-800/60 ${gekozen === dag ? 'bg-slate-800/80' : ''}`}
            title={`${dagNaam(dag)}: ${p} punten`}
          >
            <span className="text-sm font-semibold tabular-nums text-slate-300">{p || ''}</span>
            <div
              className={`w-full max-w-16 rounded-t-lg ${p ? 'bg-gradient-to-t from-indigo-600 to-violet-400' : 'bg-slate-800'}`}
              style={{ height: `${p ? (p / max) * 80 + 4 : 3}px` }}
            />
            <span className={`text-sm font-semibold ${dag === vandaag ? 'text-indigo-300' : 'text-slate-300'}`}>
              {d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')}
            </span>
            <span className="text-xs tabular-nums text-slate-500">
              {d.getDate()}-{d.getMonth() + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Profiel({ ga }: { ga: Navigeer }) {
  const { state } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [vak, setVak] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(datumString());
  const naam = state.instellingen.naam.trim();
  const sp = state.speler;

  const maandag = maandagVan(new Date(), weekOffset);
  const week = weekDagen(maandag);
  const zondag = datumVan(week[6]);
  const weekLabel = `Week ${weekNummer(maandag)} · ${maandag.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} – ${zondag.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const telling = week.map((d) => dagTelling(state, d, vak));
  const weekTotaal = telling.reduce(
    (s, t) => ({ punten: s.punten + t.punten, antwoorden: s.antwoorden + t.antwoorden, goed: s.goed + t.goed, seconden: s.seconden + t.seconden }),
    { punten: 0, antwoorden: 0, goed: 0, seconden: 0 },
  );

  const alleVakken = useMemo(
    () =>
      [...new Set([...Object.values(state.woorden).map((w) => w.vak), ...Object.keys(sp.puntenPerVak), ...totalenPerVak(state).map((t) => t.vak)])].sort((a, b) => a.localeCompare(b, 'nl')),
    [state, sp.puntenPerVak],
  );
  const perVakTotaal = new Map(totalenPerVak(state).map((t) => [t.vak, t]));
  const perVakWeek = new Map(totalenPerVak(state, week).map((t) => [t.vak, t]));
  const geoefendeDagen = Object.values(state.dagen).filter((d) => d.antwoorden > 0).length;
  const totaalTijd = Object.values(state.dagen).reduce((s, d) => s + d.seconden, 0);

  const tegels: [string, string | number][] = [
    ['Goed beantwoord', sp.totaalGoed],
    ['Sessies gehaald', `${sp.sessiesGehaald} van ${sp.sessies}`],
    ['Dagen geoefend', geoefendeDagen],
    ['Totale oefentijd', duur(totaalTijd)],
  ];

  const weekDagenMetOefenen = week
    .map((d, i) => ({ dag: d, t: telling[i] }))
    .filter(({ t }) => t.antwoorden > 0 || t.sessies.length > 0)
    .reverse();

  return (
    <div className="space-y-4">
      <SchermKop
        titel={naam ? `👤 ${naam}` : '👤 Jouw profiel'}
        sub={
          !naam && (
            <button className="underline hover:text-slate-200" onClick={() => ga({ naam: 'instellingen' })}>
              Stel je naam in bij de instellingen
            </button>
          )
        }
        links={<Terug onClick={() => ga({ naam: 'home' })} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tegels.map(([label, waarde]) => (
          <div key={label} className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
            <div className="text-sm text-slate-400">{label}</div>
            <div className="text-lg font-bold">{waarde}</div>
          </div>
        ))}
      </div>

      <div className="kaart">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">Punten per dag</h2>
          <div className="ml-auto flex items-center gap-2">
            <button className="knop-secundair knop-klein" onClick={() => setWeekOffset((w) => w - 1)} title="Vorige week" aria-label="Vorige week">
              ◀
            </button>
            <span className="min-w-60 text-center font-semibold tabular-nums">{weekLabel}</span>
            <button
              className="knop-secundair knop-klein"
              onClick={() => setWeekOffset((w) => w + 1)}
              disabled={weekOffset >= 0}
              title="Volgende week"
              aria-label="Volgende week"
            >
              ▶
            </button>
            {weekOffset !== 0 && (
              <button className="knop-secundair knop-klein" onClick={() => setWeekOffset(0)}>
                Deze week
              </button>
            )}
          </div>
        </div>

        {alleVakken.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {[null, ...alleVakken].map((v) => (
              <button
                key={v ?? '_alle'}
                onClick={() => setVak(v)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 transition ${
                  vak === v ? 'bg-indigo-500/30 text-indigo-100 ring-indigo-400' : 'bg-slate-800 text-slate-300 ring-slate-700 hover:bg-slate-700'
                }`}
              >
                {v ?? 'Alle vakken'}
              </button>
            ))}
          </div>
        )}

        <Weekgrafiek dagen={week} punten={telling.map((t) => t.punten)} gekozen={open} kies={setOpen} />

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-800 pt-3 text-slate-300">
          <span>
            Deze week{vak ? ` (${vak})` : ''}: <b className="text-indigo-300">{weekTotaal.punten} punten</b>
          </span>
          <span>{weekTotaal.antwoorden} vragen</span>
          <span>
            <b className="text-emerald-300">{pct(weekTotaal.goed, weekTotaal.antwoorden)}%</b> goed
          </span>
          <span>⏱ {duur(weekTotaal.seconden)}</span>
        </div>
      </div>

      {alleVakken.length > 0 && (
        <div className="kaart">
          <h2 className="mb-3 text-lg font-bold">Punten per vak</h2>
          <table className="w-full text-left">
            <thead className="text-sm text-slate-400">
              <tr>
                <th className="pb-2 font-medium">Vak</th>
                <th className="pb-2 font-medium">Level</th>
                <th className="pb-2 text-right font-medium">Deze week</th>
                <th className="pb-2 text-right font-medium">Totaal</th>
                <th className="pb-2 text-right font-medium">Goed</th>
                <th className="pb-2 text-right font-medium">Sessies gehaald</th>
              </tr>
            </thead>
            <tbody>
              {alleVakken.map((v) => {
                const t = perVakTotaal.get(v);
                const w = perVakWeek.get(v);
                const level = levelVan(puntenVoorVak(sp, v));
                return (
                  <tr
                    key={v}
                    onClick={() => setVak(vak === v ? null : v)}
                    className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800/40 ${vak === v ? 'bg-indigo-500/10' : ''}`}
                    title="Klik om de grafiek op dit vak te filteren"
                  >
                    <td className="py-2 font-semibold">{v}</td>
                    <td className="py-2 text-slate-300">
                      {level} · {levelTitel(level)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-indigo-300">{w?.punten ?? 0}</td>
                    <td className="py-2 text-right text-lg font-bold tabular-nums text-indigo-200">{puntenVoorVak(sp, v)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {t?.goed ?? 0}/{t?.antwoorden ?? 0} <span className="text-slate-400">({pct(t?.goed ?? 0, t?.antwoorden ?? 0)}%)</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {t?.gehaald ?? 0}/{t?.sessies ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="kaart">
        <h2 className="mb-3 text-lg font-bold">
          Per dag <span className="font-normal text-slate-400">· {weekLabel}{vak ? ` · ${vak}` : ''}</span>
        </h2>
        {weekDagenMetOefenen.length === 0 && (
          <p className="text-slate-400">In deze week {vak ? `nog niet aan ${vak} ` : 'nog niet '}geoefend.</p>
        )}
        <ul className="space-y-2">
          {weekDagenMetOefenen.map(({ dag, t }) => {
            const isOpen = open === dag;
            const gehaald = t.sessies.filter((x) => x.gehaald).length;
            return (
              <li key={dag} className="rounded-2xl bg-slate-950/40 ring-1 ring-slate-800">
                <button className="flex w-full flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-left" onClick={() => setOpen(isOpen ? null : dag)}>
                  <span className="min-w-56 font-semibold">{dagNaam(dag)}</span>
                  <span className="text-slate-300">⏱ {duur(t.seconden)}</span>
                  <span className="text-slate-300">
                    {t.antwoorden} vragen · <b className="text-emerald-300">{pct(t.goed, t.antwoorden)}% goed</b>
                  </span>
                  <span className="text-indigo-300">+{t.punten} punten</span>
                  {t.sessies.length > 0 && (
                    <span className="text-slate-400">
                      {gehaald}/{t.sessies.length} gehaald
                    </span>
                  )}
                  <span className="ml-auto text-slate-500">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && t.sessies.length > 0 && (
                  <table className="mb-2 w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="px-4 pb-1 font-medium">Tijd</th>
                        <th className="pb-1 font-medium">Toets</th>
                        <th className="pb-1 font-medium">Spelvorm</th>
                        <th className="pb-1 text-right font-medium">Score</th>
                        <th className="pb-1 text-right font-medium">Punten</th>
                        <th className="px-4 pb-1 text-right font-medium">Uitslag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...t.sessies].reverse().map((x) => (
                        <tr key={x.tijd} className="border-t border-slate-800">
                          <td className="px-4 py-1.5 tabular-nums text-slate-400">
                            {new Date(x.tijd).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-1.5">{x.titel}</td>
                          <td className="py-1.5 text-slate-300">{VORM_NAAM[x.vorm] ?? x.vorm}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            {x.goed}/{x.totaal} ({pct(x.goed, x.totaal)}%)
                            {x.cijfer !== undefined && <span className="ml-2 font-semibold">cijfer {x.cijfer.toFixed(1).replace('.', ',')}</span>}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-indigo-300">+{x.punten}</td>
                          <td className="px-4 py-1.5 text-right">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${x.gehaald ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                              {x.gehaald ? 'Gehaald' : 'Niet gehaald'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {isOpen && t.sessies.length === 0 && <p className="px-4 pb-3 text-sm text-slate-400">Geoefend, maar geen sessie afgerond.</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
