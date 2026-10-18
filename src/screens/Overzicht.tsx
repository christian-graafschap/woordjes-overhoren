import { useState } from 'react';
import { Balk, SchermKop, Terug } from '../components/ui';
import type { Navigeer } from '../navigatie';
import { isBeheerst } from '../shared/leitner';
import { verwijderToets } from '../shared/state';
import type { Woord } from '../shared/types';
import { useStore } from '../store';

function fouten(w: Woord) {
  return w.voortgang.naarNL.fout + w.voortgang.naarVreemd.fout;
}
function pogingen(w: Woord) {
  const { naarNL: a, naarVreemd: b } = w.voortgang;
  return a.goed + a.fout + b.goed + b.fout;
}

export function Overzicht({ ga, vak, toets }: { ga: Navigeer; vak: string; toets: string }) {
  const { state, update } = useStore();
  const [lijstOpen, setLijstOpen] = useState(false);
  const woorden = Object.values(state.woorden).filter((w) => w.vak === vak && w.toets === toets);
  const beheerst = woorden.filter(isBeheerst).length;
  const lastig = woorden
    .filter((w) => fouten(w) > 0)
    .sort((a, b) => fouten(b) - fouten(a) || fouten(b) / pogingen(b) - fouten(a) / pogingen(a))
    .slice(0, 10);
  const bakjes = [1, 2, 3, 4, 5].map((n) => woorden.reduce((s, w) => s + (w.voortgang.naarNL.bakje === n ? 1 : 0) + (w.voortgang.naarVreemd.bakje === n ? 1 : 0), 0));
  const maxBakje = Math.max(1, ...bakjes);
  const ids = woorden.map((w) => w.id);

  function verwijder() {
    if (!confirm(`Toets "${toets}" (${woorden.length} woorden) en alle voortgang ervan verwijderen?`)) return;
    update((s) => verwijderToets(s, vak, toets));
    ga({ naam: 'home' });
  }

  if (woorden.length === 0) {
    return (
      <div>
        <Terug onClick={() => ga({ naam: 'home' })} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SchermKop titel={`${vak} · ${toets}`} sub={`${woorden.length} woorden`} links={<Terug onClick={() => ga({ naam: 'home' })} />} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="kaart md:col-span-2">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Hoeveel woorden beheers ik?</h2>
            <span className="text-2xl font-bold tabular-nums text-emerald-300">
              {beheerst}/{woorden.length}
            </span>
          </div>
          <Balk fractie={beheerst / woorden.length} kleur="bg-gradient-to-r from-emerald-500 to-teal-400" hoogte="h-5" />
          <p className="mt-2 text-sm text-slate-400">Beheerst = in beide richtingen in bakje 4 of 5.</p>

          <h3 className="mb-2 mt-4 font-semibold text-slate-300">Bakjes (beide richtingen)</h3>
          <div className="flex h-24 items-end gap-3">
            {bakjes.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-sm tabular-nums text-slate-400">{n}</span>
                <div
                  className={`w-full rounded-t-lg ${['bg-rose-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-500'][i]}`}
                  style={{ height: `${(n / maxBakje) * 56 + 4}px` }}
                />
                <span className="text-sm text-slate-500">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button className="knop-primair flex-1" onClick={() => ga({ naam: 'kies', vak, toetsen: [toets] })}>
            ▶ Oefenen
          </button>
          <button className="knop-secundair flex-1 flex-col" onClick={() => ga({ naam: 'proeftoets', woordIds: ids, titel: `${vak} · ${toets}` })}>
            <span>📝 Toetsklaar?</span>
            <span className="text-sm font-normal text-slate-400">Proeftoets met cijfer</span>
          </button>
        </div>
      </div>

      <div className="kaart">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Lastigste woorden</h2>
          {lastig.length > 0 && (
            <button
              className="knop-primair knop-klein"
              onClick={() => ga({ naam: 'kies', woordIds: lastig.map((w) => w.id), titel: `${vak} · ${toets} · lastigste woorden` })}
            >
              Oefen alleen deze
            </button>
          )}
        </div>
        {lastig.length === 0 ? (
          <p className="text-slate-400">Nog geen fouten gemaakt in deze toets.</p>
        ) : (
          <ul className="space-y-2">
            {lastig.map((w) => (
              <li key={w.id} className="flex items-center gap-4 rounded-xl bg-slate-800/60 px-4 py-3">
                <span className="flex-1 font-semibold">{w.vreemd}</span>
                <span className="flex-1 text-slate-300">{w.nederlands}</span>
                <span className="w-24 text-right text-rose-300">{fouten(w)}× fout</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="kaart">
        <button className="flex w-full items-center justify-between text-xl font-bold" onClick={() => setLijstOpen((x) => !x)}>
          Alle woorden <span>{lijstOpen ? '▲' : '▼'}</span>
        </button>
        {lijstOpen && (
          <table className="mt-4 w-full text-left">
            <thead className="text-sm text-slate-400">
              <tr>
                <th className="pb-2 font-medium">{vak}</th>
                <th className="pb-2 font-medium">Nederlands</th>
                <th className="pb-2 text-center font-medium">Bakje → NL</th>
                <th className="pb-2 text-center font-medium">Bakje → {vak}</th>
              </tr>
            </thead>
            <tbody>
              {[...woorden]
                .sort((a, b) => a.vreemd.localeCompare(b.vreemd))
                .map((w) => (
                  <tr key={w.id} className="border-t border-slate-800">
                    <td className="py-2">
                      {w.vreemd}
                      {w.altVreemd.length > 0 && <span className="text-sm text-slate-500"> ({w.altVreemd.join(', ')})</span>}
                    </td>
                    <td className="py-2 text-slate-300">
                      {w.nederlands}
                      {w.altNederlands.length > 0 && <span className="text-sm text-slate-500"> ({w.altNederlands.join(', ')})</span>}
                    </td>
                    <td className="py-2 text-center tabular-nums">{w.voortgang.naarNL.bakje}</td>
                    <td className="py-2 text-center tabular-nums">{w.voortgang.naarVreemd.bakje}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-right">
        <button className="text-sm text-slate-500 underline hover:text-rose-300" onClick={verwijder}>
          Deze toets verwijderen
        </button>
      </div>
    </div>
  );
}
