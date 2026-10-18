# Overhoren – woordjes oefenen

Een oefenapp voor woordjes Frans, Engels, Duits (en andere talen). Je laadt zelf een Excelbestand in, oefent op vijf manieren en de app onthoudt per woord hoe het gaat. Moeilijke woorden komen vaker terug. Je verdient punten, gaat levels omhoog, wint medailles en achievements, en ziet per dag hoeveel je geoefend hebt.

De app draait helemaal in de browser, via GitHub Pages. Er is geen installatie, account of server nodig: open de link en de app start. Iedereen houdt zijn eigen woordjes en voortgang bij, op zijn eigen apparaat. Er gaat niets naar internet.

## Starten

Open de link van de app in Chrome, Edge of Firefox, bijvoorbeeld `https://<gebruiker>.github.io/<repo>/`. Zet hem bij je favorieten.

- Gebruik geen privévenster (incognito). Daarin is je voortgang weg zodra je het venster sluit.
- Na het laden heeft de app geen verbinding meer nodig.

De app is gemaakt voor een gewoon laptopscherm (bijvoorbeeld 1366×768, ook met Windows-schaal 125%). Op een hoger scherm worden knoppen en teksten vanzelf wat ruimer. Is iets toch te groot of te klein, dan kun je in de browser zoomen met Ctrl + plus en Ctrl + min (Ctrl + 0 zet het terug).

## Woordjes inladen

Maak **één Excelbestand per vak per toets**. Het bestand heeft twee kolommen: in de eerste rij staan de twee talen, daaronder één woord per rij.

| Nederlands | Frans |
|------------|-------|
| de hond | le chien |
| kopen | acheter |
| de school | l'école |

- **Kolommen:** de kolom met de kop `Nederlands` is het Nederlands, de andere kolom is de vreemde taal (`Frans`, `Duits`, `Engels`, ...). De volgorde mag per bestand verschillen: `Duits | Nederlands` werkt ook.
- **De bestandsnaam maakt niet uit.** Vak en toets kies je zelf bij het inladen.
- **Eén antwoord per cel**, dus geen alternatieven. Alleen dat antwoord wordt goed gerekend.
- Zet lidwoorden erbij (*le chien*, *der Hund*, *the car*). Die tellen mee bij het nakijken.

Inladen:

1. Klik op **Woordjes inladen** en kies het bestand, of sleep het in het venster.
2. **Kies het vak.** Klik op een bestaand vak, of op **+ Nieuw vak** en typ de naam (bijvoorbeeld `Frans`). Het nieuwe vak wordt aangemaakt als je importeert. Typ je de naam van een vak dat al bestaat, dan krijg je een melding met een knop om dat vak te kiezen.
3. **Typ de naam van de toets**, bijvoorbeeld `H3`. Heeft het vak al toetsen, dan staan die eronder als knopjes; klik er een aan om woorden aan die toets toe te voegen.
4. Klik op **importeren**.

Goed om te weten:

- Laad je een bestand opnieuw in bij hetzelfde vak en dezelfde toets, dan worden alleen de nieuwe woorden toegevoegd. Bestaande woorden houden hun voortgang, een aangepaste Nederlandse vertaling wordt bijgewerkt.
- Lege of onvolledige rijen en dubbele woorden worden overgeslagen en met rijnummer gemeld.
- Een CSV-bestand werkt ook, met komma of puntkomma als scheidingsteken.
- Via **Voorbeeld downloaden** in de app krijg je `frans_voorbeeld.xlsx` met 20 woorden. Hetzelfde bestand staat ook in de map `overhoren`.

## Oefenen

Kies vak → toets(en) → richting (vreemde taal → Nederlands, andersom, of gemengd) → spelvorm:

| Spelvorm | Uitleg | Punten per goed antwoord |
|----------|--------|----------------------|
| Flashcards | Kaart omdraaien (spatie), dan "wist ik" (J) of "wist ik niet" (N) | 5 |
| Meerkeuze | 4 opties uit dezelfde toets (toetsen 1–4) | 10 |
| Typen | Zelf intypen, spelling telt | 20 |
| Koppelspel | 6 woordparen aan elkaar koppelen | 10 |
| Tijdrace | Zoveel mogelijk goed in 60 seconden (meerkeuze of typen) | 10 of 20 |

