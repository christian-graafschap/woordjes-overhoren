import { useState } from 'react';
import { backupVoorReset } from '../api';
import { SchermKop, Terug } from '../components/ui';
import { VoortgangBackup } from '../components/VoortgangBackup';
import { VoortgangReset } from '../components/VoortgangReset';
import type { Navigeer } from '../navigatie';
import { standaardVakInstellingen } from '../shared/state';
import type { VakInstellingen } from '../shared/types';
import { verwijderVak } from '../shared/vakken';
import { levelVan, puntenVoorVak } from '../shared/xp';
import { useStore } from '../store';

const TALEN: [string, string][] = [
  ['', 'Onbekend (geen lidwoorden)'],
  ['fr', 'Frans'],
  ['de', 'Duits'],
  ['en', 'Engels'],
  ['es', 'Spaans'],
  ['it', 'Italiaans'],
];

function Schakelaar({ aan, zet, label, uitleg }: { aan: boolean; zet: (b: boolean) => void; label: string; uitleg?: string }) {
  return (
    <button className="flex w-full items-center justify-between gap-4 rounded-xl bg-slate-800/60 px-4 py-3 text-left" onClick={() => zet(!aan)}>
      <span>
        <span className="block font-semibold">{label}</span>
        {uitleg && <span className="block text-sm text-slate-400">{uitleg}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${aan ? 'bg-emerald-500' : 'bg-slate-600'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${aan ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

/** Knop om een vak met alles erop en eraan te verwijderen, met bevestiging en eerst een reservekopie. */
function VakVerwijderen({ vak }: { vak: string }) {
  const { state, update, melding } = useStore();
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const woorden = Object.values(state.woorden).filter((w) => w.vak === vak);
  const toetsen = new Set(woorden.map((w) => w.toets)).size;
  const punten = puntenVoorVak(state.speler, vak);

  async function verwijder() {
    setBezig(true);
    setFout(null);
    try {
      const kopie = await backupVoorReset(state);
      update((s) => verwijderVak(s, vak));
      melding({ icoon: '🗑️', titel: `${vak} verwijderd`, tekst: `De stand van daarvoor is gedownload als ${kopie}.`, soort: 'info' });
    } catch (e: any) {
      setFout(`Niet verwijderd: ${e.message}. Er is niets gewist.`);
      setBezig(false);
    }
  }

  if (!open) {
    return (
      <button className="knop-secundair knop-klein text-rose-200 ring-rose-500/50 hover:bg-rose-500/20" onClick={() => setOpen(true)}>
        🗑️ Vak verwijderen…
      </button>
    );
  }
  return (
    <div className="w-full space-y-3 rounded-xl bg-rose-500/10 p-3 ring-1 ring-rose-500/40">
      <div className="font-semibold text-rose-200">{vak} helemaal verwijderen?</div>
      <ul className="list-inside list-disc text-sm text-slate-300">
        <li>
          {woorden.length} woorden in {toetsen} {toetsen === 1 ? 'toets' : 'toetsen'}, met wat je per woord beheerst
        </li>
        <li>
          {punten} punten en level {levelVan(punten)} van dit vak
        </li>
        <li>dit vak in het dagoverzicht en de instellingen hieronder</li>
      </ul>
      <p className="text-sm text-slate-400">Medailles, achievements en andere vakken blijven staan. Je krijgt eerst een reservekopie als download.</p>
      {fout && <p className="text-rose-300">{fout}</p>}
      <div className="flex gap-3">
        <button className="knop-rood knop-klein" disabled={bezig} onClick={verwijder}>
          {bezig ? 'Bezig…' : `${vak} verwijderen`}
        </button>
        <button
          className="knop-secundair knop-klein"
          onClick={() => {
            setOpen(false);
            setFout(null);
          }}
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}

export function Instellingen({ ga }: { ga: Navigeer }) {
  const { state, update } = useStore();

  const vakNamen = [...new Set([...Object.keys(state.vakken), ...Object.values(state.woorden).map((w) => w.vak)])].sort();

  function zetVak(vak: string, wijziging: Partial<VakInstellingen>) {
    update((s) => ({
      ...s,
      vakken: { ...s.vakken, [vak]: { ...(s.vakken[vak] ?? standaardVakInstellingen(vak)), ...wijziging } },
    }));
  }

  return (
    <div className="space-y-4">
      <SchermKop titel="Instellingen" links={<Terug onClick={() => ga({ naam: 'home' })} />} />

      <div className="kaart">
        <h2 className="mb-4 text-xl font-bold">Algemeen</h2>
        <label className="mb-3 flex items-center justify-between gap-4 rounded-xl bg-slate-800/60 px-4 py-3">
          <span>
            <span className="block font-semibold">Jouw naam</span>
            <span className="block text-sm text-slate-400">Staat rechtsboven. Klik erop om per dag te zien hoeveel je geoefend hebt.</span>
          </span>
          <input
            value={state.instellingen.naam}
            maxLength={30}
            placeholder="bijv. Sam"
            onChange={(e) => {
              const naam = e.target.value;
              update((s) => ({ ...s, instellingen: { ...s.instellingen, naam } }));
            }}
            className="w-56 rounded-xl bg-slate-900 px-3 py-2 text-lg ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-800/60 px-4 py-3">
          <span>
            <span className="block font-semibold">Woorden per sessie</span>
            <span className="block text-sm text-slate-400">Fout beantwoorde woorden komen daarbovenop nog een keer terug.</span>
          </span>
          <input
            type="number"
            min={5}
            max={200}
            value={state.instellingen.sessieGrootte}
            onChange={(e) => {
              const n = Math.max(5, Math.min(200, Number(e.target.value) || 20));
              update((s) => ({ ...s, instellingen: { ...s.instellingen, sessieGrootte: n } }));
            }}
            className="w-24 rounded-xl bg-slate-900 px-3 py-2 text-right text-lg ring-1 ring-slate-700"
          />
        </label>
      </div>

      {vakNamen.map((vak) => {
        const v = state.vakken[vak] ?? standaardVakInstellingen(vak);
        return (
          <div key={vak} className="kaart space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{vak}</h2>
              <VakVerwijderen vak={vak} />
            </div>
            <Schakelaar
              aan={v.hoofdlettersBelangrijk}
              zet={(b) => zetVak(vak, { hoofdlettersBelangrijk: b })}
              label="Hoofdletters tellen mee"
              uitleg="Voor Duits: zelfstandige naamwoorden met hoofdletter (der Hund). Alleen bij antwoorden in de vreemde taal."
            />
            <Schakelaar
              aan={v.accenten === 'streng'}
              zet={(b) => zetVak(vak, { accenten: b ? 'streng' : 'soepel' })}
              label="Accenten streng"
              uitleg="Uit (soepel): 'ecole' voor 'école' telt als goed, maar je ziet de juiste spelling. Aan: telt als fout."
            />
            <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-800/60 px-4 py-3">
              <span>
                <span className="block font-semibold">Taal voor lidwoorden</span>
                <span className="block text-sm text-slate-400">Bepaalt welke lidwoorden herkend worden ("woord goed, lidwoord fout").</span>
              </span>
              <select value={v.taal} onChange={(e) => zetVak(vak, { taal: e.target.value })} className="rounded-xl bg-slate-900 px-3 py-2 text-lg ring-1 ring-slate-700">
                {TALEN.map(([code, naam]) => (
                  <option key={code} value={code}>
                    {naam}
                  </option>
                ))}
              </select>
            </label>
            <label className="block rounded-xl bg-slate-800/60 px-4 py-3">
              <span className="block font-semibold">Speciale tekens</span>
              <span className="block text-sm text-slate-400">Knopjes onder het invoerveld, gescheiden door spaties.</span>
              <input
                className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2 text-lg ring-1 ring-slate-700"
                defaultValue={v.tekens.join(' ')}
                onBlur={(e) => zetVak(vak, { tekens: e.target.value.split(/\s+/).filter(Boolean) })}
              />
            </label>
          </div>
        );
      })}

      <VoortgangBackup />

      <VoortgangReset />
    </div>
  );
}
