import { useState } from 'react';
import { Kopbalk } from './components/Kopbalk';
import { Meldingen } from './components/Meldingen';
import type { Scherm } from './navigatie';
import { useStore } from './store';
import { Achievements } from './screens/Achievements';
import { Home } from './screens/Home';
import { Import } from './screens/Import';
import { Instellingen } from './screens/Instellingen';
import { Kies } from './screens/Kies';
import { Oefen } from './screens/Oefen';
import { Overzicht } from './screens/Overzicht';
import { Proeftoets } from './screens/Proeftoets';
import { Profiel } from './screens/Profiel';

/** Vak dat bij het huidige scherm hoort, voor het level in de kopbalk. */
function vakVan(scherm: Scherm, woordVak: (id: string) => string | undefined): string | undefined {
  switch (scherm.naam) {
    case 'kies':
      return scherm.vak ?? (scherm.woordIds?.[0] ? woordVak(scherm.woordIds[0]) : undefined);
    case 'overzicht':
      return scherm.vak;
    case 'oefen':
      return woordVak(scherm.config.woordIds[0]);
    case 'proeftoets':
      return woordVak(scherm.woordIds[0]);
    default:
      return undefined;
  }
}

export function App() {
  const { state } = useStore();
  const [scherm, setScherm] = useState<Scherm>({ naam: 'home' });
  // Nieuwe key bij elke navigatie zodat een sessie altijd vers begint.
  const [sleutel, setSleutel] = useState(0);
  const ga = (s: Scherm) => {
    setScherm(s);
    setSleutel((k) => k + 1);
    window.scrollTo(0, 0);
  };

  let inhoud;
  switch (scherm.naam) {
    case 'home':
      inhoud = <Home ga={ga} />;
      break;
    case 'import':
      inhoud = <Import ga={ga} />;
      break;
    case 'kies':
      inhoud = <Kies ga={ga} start={scherm} />;
      break;
    case 'oefen':
      inhoud = <Oefen ga={ga} config={scherm.config} />;
      break;
    case 'overzicht':
      inhoud = <Overzicht ga={ga} vak={scherm.vak} toets={scherm.toets} />;
      break;
    case 'proeftoets':
      inhoud = <Proeftoets ga={ga} woordIds={scherm.woordIds} titel={scherm.titel} />;
      break;
    case 'achievements':
      inhoud = <Achievements ga={ga} />;
      break;
    case 'instellingen':
      inhoud = <Instellingen ga={ga} />;
      break;
    case 'profiel':
      inhoud = <Profiel ga={ga} />;
      break;
  }

  return (
    <div className="min-h-screen">
      <Kopbalk
        vak={vakVan(scherm, (id) => state.woorden[id]?.vak)}
        naarHome={() => ga({ naam: 'home' })}
        naarAchievements={() => ga({ naam: 'achievements' })}
        naarInstellingen={() => ga({ naam: 'instellingen' })}
        naarProfiel={() => ga({ naam: 'profiel' })}
      />
      <main key={sleutel} className="mx-auto max-w-5xl px-4 py-4 hoog:px-6 hoog:py-8">
        {inhoud}
      </main>
      <Meldingen />
    </div>
  );
}