Elke 5 goed op rij levert bonuspunten op (+5 bij 5 op rij, +10 bij 10 op rij, tot maximaal +25).

### Samenvatting: gehaald of niet

Na elke sessie en elke proeftoets zie je een samenvatting:

- **Gehaald!** als je 75% of meer goed had, anders **Niet gehaald**. Dan zie je ook hoeveel antwoorden je nog meer goed had moeten hebben.
- Hoeveel je goed en fout had en hoeveel punten je verdiend hebt.
- Je level in dit vak, en hoeveel punten je nog nodig hebt voor het volgende level.
- De woorden die fout gingen, met de knop *Oefen de fouten*.

### Nakijken bij typen

- Hoofdletters en spaties aan begin/eind tellen niet mee. Voor **Duits** tellen hoofdletters wel mee (*der Hund*). Dat stel je per vak in onder ⚙️ Instellingen.
- **Accenten soepel** (standaard): `ecole` voor `école` is goed, maar je ziet de juiste spelling. **Streng**: telt als fout.
- **Lidwoorden** horen bij het antwoord. Een fout of vergeten lidwoord telt als fout, maar je krijgt de melding "woord goed, lidwoord fout".
- Bij een fout zie je het juiste antwoord met de verschillen gemarkeerd.
- Knopjes voor speciale tekens (é, ç, ß, ...) staan onder het invoerveld. Welke tekens er staan stel je per vak in.
- Wat je intypt is wat telt: een fout antwoord kun je achteraf niet alsnog goed laten rekenen.
- Je moet iets intypen voordat Enter (of **Nakijken**) werkt. Bij een leeg veld, of alleen spaties, gebeurt er niets en zie je "Typ eerst een antwoord". Dit geldt ook bij de tijdrace. Bij de proeftoets kun je een vraag die je echt niet weet overslaan met **Weet ik niet**; die telt als fout.

### Herhalen (spaced repetition)

Elk woord heeft per richting een bakje van 1 t/m 5. Goed betekent een bakje omhoog, fout betekent terug naar bakje 1. Woorden in lage bakjes en woorden die vaak fout gaan komen vaker terug. Een fout beantwoord woord komt in dezelfde sessie na een paar andere woorden nog een keer terug.

Een woord is **beheerst** als het in beide richtingen in bakje 4 of 5 zit.

### Startscherm

Op het startscherm staat per vak een kaart met alle toetsen van dat vak.

Met ✏️ naast de naam van een vak **wijzig je de vaknaam** (Enter = opslaan, Esc = annuleren). Je voortgang, de instellingen van het vak en het dagoverzicht gaan mee naar de nieuwe naam. Een naam die al bij een ander vak hoort kan niet.

Per toets zie je hoeveel woorden je beheerst en heb je drie knoppen:

- klik op de **naam** van de toets voor het overzicht (zie hieronder),
- **▶** om die toets meteen te oefenen,
- **🗑️** om de toets te verwijderen. Je krijgt eerst een bevestiging, want alle woorden van die toets en hun voortgang gaan weg. Wil je de toets later weer oefenen, laad het Excelbestand dan opnieuw in.

### Overzicht per toets

Klik op de naam van een toets op het startscherm. Je ziet dan:

- hoeveel woorden je beheerst,
- de lastigste woorden, met de knop *Oefen alleen deze*,
- **Toetsklaar?**: een proeftoets met alle woorden in beide richtingen. Je krijgt pas aan het eind feedback en een cijfer van 1 tot 10.

## Punten, levels en medailles

**Punten en levels per vak.** Punten tellen per vak: wat je bij Frans verdient, telt alleen voor Frans. Elk vak heeft dus zijn eigen level. Met je punten ga je levels omhoog, en elk level kost 100 punten meer dan het vorige:

| Level | Punten nodig voor dit level | Totaal |
|-------|-----------------------------|--------|
| 2 | 100 | 100 |
| 3 | 200 | 300 |
| 4 | 300 | 600 |
| 5 | 400 | 1000 |
| 10 | 900 | 4500 |

Hoe verder je komt, hoe lastiger het dus wordt om een level omhoog te gaan. Op het startscherm staat bij elk vak het level met een balk; tijdens het oefenen laat de balk bovenaan het level van het vak zien waarmee je bezig bent.

