import { useMemo, useState, type DragEvent } from 'react';
import { SchermKop, Terug } from '../components/ui';
import type { Navigeer } from '../navigatie';
import { leesWerkboek, naarRijen, vatSamen, voegSamen, type ImportResultaat } from '../shared/importExcel';
import { controleerVaknaam } from '../shared/vakken';
import { downloadTemplate, TEMPLATE_BESTANDSNAAM } from '../shared/template';
import { useStore } from '../store';

export function Import({ ga }: { ga: Navigeer }) {
  const { state, update, melding } = useStore();
  const [resultaat, setResultaat] = useState<ImportResultaat | null>(null);
  const [bestandsnaam, setBestandsnaam] = useState('');
  // Vak: een bestaand vak kiezen, of een nieuw vak aanmaken. De bestandsnaam speelt geen rol.
  const [gekozenVak, setGekozenVak] = useState<string | null>(null);
  const [nieuwVak, setNieuwVak] = useState(false);
  const [nieuweNaam, setNieuweNaam] = useState('');
  const [toets, setToets] = useState('');
  const [sleep, setSleep] = useState(false);

  const bestaandeVakken = useMemo(
    () => [...new Set([...Object.keys(state.vakken), ...Object.values(state.woorden).map((w) => w.vak)])].sort((a, b) => a.localeCompare(b, 'nl')),
    [state.vakken, state.woorden],
  );
  const maakNieuw = nieuwVak || bestaandeVakken.length === 0;
  const nieuweNaamSchoon = nieuweNaam.trim().replace(/\s+/g, ' ');
  const nieuwFout = maakNieuw && nieuweNaamSchoon ? controleerVaknaam(state, '', nieuweNaamSchoon) : null;
  /** Bestaand vak met dezelfde naam (op hoofdletters na) als de ingetypte nieuwe naam. */
  const bestaatAl = maakNieuw ? bestaandeVakken.find((v) => v.toLowerCase() === nieuweNaamSchoon.toLowerCase()) : undefined;
  const vak = maakNieuw ? (nieuwFout ? '' : nieuweNaamSchoon) : (gekozenVak ?? '');

  const bestaandeToetsen = useMemo(
    () =>
      [...new Set(Object.values(state.woorden).filter((w) => w.vak === vak).map((w) => w.toets))].sort((a, b) =>
        a.localeCompare(b, 'nl', { numeric: true }),
      ),
    [state.woorden, vak],
  );

  async function lees(bestand: File) {
    setBestandsnaam(bestand.name);
    setResultaat(leesWerkboek(new Uint8Array(await bestand.arrayBuffer())));
    setGekozenVak(null);
    setNieuwVak(false);
    setNieuweNaam('');
    setToets('');
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setSleep(false);
    const f = e.dataTransfer.files[0];
    if (f) void lees(f);
  }

  const klaar = !!resultaat && resultaat.paren.length > 0 && vak.trim() !== '' && toets.trim() !== '';
  const rijen = klaar ? naarRijen(resultaat.paren, vak, toets) : [];
  const samenvatting = klaar ? vatSamen(rijen, state)[0] : null;

  function importeer() {
    if (!klaar || !samenvatting) return;
    update((s) => voegSamen(s, rijen));
    melding({
      icoon: '✅',
      titel: `${vak.trim()} · ${toets.trim()} ingeladen`,
      tekst: `${samenvatting.nieuw} nieuwe woorden${samenvatting.bestaand ? `, ${samenvatting.bestaand} al aanwezig` : ''}.`,
      soort: 'info',
    });
    ga({ naam: 'home' });
  }

  return (
    <div>
      <SchermKop titel="Woordjes inladen" links={<Terug onClick={() => ga({ naam: 'home' })} />} />

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setSleep(true);
        }}
        onDragLeave={() => setSleep(false)}
        onDrop={onDrop}
        className={`kaart flex cursor-pointer flex-col items-center justify-center border-2 border-dashed py-8 text-center hoog:py-12 transition ${
          sleep ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        <div className="text-5xl">📄</div>
        <div className="mt-4 text-xl font-semibold">Sleep een Excelbestand hierheen of klik om te kiezen</div>
        <div className="mt-2 text-slate-400">Eén bestand per vak per toets · .xlsx, .xls of .csv</div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.ods"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void lees(f);
            e.target.value = '';
          }}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-slate-400">
        <button className="knop-secundair knop-klein" onClick={downloadTemplate}>
          ⬇ Voorbeeld downloaden ({TEMPLATE_BESTANDSNAAM})
        </button>
        <span>
          Twee kolommen met de talen als kop, bijv. <b>Nederlands</b> | <b>Frans</b> (volgorde maakt niet uit). Vak en toets kies je na het
          inlezen; de bestandsnaam maakt niet uit.
        </span>
      </div>

      {resultaat && (
        <div className="mt-5 space-y-4">
          {resultaat.paren.length > 0 && (
            <div className="kaart space-y-5">
              <h2 className="text-xl font-bold">
                {bestandsnaam}: {resultaat.paren.length} woorden gevonden
                <span className="ml-2 text-base font-normal text-slate-400">
                  ({resultaat.taal} ↔ Nederlands)
                </span>
              </h2>

              <div>
                <div className="mb-2 font-semibold">1. Voor welk vak is dit?</div>
                <div className="flex flex-wrap gap-2">
                  {bestaandeVakken.map((v) => (
                    <button
                      key={v}
                      className={`keuze py-2 ${!maakNieuw && gekozenVak === v ? 'keuze-actief' : ''}`}
                      onClick={() => {
                        setGekozenVak(v);
                        setNieuwVak(false);
                        setToets('');
                      }}
                    >
                      {v}
                    </button>
                  ))}
                  {bestaandeVakken.length > 0 && (
                    <button
                      className={`keuze py-2 ${maakNieuw ? 'keuze-actief' : 'text-slate-300'}`}
                      onClick={() => {
                        setNieuwVak(true);
                        setGekozenVak(null);
                        setToets('');
                      }}
                    >
                      + Nieuw vak
                    </button>
                  )}
                </div>
                {maakNieuw && (
                  <div className="mt-3">
                    <input
                      className="invoer max-w-md text-xl"
                      value={nieuweNaam}
                      maxLength={40}
                      onChange={(e) => setNieuweNaam(e.target.value)}
                      placeholder="Naam van het nieuwe vak, bijv. Frans"
                      aria-label="Naam van het nieuwe vak"
                      autoFocus
                    />
                    {nieuwFout && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-rose-300">
                        {nieuwFout}
                        {bestaatAl && (
                          <button
                            className="knop-secundair knop-klein"
                            onClick={() => {
                              setGekozenVak(bestaatAl);
                              setNieuwVak(false);
                              setNieuweNaam('');
                            }}
                          >
                            Kies {bestaatAl}
                          </button>
                        )}
                      </div>
                    )}
                    {!nieuwFout && nieuweNaamSchoon && (
                      <div className="mt-1 text-sm text-emerald-300">Nieuw vak "{nieuweNaamSchoon}" wordt aangemaakt bij het importeren.</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 font-semibold">2. Naam van de toets</div>
                <input
                  className="invoer max-w-md text-xl"
                  value={toets}
                  onChange={(e) => setToets(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && importeer()}
                  placeholder="bijv. H3"
                  aria-label="Naam van de toets"
                  disabled={!vak}
                />
                {!vak && <div className="mt-1 text-sm text-slate-400">Kies eerst een vak.</div>}
                {vak && bestaandeToetsen.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                    Aanvullen bij een bestaande toets van {vak}:
                    {bestaandeToetsen.map((t) => (
                      <button
                        key={t}
                        className={`rounded-full px-3 py-1 font-semibold ring-1 ${
                          toets.trim().toLowerCase() === t.toLowerCase()
                            ? 'bg-indigo-500/30 text-indigo-100 ring-indigo-400'
                            : 'bg-slate-800 text-slate-300 ring-slate-700 hover:bg-slate-700'
                        }`}
                        onClick={() => setToets(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {samenvatting && (
                <div className="rounded-2xl bg-slate-950/50 p-4 text-lg">
                  <span className="text-emerald-300">{samenvatting.nieuw} nieuw</span>
                  {samenvatting.bestaand > 0 && (
                    <span className="text-slate-400"> · {samenvatting.bestaand} al aanwezig (voortgang blijft behouden)</span>
                  )}
                </div>
              )}

              <details className="text-slate-300">
                <summary className="cursor-pointer text-slate-400">Woorden bekijken</summary>
                <table className="mt-3 w-full text-left">
                  <thead className="text-sm text-slate-400">
                    <tr>
                      <th className="pb-1 font-medium">{resultaat.taal}</th>
                      <th className="pb-1 font-medium">Nederlands</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultaat.paren.map((p) => (
                      <tr key={p.bron} className="border-t border-slate-800">
                        <td className="py-1">{p.vreemd}</td>
                        <td className="py-1">{p.nederlands}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          )}

          {resultaat.fouten.length > 0 && (
            <div className="kaart ring-rose-500/40">
              <h2 className="mb-3 text-xl font-bold text-rose-300">
                ⚠ {resultaat.fouten.length} {resultaat.fouten.length === 1 ? 'probleem' : 'problemen'}
              </h2>
              <ul className="max-h-72 space-y-1 overflow-auto">
                {resultaat.fouten.map((f, i) => (
                  <li key={i}>
                    <span className="font-semibold text-rose-200">{f.bron}:</span> <span className="text-slate-300">{f.melding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4">
            <button className="knop-groen" disabled={!klaar} onClick={importeer}>
              ✓ {resultaat.paren.length} woorden importeren
            </button>
            <button className="knop-secundair" onClick={() => setResultaat(null)}>
              Annuleren
            </button>
          </div>
          {resultaat.paren.length > 0 && !klaar && (
            <p className="text-slate-400">{!vak ? 'Kies eerst het vak, of maak een nieuw vak aan.' : 'Vul nog de naam van de toets in.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
