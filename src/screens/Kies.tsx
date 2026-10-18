import { useMemo, useState } from 'react';
import { SchermKop, Terug } from '../components/ui';
import type { Navigeer, Scherm } from '../navigatie';
import type { RichtingKeuze, Spelvorm } from '../shared/types';
import { useStore } from '../store';
import { groepeer } from './Home';

const VORMEN: { vorm: Spelvorm; icoon: string; naam: string; uitleg: string; minimaal: number }[] = [
  { vorm: 'flashcards', icoon: '🃏', naam: 'Flashcards', uitleg: 'Kaart omdraaien, zelf aangeven of je het wist', minimaal: 1 },
  { vorm: 'meerkeuze', icoon: '🔘', naam: 'Meerkeuze', uitleg: 'Kies uit 4 opties', minimaal: 2 },
  { vorm: 'typen', icoon: '⌨️', naam: 'Typen', uitleg: 'Zelf intypen, spelling telt (meeste punten)', minimaal: 1 },
  { vorm: 'koppel', icoon: '🧩', naam: 'Koppelspel', uitleg: 'Verbind 6 woordparen', minimaal: 2 },
  { vorm: 'tijdrace', icoon: '⏱️', naam: 'Tijdrace', uitleg: 'Zoveel mogelijk goed in 60 seconden', minimaal: 2 },
];

type KiesStart = Extract<Scherm, { naam: 'kies' }>;

export function Kies({ ga, start }: { ga: Navigeer; start: KiesStart }) {
  const { state } = useStore();
  const groepen = useMemo(() => groepeer(Object.values(state.woorden)), [state.woorden]);
  const vakken = [...groepen.keys()];
  const vasteSelectie = start.woordIds;

  const [vak, setVak] = useState<string | undefined>(start.vak ?? (vakken.length === 1 ? vakken[0] : undefined));
  /** Heeft een vak maar één toets, dan is die meteen geselecteerd. */
  const standaardToetsen = (v?: string) => {
    const lijst = v ? (groepen.get(v) ?? []) : [];
    return lijst.length === 1 ? [lijst[0].toets] : [];
  };
  const [toetsen, setToetsen] = useState<string[]>(start.toetsen ?? standaardToetsen(vak));
  const [richting, setRichting] = useState<RichtingKeuze>('naarNL');
  const [vorm, setVorm] = useState<Spelvorm | null>(null);
  const [raceModus, setRaceModus] = useState<'meerkeuze' | 'typen'>('meerkeuze');

  const toetsLijst = vak ? (groepen.get(vak) ?? []) : [];
  const woordIds = vasteSelectie ?? toetsLijst.filter((t) => toetsen.includes(t.toets)).flatMap((t) => t.woorden.map((w) => w.id));
  const vakNaam = vasteSelectie ? state.woorden[vasteSelectie[0]]?.vak : vak;
  const klaar = woordIds.length > 0 && vorm !== null && woordIds.length >= (VORMEN.find((v) => v.vorm === vorm)?.minimaal ?? 1);

  function wisselToets(t: string) {
    setToetsen((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  }

  function begin() {
    if (!klaar || !vorm) return;
    const titel = start.titel ?? `${vakNaam} · ${toetsen.join(', ')}`;
    ga({ naam: 'oefen', config: { titel, woordIds, richting, vorm, tijdraceModus: raceModus } });
  }

  const stap = (nr: number, titel: string) => (
    <h2 className="mb-2 flex items-center gap-3 text-lg font-bold hoog:mb-3 hoog:text-xl">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/30 text-base text-indigo-200">{nr}</span>
      {titel}
    </h2>
  );

  let nr = 1;
  return (
    <div className="space-y-5 pb-2 hoog:space-y-8">
      <SchermKop titel="Wat ga je oefenen?" sub={start.titel} links={<Terug onClick={() => ga({ naam: 'home' })} />} />

      {!vasteSelectie && (
        <div className="grid gap-5 lg:grid-cols-2">
        <section>
          {stap(nr++, 'Vak')}
          <div className="flex flex-wrap gap-3">
            {vakken.map((v) => (
              <button
                key={v}
                className={`keuze min-w-40 ${vak === v ? 'keuze-actief' : ''}`}
                onClick={() => {
                  setVak(v);
                  setToetsen(standaardToetsen(v));
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </section>

      {vak && (
        <section>
          {stap(nr++, 'Toets (één of meer)')}
          <div className="flex flex-wrap gap-3">
            {toetsLijst.map((t) => (
              <button key={t.toets} className={`keuze ${toetsen.includes(t.toets) ? 'keuze-actief' : ''}`} onClick={() => wisselToets(t.toets)}>
                {toetsen.includes(t.toets) ? '☑' : '☐'} {t.toets} <span className="ml-1 text-base font-normal text-slate-400">({t.woorden.length})</span>
              </button>
            ))}
            {toetsLijst.length > 1 && (
              <button
                className="keuze text-slate-300"
                onClick={() => setToetsen(toetsen.length === toetsLijst.length ? [] : toetsLijst.map((t) => t.toets))}
              >
                {toetsen.length === toetsLijst.length ? 'Niets' : 'Alles'}
              </button>
            )}
          </div>
        </section>
      )}
        </div>
      )}

      {woordIds.length > 0 && (
        <section>
          {stap(nr++, 'Richting')}
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['naarNL', `${vakNaam} → Nederlands`],
                ['naarVreemd', `Nederlands → ${vakNaam}`],
                ['gemengd', 'Gemengd'],
              ] as [RichtingKeuze, string][]
            ).map(([r, label]) => (
              <button key={r} className={`keuze ${richting === r ? 'keuze-actief' : ''}`} onClick={() => setRichting(r)}>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {woordIds.length > 0 && (
        <section>
          {stap(nr++, 'Spelvorm')}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {VORMEN.map((v) => {
              const kan = woordIds.length >= v.minimaal;
              return (
                <button
                  key={v.vorm}
                  disabled={!kan}
                  className={`keuze disabled:opacity-40 ${vorm === v.vorm ? 'keuze-actief' : ''}`}
                  onClick={() => setVorm(v.vorm)}
                >
                  <div className="text-2xl hoog:text-3xl">{v.icoon}</div>
                  <div className="mt-1 hoog:mt-2">{v.naam}</div>
                  <div className="text-base font-normal text-slate-400">{kan ? v.uitleg : `Minimaal ${v.minimaal} woorden nodig`}</div>
                </button>
              );
            })}
          </div>
          {vorm === 'tijdrace' && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-slate-300">Antwoorden met:</span>
              {(['meerkeuze', 'typen'] as const).map((m) => (
                <button key={m} className={`keuze py-2 ${raceModus === m ? 'keuze-actief' : ''}`} onClick={() => setRaceModus(m)}>
                  {m === 'meerkeuze' ? 'Meerkeuze' : 'Typen'}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <button className="knop-primair px-8 text-xl hoog:px-10 hoog:py-5 hoog:text-2xl" disabled={!klaar} onClick={begin}>
          Start ▶ <span className="text-base font-normal opacity-80">({woordIds.length} woorden)</span>
        </button>
      </div>
    </div>
  );
}