**Medailles.** In de 🏆 **Prijzenkast** win je medailles in vier niveaus: 🥉 brons, 🥈 zilver, 🥇 goud en 💎 platina.

| Medaille | Wat telt | 🥉 | 🥈 | 🥇 | 💎 |
|----------|----------|----|----|----|----|
| Woordenverzamelaar | goede antwoorden, alle sessies samen | 100 | 500 | 1500 | 5000 |
| Puntenjager | punten in je beste vak | 1000 | 5000 | 15000 | 50000 |
| Sessierecord | meeste goed in één sessie | 15 | 25 | 40 | 60 |
| Reeks | langste reeks goed op rij | 10 | 25 | 50 | 100 |
| Volhouder | dagen achter elkaar geoefend | 3 | 7 | 14 | 30 |
| Trouwe oefenaar | aantal dagen geoefend | 5 | 20 | 50 | 100 |
| Snelheidsduivel | record tijdrace | 10 | 15 | 20 | 30 |

Bij elke medaille zie je hoeveel je nog nodig hebt voor het volgende niveau. De grenzen staan in `src/shared/medailles.ts` en zijn daar makkelijk aan te passen.

**Achievements** zijn losse prestaties, zoals je eerste gehaalde sessie, een 8 of hoger bij een proeftoets, of *Doorzetter*: een woord dat 5 keer fout ging eindelijk 3 keer goed.

## Profiel en dagoverzicht

Vul bij ⚙️ **Instellingen** je naam in. Die staat dan rechtsboven. Klik op je naam om je profiel te zien:

- je totalen: goede antwoorden, gehaalde sessies, dagen geoefend en totale oefentijd;
- **Punten per dag**: een grafiek van één week, van maandag tot en met zondag, met de datum onder elke dag. Standaard zie je de huidige week. Met ◀ en ▶ ga je naar de vorige of volgende week; *Deze week* brengt je terug. Onder de grafiek staan de totalen van die week. Met de knoppen *Alle vakken*, *Frans*, *Duits*, ... laat je alleen de punten van één vak zien;
- **Punten per vak**: per vak je level, je punten deze week en in totaal, hoeveel je goed had en hoeveel sessies je gehaald hebt. Klik op een vak om de grafiek op dat vak te filteren;
- **Per dag** (voor de gekozen week): hoe lang je geoefend hebt, hoeveel vragen, hoeveel procent goed en hoeveel punten. Klik op een dag (in de lijst of op de staaf in de grafiek) om elke sessie te zien: tijd, toets, spelvorm, score, punten en of je hem gehaald hebt. Bij een proeftoets staat ook het cijfer.

De oefentijd per sessie telt maximaal een uur mee, zodat een vergeten open venster de dag niet vertekent.

## Een vak verwijderen

Onder ⚙️ **Instellingen** staat bij elk vak de knop **🗑️ Vak verwijderen…**. Na bevestigen verdwijnen alle woorden en toetsen van dat vak, wat je per woord beheerst, de punten en het level van dat vak, het vak in het dagoverzicht en de instellingen van het vak. Medailles, achievements en de andere vakken blijven staan.

Vlak voor het verwijderen downloadt de app automatisch een reservekopie (`voortgang-voor-reset-JJJJ-MM-DD-UUMMSS.json`). Zet die terug zoals beschreven bij *Back-up terugzetten* als het een vergissing was.

## Opnieuw beginnen (reset)

Onder ⚙️ **Instellingen → Voortgang resetten** zet je al je voortgang op nul:

- **Gaat naar 0:** de punten en levels van alle vakken, medailles, achievements, het dagoverzicht, je streak, en wat je per woord beheerst (alle woorden terug naar bakje 1).
- **Blijft staan:** je woordenlijsten, je naam en de instellingen per vak.

