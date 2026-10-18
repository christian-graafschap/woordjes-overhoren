import { useState } from 'react';
import { backupVoorReset, downloadVoortgang, laatsteDownload } from '../api';
import { leesVoortgangBestand } from '../opslag';
import type { AppState } from '../shared/types';
import { useStore } from '../store';

const datumTijd = (iso: string) =>
  new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function samenvatting(s: AppState): string {
  const woorden = Object.values(s.woorden);
  const vakken = [...new Set(woorden.map((w) => w.vak))].sort((a, b) => a.localeCompare(b, 'nl'));
  const dagen = Object.keys(s.dagen).sort();
  return `${woorden.length} woorden${vakken.length ? ` (${vakken.join(', ')})` : ''}${dagen.length ? `, geoefend t/m ${dagen.at(-1)}` : ''}`;
}

/** Voortgang downloaden als bestand en een gedownload bestand terugzetten. */
export function VoortgangBackup() {
  const { state, update, melding } = useStore();
  const [laatste, setLaatste] = useState(laatsteDownload);
  const [nieuw, setNieuw] = useState<{ naam: string; state: AppState } | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  function downloaden() {
    const naam = downloadVoortgang(state);
    setLaatste(laatsteDownload());
    melding({ icoon: '💾', titel: 'Voortgang gedownload', tekst: `Bewaard als ${naam} in je map Downloads.`, soort: 'info' });
  }

  async function kiesBestand(bestand: File | undefined) {
    setFout(null);
    setNieuw(null);
    if (!bestand) return;
    try {
      setNieuw({ naam: bestand.name, state: leesVoortgangBestand(await bestand.text()) });
    } catch (e: any) {
      setFout(e.message);
    }
  }

  async function terugzetten() {
    if (!nieuw) return;
    setBezig(true);
    try {
      const kopie = await backupVoorReset(state);
      update(() => nieuw.state);
      melding({ icoon: '♻️', titel: 'Voortgang teruggezet', tekst: `Uit ${nieuw.naam}. Je vorige stand is gedownload als ${kopie}.`, soort: 'info' });
      setNieuw(null);
    } catch (e: any) {
      setFout(`Niet teruggezet: ${e.message}. Er is niets gewijzigd.`);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="kaart space-y-3">
      <h2 className="text-xl font-bold">Opslag en back-up</h2>
      <p className="text-slate-300">
        Je woordjes en voortgang staan <b>alleen in deze browser op dit apparaat</b>. Er gaat niets naar internet. Wis je de browsergegevens, of gebruik je
        een andere browser of computer, dan begin je leeg. Download daarom af en toe je voortgang.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="knop-primair knop-klein" onClick={downloaden}>
          💾 Voortgang downloaden
        </button>
        <label className="knop-secundair knop-klein cursor-pointer">
          📂 Voortgang terugzetten…
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              void kiesBestand(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <span className="text-sm text-slate-400">{laatste ? `Laatst gedownload: ${datumTijd(laatste)}` : 'Nog nooit gedownload'}</span>
      </div>
      {fout && <p className="text-rose-300">{fout}</p>}
      {nieuw && (
        <div className="space-y-3 rounded-xl bg-amber-500/10 p-3 ring-1 ring-amber-500/40">
          <div className="font-semibold text-amber-200">Voortgang uit {nieuw.naam} terugzetten?</div>
          <ul className="list-inside list-disc text-sm text-slate-300">
            <li>Nu in de app: {samenvatting(state)}</li>
            <li>In het bestand: {samenvatting(nieuw.state)}</li>
          </ul>
          <p className="text-sm text-slate-400">De huidige stand wordt vervangen. Je krijgt hem eerst nog als download, voor het geval dat.</p>
          <div className="flex gap-3">
            <button className="knop-rood knop-klein" disabled={bezig} onClick={terugzetten}>
              {bezig ? 'Bezig…' : 'Terugzetten'}
            </button>
            <button className="knop-secundair knop-klein" onClick={() => setNieuw(null)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
