import { useStore } from '../store';

export function Meldingen() {
  const { meldingen, sluitMelding } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 hoog:bottom-6 hoog:right-6 hoog:w-96 flex-col gap-3">
      {meldingen.map((m) => (
        <button
          key={m.id}
          onClick={() => sluitMelding(m.id)}
          className={`pointer-events-auto flex animate-pop items-center gap-4 rounded-2xl p-4 text-left shadow-2xl ring-1 ${
            m.soort === 'achievement'
              ? 'bg-gradient-to-r from-amber-500/25 to-slate-900 ring-amber-400/50'
              : m.soort === 'medaille'
                ? 'bg-gradient-to-r from-yellow-400/30 to-slate-900 ring-yellow-300/60'
              : m.soort === 'level'
                ? 'bg-gradient-to-r from-indigo-500/30 to-slate-900 ring-indigo-400/50'
                : 'bg-slate-900 ring-slate-700'
          }`}
        >
          <span className="text-4xl">{m.icoon}</span>
          <span>
            <span className="block text-lg font-bold">{m.titel}</span>
            <span className="block text-slate-300">{m.tekst}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
