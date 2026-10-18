import { useState } from 'react';
import { Balk } from '../components/ui';
import { VakLevel } from '../components/VakLevel';
import type { Navigeer } from '../navigatie';
import { isBeheerst } from '../shared/leitner';
import { verwijderToets } from '../shared/state';
import type { Woord } from '../shared/types';
import { controleerVaknaam, hernoemVak } from '../shared/vakken';
import { useStore } from '../store';

export interface ToetsInfo {
  toets: string;
  woorden: Woord[];
  beheerst: number;
}

/** Woorden gegroepeerd per vak en toets, gesorteerd. */
export function groepeer(woorden: Woord[]): Map<string, ToetsInfo[]> {
  const vakken = new Map<string, Map<string, Woord[]>>();
  for (const w of woorden) {
    const toetsen = vakken.get(w.vak) ?? new Map<string, Woord[]>();
    toetsen.set(w.toets, [...(toetsen.get(w.toets) ?? []), w]);
    vakken.set(w.vak, toetsen);
  }
  const uit = new Map<string, ToetsInfo[]>();
  for (const vak of [...vakken.keys()].sort((a, b) => a.localeCompare(b, 'nl'))) {
    const toetsen = [...vakken.get(vak)!.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'nl', { numeric: true }))
      .map(([toets, ws]) => ({ toets, woorden: ws, beheerst: ws.filter(isBeheerst).length }));
    uit.set(vak, toetsen);
  }
  return uit;
}

const VAK_KLEUR: Record<string, string> = {
  frans: 'from-sky-500/20',
  engels: 'from-rose-500/20',
  duits: 'from-amber-500/20',
  spaans: 'from-orange-500/20',
};