Je ziet eerst precies wat er verdwijnt. Daarna typ je `RESET` om te bevestigen. Vlak voor de reset maakt de app automatisch een reservekopie in `data\backups\` (`voortgang-voor-reset-JJJJ-MM-DD-UUMMSS.json`). Was het toch een vergissing, zet die kopie dan terug zoals beschreven bij *Back-up terugzetten*.

## Waar staat mijn voortgang?

Alles (woordenlijsten, voortgang, punten, medailles, achievements, het dagoverzicht en instellingen) staat **in de browser op dit apparaat** (localStorage). Het Excelbestand zelf hoeft niet bewaard te blijven: na het inladen staan de woordjes in de app.

- De app slaat automatisch op, direct na elk antwoord. Het vinkje ✓ rechtsboven betekent dat alles is opgeslagen.
- Elke andere browser, elk ander apparaat en elke andere gebruikersaccount op de computer heeft zijn eigen, losse voortgang.
- De app houdt in de browser zelf de laatste 3 dagelijkse reservekopieën bij. Raakt de opslag beschadigd, dan herstelt de app automatisch de nieuwste.
- **Let op:** wis je de browsergegevens (cookies en websitegegevens) van deze site, dan is je voortgang weg. Download daarom af en toe je voortgang.

### Back-up downloaden

Onder ⚙️ **Instellingen → Opslag en back-up** klik je op **💾 Voortgang downloaden**. Je krijgt een bestand `voortgang-JJJJ-MM-DD-UUMMSS.json` in je map Downloads. Daar zie je ook wanneer je voor het laatst gedownload hebt. Vóór een reset, het verwijderen van een vak of het terugzetten van een back-up downloadt de app automatisch een reservekopie (`voortgang-voor-reset-....json`).

### Back-up terugzetten of naar een ander apparaat

Klik op **📂 Voortgang terugzetten…** en kies een gedownload `.json`-bestand. Je ziet eerst wat er nu in de app staat en wat er in het bestand staat. Na bevestigen wordt de huidige stand vervangen. Zo zet je je voortgang ook over naar een andere laptop of browser.

Voortgang uit de oude versie met `start.bat` (`data\voortgang.json`) zet je op dezelfde manier over.

## Voor ontwikkelaars

```bash
npm install
npm test            # unit tests (Vitest): nakijken, herhalen, opslag, import, punten, medailles
npm run typecheck
npm run dev         # app met hot reload op http://localhost:5173
npm run build       # bouwt de statische app naar dist/
npm run preview     # de gebouwde app uit dist/ bekijken
npx tsx scripts/maak-voorbeeld.ts   # frans_voorbeeld.xlsx opnieuw maken (woorden staan in src/shared/template.ts)
```

Node.js is alleen nodig om te bouwen en te testen. De gebouwde app in `dist/` bestaat uit statische bestanden (HTML, JavaScript en CSS) en draait helemaal in de browser.

### Publiceren op GitHub Pages

1. Zet de code in een GitHub-repository en push naar de branch `main`.
2. Kies in de repository **Settings → Pages → Source: GitHub Actions** (eenmalig).
3. Elke push naar `main` start `.github/workflows/deploy.yml`: typecheck, tests, bouwen en publiceren. Na een paar minuten staat de app op `https://<gebruiker>.github.io/<repo>/`.

Vite bouwt met relatieve paden (`base: './'` in `vite.config.ts`), dus de naam van de repository maakt niet uit.

Structuur:

- `src/opslag.ts` bewaart de voortgang in de browser (localStorage), met dagelijkse reservekopieën en herstel. `src/api.ts` regelt het gebundeld opslaan, downloaden en terugzetten.
- `src/shared/` bevat de logica zonder UI: `grading.ts` (nakijken), `leitner.ts` (herhalen), `engine.ts` (antwoord en sessie verwerken, streak, dagoverzicht, gehaald), `xp.ts` (punten en levels), `vakken.ts` (vak hernoemen en verwijderen), `medailles.ts`, `achievements.ts`, `importExcel.ts`, `state.ts` (datamodel, standaardwaarden en migraties).
- `src/screens/` en `src/games/` bevatten de schermen en spelvormen.
- `tests/` bevat de unit tests.

De opgeslagen voortgang (en elk gedownload back-upbestand) heeft een `versie`-veld. Verandert het formaat, verhoog dan `HUIDIGE_VERSIE` in `src/shared/types.ts` en voeg een migratiestap toe aan `MIGRATIES` in `src/shared/state.ts`. Bestaande voortgang en oude back-ups worden dan bij het laden of terugzetten automatisch omgezet.
