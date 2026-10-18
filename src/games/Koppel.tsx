import { useEffect, useMemo, useRef, useState } from 'react';
import { Voortgangsteller } from '../components/ui';
import { maakSessie, type Vraag } from '../shared/leitner';
import { antwoordTekst, schud, vraagTekst } from '../shared/vragen';
import type { SpelProps } from './gedeeld';

const PER_RONDE = 6;

interface Paar {
  vraag: Vraag;
  links: string;
  rechts: string;
}

export function Koppel({ config, woorden, state, registreer, klaar }: SpelProps) {
  const woordMap = useMemo(() => new Map(woorden.map((w) => [w.id, w])), [woorden]);
  // Rondes van 6 paren; binnen een ronde geen dubbele antwoordteksten (anders is koppelen dubbelzinnig).
  const rondes = useMemo(() => {
    const vragen = maakSessie(woorden, config.richting, state.instellingen.sessieGrootte);
    const uit: Paar[][] = [];
    let huidig: Paar[] = [];
    const rest: Vraag[] = [];
    for (const v of vragen) {
      const w = woordMap.get(v.woordId)!;
      const p = { vraag: v, links: vraagTekst(w, v.richting), rechts: antwoordTekst(w, v.richting) };
      if (huidig.some((x) => x.rechts.toLowerCase() === p.rechts.toLowerCase() || x.links.toLowerCase() === p.links.toLowerCase())) {
        rest.push(v);
        continue;
      }
      huidig.push(p);
      if (huidig.length === PER_RONDE) {
        uit.push(huidig);
        huidig = [];
      }
    }
    if (huidig.length >= 2 || (huidig.length > 0 && uit.length === 0)) uit.push(huidig);
    else if (huidig.length === 1 && uit.length) uit[uit.length - 1].push(huidig[0]);
    return uit;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [ronde, setRonde] = useState(0);
  const paren = rondes[ronde] ?? [];
  const rechtsVolgorde = useMemo(() => schud(paren.map((_, i) => i)), [ronde]); // eslint-disable-line react-hooks/exhaustive-deps
  const [gekoppeld, setGekoppeld] = useState<Set<number>>(new Set());
  const [fout, setFout] = useState<Set<number>>(new Set());
  const [selLinks, setSelLinks] = useState<number | null>(null);
  const [selRechts, setSelRechts] = useState<number | null>(null);
  const [flits, setFlits] = useState<[number, number] | null>(null);
  const perfect = useRef(0);
  const totaalGedaan = rondes.slice(0, ronde).reduce((s, r) => s + r.length, 0) + gekoppeld.size;
  const totaal = rondes.reduce((s, r) => s + r.length, 0);

  useEffect(() => {
    if (rondes.length === 0) klaar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function probeer(l: number, r: number) {
    const paar = paren[l];
    const goed = paren[r].rechts.toLowerCase() === paar.rechts.toLowerCase();
    if (goed) {
      if (!fout.has(l)) registreer({ woordId: paar.vraag.woordId, richting: paar.vraag.richting, goed: true, soort: 'koppel' });
      const nieuw = new Set(gekoppeld).add(l);
      setGekoppeld(nieuw);
      setSelLinks(null);
      setSelRechts(null);
      if (nieuw.size === paren.length) {
        if (fout.size === 0) perfect.current++;
        setTimeout(() => {
          if (ronde + 1 >= rondes.length) {
            klaar({ perfecteKoppels: perfect.current });
          } else {
            setRonde(ronde + 1);
            setGekoppeld(new Set());
            setFout(new Set());
          }
        }, 600);
      }
    } else {
      if (!fout.has(l)) {
        registreer({ woordId: paar.vraag.woordId, richting: paar.vraag.richting, goed: false, soort: 'koppel' });
        setFout(new Set(fout).add(l));
      }
      setFlits([l, r]);
      setTimeout(() => {
        setFlits(null);
        setSelLinks(null);
        setSelRechts(null);
      }, 450);
    }
  }

  function klikLinks(i: number) {
    if (gekoppeld.has(i) || flits) return;
    if (selRechts !== null) probeer(i, selRechts);
    else setSelLinks(i === selLinks ? null : i);
  }
  function klikRechts(i: number) {
    if (gekoppeld.has(i) || flits) return;
    if (selLinks !== null) probeer(selLinks, i);
    else setSelRechts(i === selRechts ? null : i);
  }

  const stijl = (i: number, sel: number | null, kant: 0 | 1) => {
    if (gekoppeld.has(i)) return 'bg-emerald-500/20 ring-emerald-500/50 text-emerald-200 opacity-60';
    if (flits && flits[kant] === i) return 'bg-rose-500/30 ring-rose-400 animate-shake';
    if (sel === i) return 'bg-indigo-500/30 ring-indigo-400';
    return 'bg-slate-800 ring-slate-700 hover:bg-slate-700';
  };

  if (paren.length === 0) return null;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg text-slate-300">
          Ronde {ronde + 1} van {rondes.length} · klik een woord en daarna de vertaling
        </div>
        <Voortgangsteller gedaan={totaalGedaan} totaal={totaal} />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2 hoog:space-y-3">
          {paren.map((p, i) => (
            <button key={i} onClick={() => klikLinks(i)} className={`antwoordknop w-full ${stijl(i, selLinks, 0)}`}>
              {p.links}
            </button>
          ))}
        </div>
        <div className="space-y-2 hoog:space-y-3">
          {rechtsVolgorde.map((i) => (
            <button key={i} onClick={() => klikRechts(i)} className={`antwoordknop w-full ${stijl(i, selRechts, 1)}`}>
              {paren[i].rechts}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