/** Vaknaam met ✏️-knop; na klikken een invoerveld om de naam te wijzigen. */
function Vaknaam({ vak }: { vak: string }) {
  const { state, update, melding } = useStore();
  const [bewerk, setBewerk] = useState(false);
  const [naam, setNaam] = useState(vak);
  const fout = bewerk ? controleerVaknaam(state, vak, naam) : null;

  function opslaan() {
    if (fout) return;
    const nieuw = naam.trim().replace(/\s+/g, ' ');
    if (nieuw !== vak) {
      update((s) => hernoemVak(s, vak, nieuw));
      melding({ icoon: '✏️', titel: 'Vak hernoemd', tekst: `"${vak}" heet nu "${nieuw}". Je voortgang is bewaard.`, soort: 'info' });
    }
    setBewerk(false);
  }

  if (!bewerk) {
    return (
      <div className="flex items-center gap-2">
        <h2 className="truncate text-2xl font-bold">{vak}</h2>
        <button
          className="rounded-lg px-2 py-1 text-base opacity-60 hover:bg-slate-800 hover:opacity-100"
          onClick={() => {
            setNaam(vak);
            setBewerk(true);
          }}
          title="Naam van dit vak wijzigen"
          aria-label={`Naam van ${vak} wijzigen`}
        >
          ✏️
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xl font-bold ring-2 ring-indigo-400 focus:outline-none"
          value={naam}
          maxLength={40}
          autoFocus
          aria-label="Nieuwe naam van het vak"
          onChange={(e) => setNaam(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') opslaan();
            if (e.key === 'Escape') setBewerk(false);
          }}
        />
        <button className="knop-groen knop-klein" disabled={!!fout} onClick={opslaan}>
          Opslaan
        </button>
        <button className="knop-secundair knop-klein" onClick={() => setBewerk(false)}>
          Annuleren
        </button>
      </div>
      {fout && <div className="mt-1 text-sm text-rose-300">{fout}</div>}
    </div>
  );
}

export function Home({ ga }: { ga: Navigeer }) {
  const { state, update, melding } = useStore();
  const woorden = Object.values(state.woorden);
  const groepen = groepeer(woorden);
  /** "vak|toets" waarvoor de verwijderbevestiging open staat. */
  const [bevestig, setBevestig] = useState<string | null>(null);

  function verwijder(vak: string, t: ToetsInfo) {
    update((s) => verwijderToets(s, vak, t.toets));
    setBevestig(null);
    melding({ icoon: '🗑️', titel: `${vak} · ${t.toets} verwijderd`, tekst: `${t.woorden.length} woorden en hun voortgang.`, soort: 'info' });
  }

  if (woorden.length === 0) {
    return (
      <div className="kaart mx-auto mt-6 max-w-2xl text-center">
        <div className="text-5xl">📥</div>
        <h1 className="kop mt-3">Welkom bij Overhoren</h1>
        <p className="mt-3 text-slate-300">
          Laad eerst een Excelbestand met je woordjes in. Nog geen bestand? Download het voorbeeld en vul het aan.
        </p>
        <button className="knop-primair mt-6" onClick={() => ga({ naam: 'import' })}>
          Woordjes inladen
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <button className="knop-primair flex-1 text-xl hoog:py-5 hoog:text-2xl" onClick={() => ga({ naam: 'kies' })}>
          ▶ Oefenen
        </button>
        <button className="knop-secundair" onClick={() => ga({ naam: 'import' })}>
          📥 Woordjes inladen
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[...groepen.entries()].map(([vak, toetsen]) => (
          <section key={vak} className={`kaart bg-gradient-to-br ${VAK_KLEUR[vak.toLowerCase().split(/[\s(]/)[0]] ?? 'from-indigo-500/20'} to-slate-900/80`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Vaknaam vak={vak} />
                <div className="text-sm text-slate-400">
                  {toetsen.length} {toetsen.length === 1 ? 'toets' : 'toetsen'} · {toetsen.reduce((s, t) => s + t.woorden.length, 0)} woorden
                </div>
              </div>
              <button className="knop-secundair knop-klein" onClick={() => ga({ naam: 'kies', vak })}>
                Oefen {vak}
              </button>
            </div>
            <div className="mb-3 flex">
              <VakLevel vak={vak} />
            </div>
            <ul className="space-y-2">
              {toetsen.map((t) => {
                const sleutel = `${vak}|${t.toets}`;
                if (bevestig === sleutel) {
                  return (
                    <li key={t.toets} className="flex flex-wrap items-center gap-3 rounded-2xl bg-rose-500/15 px-4 py-3 ring-1 ring-rose-500/50">
                      <span className="flex-1">
                        <b>{t.toets}</b> verwijderen? {t.woorden.length} woorden en alle voortgang gaan weg.
                      </span>
                      <button className="knop-rood knop-klein" onClick={() => verwijder(vak, t)}>
                        Verwijderen
                      </button>
                      <button className="knop-secundair knop-klein" onClick={() => setBevestig(null)}>
                        Annuleren
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={t.toets} className="flex items-center gap-2 rounded-2xl bg-slate-950/40 p-2 pl-4 ring-1 ring-slate-800">
                    <button
                      className="min-w-0 flex-1 rounded-xl py-1 text-left transition hover:text-indigo-200"
                      onClick={() => ga({ naam: 'overzicht', vak, toets: t.toets })}
                      title="Overzicht van deze toets"
                    >
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-lg font-semibold">{t.toets}</span>
                        <span className="shrink-0 text-sm text-slate-400">
                          {t.beheerst}/{t.woorden.length} beheerst
                        </span>
                      </div>
                      <Balk fractie={t.beheerst / t.woorden.length} kleur="bg-emerald-500" hoogte="h-2" />
                    </button>
                    <button
                      className="rounded-xl bg-indigo-500/20 px-3 py-2 font-semibold text-indigo-200 hover:bg-indigo-500/35"
                      onClick={() => ga({ naam: 'kies', vak, toetsen: [t.toets] })}
                      title={`${t.toets} oefenen`}
                    >
                      ▶
                    </button>
                    <button
                      className="rounded-xl bg-slate-800/60 px-3 py-2 text-lg hover:bg-rose-500/25"
                      onClick={() => setBevestig(sleutel)}
                      title={`${t.toets} verwijderen`}
                      aria-label={`${t.toets} verwijderen`}
                    >
                      🗑️
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
