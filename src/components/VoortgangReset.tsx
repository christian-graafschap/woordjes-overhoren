import { useState } from 'react';
import { backupVoorReset } from '../api';
import { resetVoortgang } from '../shared/state';
import { useStore } from '../store';

const BEVESTIGWOORD = 'RESET';

/** Alle voortgang op nul zetten (woordenlijsten blijven), met eerst een reservekopie. */
export function VoortgangReset() {
  const { state, update, melding } = useStore();
  const [open, setOpen] = useState(false);
  const [invoer, setInvoer] = useState('');
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const aantalWoorden = Object.keys(state.woorden).length;
  const medailles = Object.values(state.medailles).reduce((n, m) => n + Object.keys(m).length, 0);

  async function reset() {
    setBezig(true);
    setFout(null);
    try {
      const kopie = await backupVoorReset(state);
      update(resetVoortgang);
      melding({ icoon: '♻️', titel: 'Voortgang gereset', tekst: `Alles staat weer op nul. De stand van daarvoor is gedownload als ${kopie}.`, soort: 'info' });
      setOpen(false);
      setInvoer('');
    } catch (e: any) {
      setFout(`Reset niet uitgevoerd: ${e.message}. Er is niets gewist.`);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="kaart ring-rose-500/30">
      <h2 className="mb-2 text-xl font-bold">Voortgang resetten</h2>
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-slate-400">Opnieuw beginnen: alle punten, prijzen en voortgang op 0. Je woordenlijsten blijven staan.</p>
          <button className="knop-secundair knop-klein text-rose-200 ring-rose-500/50 hover:bg-rose-500/20" onClick={() => setOpen(true)}>
            ♻️ Voortgang resetten…
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-rose-500/10 p-3 ring-1 ring-rose-500/40">
              <div className="mb-1 font-semibold text-rose-200">Dit gaat naar 0</div>
              <ul className="list-inside list-disc text-sm text-slate-300">
                <li>de punten en levels van alle vakken</li>
                <li>
                  {medailles} medailles en {Object.keys(state.achievements).length} achievements
                </li>
                <li>het dagoverzicht ({Object.keys(state.dagen).length} dagen) en je streak</li>
                <li>wat je per woord beheerst (alle woorden terug naar bakje 1)</li>
              </ul>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/40">
              <div className="mb-1 font-semibold text-emerald-200">Dit blijft staan</div>
              <ul className="list-inside list-disc text-sm text-slate-300">
                <li>je woordenlijsten ({aantalWoorden} woorden)</li>
                <li>je naam en de instellingen per vak</li>
                <li>een reservekopie van je huidige voortgang, als download</li>
              </ul>
            </div>
          </div>
          <label className="block">
            <span className="text-slate-300">
              Typ <b className="text-rose-200">{BEVESTIGWOORD}</b> om te bevestigen:
            </span>
            <input
              className="invoer mt-1 max-w-xs text-lg"
              value={invoer}
              onChange={(e) => setInvoer(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {fout && <p className="text-rose-300">{fout}</p>}
          <div className="flex gap-3">
            <button className="knop-rood knop-klein" disabled={invoer.trim().toUpperCase() !== BEVESTIGWOORD || bezig} onClick={reset}>
              {bezig ? 'Bezig…' : 'Alles resetten'}
            </button>
            <button
              className="knop-secundair knop-klein"
              onClick={() => {
                setOpen(false);
                setInvoer('');
                setFout(null);
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
