# ARISE — Hunter Training System
## Master Briefing Document (v15)

> Klistra in detta dokument i en ny Claude Code-session och säg:
> **"Bygg/uppdatera appen baserat på briefingen nedan. Använd React eller plain HTML/JS, spara så jag kan öppna i webbläsaren."**

> **Nytt i v5:** Starta Pass-modal, övningsbibliotek, warm-up-generator, Daily Quest omdesignad, kostplan per träningsprofil, Jonathans fullständiga profil dokumenterad (ej implementerad än — aktiveras i Fas 2).

> **Nytt i v6:** Rättat Ranksystem-sektionen till den faktiska XP-formeln som körs i koden (den absoluta arithmetic-formeln — v5 visade av misstag en gammal, avfärdad formel). Fixat bugg där knappen för dagens pass förblev aktiv efter avslutat Starta Pass-flöde.

> **Nytt i v7:** Specificerat tre nya features: namnbyte av ICA-tips-panelen, drop odds-visning innan gate öppnas, och salvage-system för oönskade items.

> **Nytt i v8:** Alla tre features från v7 implementerade och verifierade — ✅ SNACK_TIPS-namnbyte, ✅ drop odds-chip på gate-korten (inkl. pity-visning), ✅ salvage-system (XP via `addXP()`, appliceras passiver men ej skill-tree-bonusar).

> **Nytt i v9:** ✅ **Fas 2 (Supabase/multiplayer) implementerad och verifierad.** Två separata briefar kördes: Brief A (Sonnet 5 — schema, PIN-baserad profilval/onboarding) och Brief B (Fable 5 — Realtime boss-HP-synk, race-condition-hantering via atomär server-side uppdatering, migrering av skadelogik till delad state). Jonathans profil är nu aktiv och valbar. Se ny sektion **"Fas 2 — Multiplayer-arkitektur"** nedan för fullständig teknisk dokumentation. Spelare startade om från E1 vid migreringen (avsiktligt, ingen data fördes över från Fas 1-localStorage).

> **Nytt i v10:** Omdesignad Boss HP-modell efter speltestning med två spelare avslöjade en obalanserad rank-up-spik (800→2400 HP direkt vid E20→D1). Boss HP är nu en **statisk tabell per rank OCH nivå** (inte bara per rank), designad utifrån en `targetPasses`-princip — se ny sektion i "Boss Fight-system". `BASE_GYM`, `BASE_CARDIO`, `BASE_QUEST` är flatade över gate-typer (samma skada oavsett Normal/High-Rank/Red Gate); all svårighetsskillnad mellan gate-typer sitter nu i HP-tabellen istället. Gammal `BASE_HP[gateType][rank]`-tabell och de gate-typs-uppdelade skadetabellerna är borttagna och ersatta.

> **Nytt i v11:** Två ändringar: (1) Boss-benämning på gate-korten rättad för att matcha v10:s HP-modell — UI:t påstod tidigare att High-Rank/Red Gate-bossar var en rank högre än spelaren, trots att v10 flyttade all svårighetsskillnad in i HP-tabellen (ingen faktisk rank-hoppning längre). Nya labels: Normal Gate = "[Rank]-Rank Boss", High-Rank Gate = "[Rank]-Rank Elite Boss", Red Gate = "[Rank]-Rank Ascendant Boss" — alltid spelarens faktiska rank. (2) Antal droppade items per gate-seger justerat, se "Antal items per gate-seger".

> **Nytt i v12:** ✅ **Bugg fixad — oavsiktlig start-inventory borttagen.** Nya profiler startade felaktigt med 8 hårdkodade demo-items (`DEMO_ITEMS`) istället för en tom inventory. Kvarleva från tidig utveckling (användes för att snabbt kunna testa UI för alla rariteter/slots) som aldrig plockades bort inför Fas 2. Buggen låg i `defaultState()`-funktionen (inventory-fältet) samt i `loadState()`-funktionens item-migreringsblock i `arise.html`. Båda ställena är nu rättade — nya profiler startar med `inventory: []`. Samtliga befintliga profilers (Philip, Jonathans) sparade inventory har även nollställts manuellt, så alla står nu på 0 items. Se "Inventory-system" för uppdaterad startregel.
>
> **Nytt i v12 (2):** ✅ **Mobilhosting via GitHub Pages satt upp.** Appen är nu publicerad live på en publik URL så den kan öppnas direkt på mobilen (och av Jonathan), istället för att bara köras lokalt via `arise.html`. Repot är **publikt** (medvetet val — se "Hosting & Deployment" nedan för avvägningen kring Supabase anon-key-exponering). Se ny sektion **"Hosting & Deployment"** för URL, repo-struktur och pusha-flöde.
>
> **Nytt i v13:** ✅ **Leaderboard-bugg fixad — hårdkodad vän-lista borttagen.** RANKS-tabben visade fyra påhittade demo-vänner sedan Fas 1, som aldrig byttes ut mot riktig Supabase-data när Fas 2 landade (samma mönster som DEMO_ITEMS-buggen i v12). Ersatt med live hämtning från `profiles`-tabellen. Upptäckte samtidigt att `profiles.rank/level/xp` aldrig synkades från klientens lokala state efter profilskapande (frusen vid E1 för alltid) — lade till en liten fire-and-forget-synk (`syncProfileRank()`) så leaderboarden faktiskt visar verklig progress. Se "Vänner / Leaderboard (RANKS-tab)" för detaljer.
>
> **Nytt i v14:** ✅ **Riktigt preset-system byggt — `preset_key` gjorde faktiskt ingenting förrän nu.** Vid granskning inför Markus (profil 3) visade det sig att `preset_key` (satt sedan v9/Fas 2) aldrig band till någon faktisk data — det styrde bara badge-texten (PHILIP/JONATHAN/CUSTOM) på profilväljaren. Alla profiler körde på ett enda hårdkodat `defaultState()` (Philips siffror: 73kg/187cm/27år/Ectomorph/Build Muscle), en enda global `BRO_SPLIT`-träningssplit och en enda global `KOSTPLAN_MEALS`-kostplan vars ingress bokstavligen var hårdkodad till "Anpassad för Philip". Jonathans fullständiga profil (dokumenterad nedan sedan v5) kom alltså **aldrig** in i koden — precisionen "Träningsprofil-koppling ska väljas dynamiskt (Fas 2)" i Kostplan-sektionen blev aldrig infriad. Detta är nu åtgärdat:
> - Ny `PRESETS`-datastruktur (`arise.html`) — varje preset (`philip`/`jonathan`/`markus`) bär egna fysiska mått, ett **explicit nutritionsmål** (kcal/protein/vatten — beräknas INTE via `calcNutrition()`s generiska BMR-formel, eftersom verkliga mål sällan matchar vad formeln ger), ett veckoschema + `customWorkouts`, och en kostplan-måltidslista.
> - `defaultState(presetKey)` och `loadState(presetKey)` slår upp presetet och fyller profilfält, schema, träningspass och nutritionsmål vid profilskapande. `calcNutrition()` returnerar presetets explicita mål om ett finns, annars den gamla generiska formeln (scratch-profiler opåverkade).
> - Kostplanens ingress är nu beräknad från `state.name/weight/bodyType/goal` istället för hårdkodad text — gäller alla profiler, inte bara Philip.
> - Ny schema-dagstyp `cardio` (separat från `gym`/`rest`) med egen tagg, dag-detaljvy och en "LOG CARDIO"-genväg till Log-fliken — behövdes för Markus separata cardio-pass.
> - **Icke-destruktiv retrofit:** ny knapp `🔁 SYNC PRESET DATA` (Demo Tools) skriver om profil/nutrition/schema/kostplan från `PRESETS[state.presetKey]` UTAN att röra rank/xp/stats/inventory/gate/loggar. `completeLogin()` backfillar `state.presetKey` från Supabase-radens `preset_key` vid varje inloggning (funkar för profiler skapade före v14, t.ex. Jonathan). Se "Profil 3 — Markus" för hans data samt not om att Jonathans lokala enhet fortfarande behöver en engångs-tryckning på synk-knappen för att gamla sparade fält (vikt/schema/etc) ska uppdateras — helt nya fält (nutritionsmål, kostplan) fylls i automatiskt vid nästa inloggning utan knapptryck.
> - Öppen punkt löst: aktivitetsmultiplikator-formeln formaliserades INTE till en tabell — istället lagras varje namngiven profils nutritionsmål explicit (ej extrapolerat), vilket är mer robust än att gissa en multiplikator per dagar/vecka.
>
> **Nytt i v15:** ✅ **Skill Tree V2 implementerat — gamla 4-skill-systemet helt borttaget.** Iron Body/Endless Runner/Disciplined Mind/Shadow Step (flat XP% per aktivitetstyp) ersatta av 5 nya skills som var och en kroksar in i en annan mekanik: Legendary+ Likelihood (loot-tur, multiplikativ, clampad 100%), Bonus Item Chance (loot-antal), Broad Power (STR/AGI/VIT samtidigt), Discipline (DIS→crit), Streak Damage (bossdamage, kräver ≥2-dagars tränings-streak). Ny cap-formel `min(30, (rank+1)×10)` — E:10/D:20/C+:30. Alla formler enhetstestade mot briefens räkneexempel inklusive clamp-edge-caset (Red Gate S, 78%×1,45=113,1%→100%). Migrering (Alternativ A) körs automatiskt via `loadState()`: gamla spenderade poäng läggs tillbaka i `skillPoints`-poolen, allokering nollställs — verifierat med en simulerad gammal sparfil. Ny tränings-streak (`currentStreakDays`/`lastTrainedDate`, lokalt state) testad end-to-end mot briefens exakta scenario (logga 2 dagar i rad → bonus aktiveras; hoppa över en dag → bonus försvinner), inklusive att `⏱ SIM DAY END` nu driver samma break-check som en riktig dagsväxling. Kalenderdag-antagandet för streak bekräftat av Philip. Se ny sektion **"Skill Tree V2"** för fullständig formelspec.
>
> **Nytt i v15 (2):** ✅ **Cloud-mirror + manuell korrigeringsknapp för skills/streak.** Uppföljning på frågan "fungerar lokalt state med multiplayer, och kan jag rätta vänners data senare?" — svar: multiplayer-gaten påverkas inte (varje klient räknar sin egen skada lokalt och skickar bara *resultatet*, exakt som stats/items redan gör), men korrigerbarhet var ett verkligt hål. Löst genom att utöka den befintliga `notification_state`-spegeln (som redan skrev `skill_points` för push-notiser) med `skills` (jsonb), `current_streak_days`, `last_trained_date` — skrivs fire-and-forget vid varje `saveState()` (samma mönster som redan fanns). Ny knapp `☁️ PULL FROM CLOUD` (Demo Tools) hämtar denna rad och applicerar den lokalt — enda vägen data flödar tillbaka, helt manuellt/explicit (inget auto-pull vid inloggning). Flöde för att rätta en väns data: Philip kör en SQL `UPDATE notification_state SET skills=...` mot raden, vännen trycker `PULL FROM CLOUD` en gång på sin egen enhet. Verifierat end-to-end mot en temporär testprofil (skriv → SQL-korrigering → pull → lokalt state matchade exakt).
>
> **Referensdokument:** Referera till `ARISE_items_v1.md` för fullständig item-lista. Referera till `ARISE_briefing_items.md` för detaljerad passiv-logik per item. Referera till `ARISE_Fas2_Brief_A_Sonnet_Setup.md` och `ARISE_Fas2_Brief_B_Fable_MultiplayerSync.md` för de ursprungliga implementationsbriefarna om lågnivådetaljer behövs.

---

## Vad är ARISE?

En gamifierad träningsapp inspirerad av Solo Leveling (manhwa/anime). Användare levlar upp, samlar XP och rankar upp genom att träna, köra cardio och nå nutritionsmål. Estetiken är mörk blå cyberpunk/system UI — neon cyan-kanter, bracket-knappar, kretskortsbakgrund.

---

## Användarprofiler

### Profil 1 — Philip (aktiv, implementerad)

```
Name:       Philip
Age:        27
Gender:     Male
Weight:     73 kg
Height:     187 cm
Body type:  Ectomorph
Goal:       Build Muscle
Split:      Bro Split
Days/week:  4
```

**Nutritionsmål:** ~3 200 kcal · ~146g protein · ~2.6L vatten

Beräknat med Mifflin-St Jeor BMR:
- Man: `10×weight + 6.25×height - 5×age + 5`
- Aktivitetsmultiplikator 4 dagar/vecka: `×1.465`
- Bygga muskler: `+250 kcal` till TDEE, protein `2.0g per kg`
- Vatten: `weight × 0.035` liter

---

### Profil 2 — Jonathan (✅ AKTIV — sedan Fas 2)

> Jonathans profil är nu valbar via PIN-baserad profilval vid appstart (se "Fas 2 — Multiplayer-arkitektur"). All data nedan är den fullständiga preset som laddas när profilen väljs.

```
Name:       Jonathan
Age:        28
Gender:     Male
Weight:     78 kg
Height:     181 cm
Body type:  Mesomorph
Goal:       Recomp (minska fett, bli starkare)
Split:      Upper/Lower + Cardio-hybrid
Days/week:  4
```

**Nutritionsmål:** ~2 500 kcal · ~170g protein · ~2.7L vatten

#### Jonathans träningsschema

**Dag 1 — Överkropp Styrka** (tung, 4 sets, 5–8 reps)
- Bänkpress 4×5–8
- Skivstångsrodd 4×5–8
- Overhead Press 4×5–8
- Latsdrag 4×5–8
- Triceps Pushdown 3×10–12
- Skivstångscurl 3×10–12

**Dag 2 — Underkropp Styrka** (tung, 4 sets, 5–8 reps)
- Knäböj 4×5–8
- Rumänsk marklyft 4×5–8
- Benpress 3×8–10
- Hip Thrust 3×8–10
- Stående Calf Raise 3×12–15

**Dag 3 — Cardio + Core**
- Löpning eller cykel 25–30 min (måttlig intensitet)
- Plankan 3×45–60 sek
- Crunches 3×20
- Russian Twists 3×20

**Dag 4 — Full Body Hypertrofi** (lättare, 10–15 reps)
- Hantelpress (lutande) 3×10–12
- Kabelrodd 3×12–15
- Laterallyft 3×12–15
- Bulgariska utfallssteg 3×10/sida
- Leg Curl 3×12–15
- Face Pulls 3×15
- Hammer Curl 3×12–15

#### Jonathans kostplan

| Måltid | Innehåll | Kcal | Protein |
|---|---|---|---|
| Frukost | Kvarg 200g + bär + nötter 20g | ~350 | ~25g |
| Mellanmål 1 — ca 11:00 | Kvarg 150g + frukt | ~200 | ~18g |
| Lunch — ca 13:00 | Proteinkälla 200g + kolhydratkälla 150g + grönsaker | ~650 | ~45g |
| Mellanmål 2 — eftermiddag | Proteinrikt alternativ (shake, kvarg 200g, greek yoghurt eller cottage cheese) | ~200 | ~35–40g |
| Middag — ca 18:30–19:00 | Proteinkälla 200g + kolhydratkälla 150g + grönsaker | ~700 | ~45g |
| **Totalt** | | **~2 100 kcal*** | **~168–173g** |

*Resterande ~400 kcal täcks naturligt av variation i tillagning och portionsstorlekar.*

#### Tips to think about (visas i appen under kostplanen)

**Enkla kaloriskärningar:**
- Byt söta/processade snacks mot protein-alternativ (kvarg, greek yoghurt, cottage cheese)
- Dressingar, såser och oljor adderar snabbt 200–300 kcal — använd sparsamt eller byt mot magrare alternativ
- Dryck är ofta dolda kalorier — läsk, juice och alkohol är det snabbaste att skära bort
- Panering och fritering lägger till kalorier utan mätnadsvärde — byt mot ugn eller grillat när möjligt

**Tänk såhär:**
- Bygg varje måltid runt proteinkällan — fyll ut med grönsaker och kolhydrater efteråt
- Grönsaker är "gratis" — stor volym, låg kalorier, mättar bra
- Håll koll på portionsstorleken på kolhydrater — lätt att omedvetet äta mer än planerat
- Konsistens slår perfektion — en bra dag varje dag är bättre än en perfekt dag följt av tre dåliga

---

### Profil 3 — Markus (✅ AKTIV — sedan v14)

> Markus profil är valbar via PIN-baserad profilval vid appstart, precis som Philip och Jonathan. All data nedan är den fullständiga preset (`PRESETS.markus`) som laddas när profilen väljs.

```
Name:       Markus
Age:        26
Gender:     Male
Weight:     92 kg
Height:     175 cm
Body type:  Endomorph
Goal:       Fettförlust, bibehåll muskler (cut)
Split:      PPL + Cardio-hybrid
Days/week:  5 gym + 2 cardio (separata pass)
```

**Nutritionsmål:** ~2 100 kcal · ~156g protein · ~3.2L vatten

> Detta mål är ett medvetet kraftigare underskott än vad den generiska BMR×1.465-formeln (se Profil 1) skulle ge — precis som Jonathans mål inte matchar formeln exakt. Lagras därför som ett explicit `nutrition`-block i presetet, inte uträknat live. Se "Nytt i v14" ovan.

#### Markus träningsschema

**Dag 1 — Push (Bröst/Axlar/Triceps)**
- Bänkpress 4×8–12
- Hantelpress (lutande) 3×10–12
- Militärpress 3×10–12
- Sidolyft 3×12–15
- Triceps Pushdown 3×12–15

**Dag 2 — Pull (Rygg/Biceps)**
- Marklyft 4×6–10
- Latsdrag 4×8–12
- Skivstångsrodd 3×10–12
- Face Pulls 3×15
- Hantelcurl 3×12–15

**Dag 3 — Cardio**
- Löpning eller cykel, 25–30 min, måttlig intensitet

**Dag 4 — Legs (Ben)**
- Knäböj 4×8–12
- Rumänsk marklyft 3×10–12
- Benpress 3×10–12
- Bulgariska utfallssteg 3×10/sida
- Stående Calf Raise 3×15–20

**Dag 5 — Upper Accessory (Hypertrofi)**
- Kabelrodd 3×12–15
- Hammer Curl 3×12–15
- Dips eller Triceps-maskin 3×12–15
- Laterallyft 3×15
- Plankan 3×45–60 sek + Russian Twists 3×20

**Dag 6 — Cardio**
- Löpning eller cykel, 25–30 min, måttlig intensitet

**Dag 7 — Full Body (lätt benfokus, upper/core-tungt)**
- Rodd (maskin) 3×12–15
- Hantelpress, stående (axlar) 3×10–12
- Kabeldrag rak arm (rygg) 3×12–15
- Goblet Squat 2×12 (lätt underhåll, ej tungt benfokus)
- Core-cirkel: crunches 3×20, Russian Twists 3×20, Plankan 3×45–60 sek

#### Markus kostplan

| Måltid | Innehåll | Kcal | Protein |
|---|---|---|---|
| Frukost | Kvarg 200g + bär + nötter 15g | ~300 | ~26g |
| Mellanmål 1 | Kvarg 150g + frukt | ~180 | ~16g |
| Lunch | Proteinkälla 180g + kolhydratkälla 120g + grönsaker | ~560 | ~42g |
| Mellanmål 2 | Proteinshake eller kvarg 150g | ~160 | ~30g |
| Middag | Proteinkälla 180g + kolhydratkälla 100g + grönsaker | ~600 | ~42g |
| **Totalt** | | **~1 800 kcal*** | **~156g** |

*Resterande ~300 kcal täcks av fri variation (extra portion kolhydrat/protein) — lämnat öppet med flit, samma stil som Jonathans "resterande kcal"-not.

---

## Ranksystem

Ranks: **E → D → C → B → A → S**
Varje rank har **20 levels** (E1–E20, D1–D20, osv.)

### XP-kostnad per level

Linjär kurva över 120 absoluta nivåer:
```
absoluteLevel = rankIndex × 20 + levelNumber    (E1 = 1 … S20 = 120)
xpForLevel = 100 + (absoluteLevel − 1) × 35
```
Konstanter: `BASE_COST = 100` (XP för E-rank lv 1), `STEP = 35` (ökning per absolut nivå)

Där rankIndex: E=0, D=1, C=2, B=3, A=4, S=5

Exempel:
| Nivå | Absolut | XP till nästa level |
|---|---|---|
| E-rank lv 1 | 1 | 100 |
| E-rank lv 10 | 10 | 415 |
| E-rank lv 20 | 20 | 765 |
| D-rank lv 1 | 21 | 800 |
| C-rank lv 1 | 41 | 1 500 |
| S-rank lv 20 | 120 | 4 265 |

**Designad för 2–3 år av konsekvent träning vid ~75% efficiency.**

### Rank-up flöde
När användaren når level 20 och fyller XP-baren:
1. Guldbanner visas: *"E20 MASTERED — RANK UP AVAILABLE"*
2. Notis-popup visas (Solo Leveling-stil): *"[E-rank Hunter] → [D-rank Hunter]"*
3. Användaren klickar **[ RANK UP ]**
4. Formulär visas för att uppdatera: nuvarande vikt + baslyft (bänk, knäböj, marklyft, press)
5. Rank avancerar, level återställs till 1, XP återställs till 0

### Level-up-notis
Varje gång användaren får en ny level (inte bara rank-up), visas en popup:
- Header: **NOTIFICATION** med `!`-ikon
- Body: *"Leveled up!"* i kursiv vit text
- Visar ny rank+level i rank-färg
- *"+1 skill point awarded"*
- Försvinner automatiskt efter ~3 sekunder, tryck för att stänga tidigt

### Rank-färger
- E: `#9ca3af` (grå) — Iron Hunter
- D: `#34d399` (grön) — Bronze Hunter
- C: `#60a5fa` (blå) — Silver Hunter
- B: `#c084fc` (lila) — Gold Hunter
- A: `#fb923c` (orange) — Platinum Hunter
- S: `#fbbf24` (guld) — Shadow Monarch

---

## XP-källor & formler

### Gympass
| Rank | Gym XP per pass |
|---|---|
| E | 100 |
| D | 150 |
| C | 200 |
| B | 250 |
| A | 275 |
| S | 300 |

### Cardio-pass
```
XP = Math.round(km × 20 × (1 + Endless Runner bonus))
```

### Daily Quest
```
XP = Math.round(75 × (1 + Shadow Step bonus))
```

### Nutrition check-in (per JA-svar)
```
XP = Math.round(10 × (1 + Disciplined Mind bonus))
```

### Boss-belöning (vid seger)
| Rank | XP per besegrad boss |
|---|---|
| E | ~630 XP |
| D | ~840 XP |
| C | ~1 025 XP |
| B | ~1 200 XP |
| A | ~1 260 XP |
| S | ~1 360 XP |

### XP-modifiering från item-passiver
Alla XP-multiplikatorer summeras och appliceras en gång:
```js
finalXP = baseXP × (1 + sumOfAllXPBonuses)
```

---

## Skill Tree V2

> **Status: ✅ Implementerat (v15).** V1 (Iron Body/Endless Runner/Disciplined Mind/Shadow Step — flat XP% per aktivitetstyp) är helt borttaget ur koden. Full formelspec fanns i `ARISE_Brief_SkillSystemV2.md`; detta är den uppdaterade referensen efter implementation.

Spelaren tjänar fortfarande **1 skill point per level-up**. De 5 nya skillsen kroksar var och en in i en annan spelmekanik istället för att alla dela samma XP%-mall:

| Skill | Ikon | Kroksar in i | Effekt |
|---|---|---|---|
| Legendary+ Likelihood | 🍀 | Loot-tur | `legendaryPlusRate(baseRate, pts) = min(1.0, baseRate×(1+pts×0.015))` — multiplikativ bonus på Legendary/Arcane grundraten, clampad vid 100%. Rör INTE pity-räknaren direkt (indirekt påverkan via fler faktiska Leg/Arc-utfall, avsiktligt). |
| Bonus Item Chance | 🎁 | Loot-antal | `bonusItemChance(0.35, pts) = min(1.0, 0.35+pts×0.01)` — 35%→65% vid 30p. |
| Broad Power | 💪 | STR/AGI/VIT | `+0.7%/pt` samtidigt på alla tre — pluggar direkt in i `effectiveStat()`, kaskaderar automatiskt till bossdamage/maxHP/allt annat som redan läser den. |
| Discipline | 🎯 | DIS → crit | `+0.5%/pt` på DIS via samma `effectiveStat()`-mönster, kaskaderar automatiskt in i `critMult()`. |
| Streak Damage | 🔥 | Bossdamage | `+0.5%/pt`, aktiv endast vid sammanhängande tränings-streak ≥2 kalenderdagar (se "Tränings-streak" nedan). |

### Poängtak per skill
- Cap = `skillCap(rankIndex) = min(30, (rankIndex+1)×10)` → E:10, D:20, C:30 — därefter fast tak på 30 (B/A/S och framtida ranker ovanför S hanteras redan korrekt av `min(30, …)`, ingen kodändring behövs när fler ranker läggs till).
- Fri fördelning mellan skills från C-rank och uppåt (inga per-skill-låsningar, bara det gemensamma 30-taket).
- Total poängbudget: 120 idag (5 skills × 30 cap = 150 max möjligt om budgeten når 150 senare) — **du kan aldrig maxa alla 5 skills** samtidigt som du växer.

### Tränings-streak (`currentStreakDays` / `lastTrainedDate`)
Lokalt state (localStorage, samma mönster som `weeklyGym`/`lastDate` — synkas aldrig till Supabase, precis som skills aldrig gjorde det innan heller). Räknas som **kalenderdag** (bekräftat av Philip):
- Loggar gym/cardio → `registerTrainingDay()`: samma dag igen = ingen ändring, dagen efter senaste = streak+1, annars streak=1.
- Vid varje dagsgräns-koll (riktig eller simulerad via `⏱ SIM DAY END`) → `checkStreakBreak()`: om `lastTrainedDate` varken är idag eller igår, nollställ streak till 0.
- `SIM DAY END`-knappen driver ett dedikerat `streakDemoOffset`-fält (endast för streak-testning) så streak kan testas snabbt utan att vänta på riktiga kalenderdagar.

### Migrering (Alternativ A) — ✅ Körd
`loadState()` känner igen gamla sparfiler (nyckel `ironBody` finns i `state.skills`) och konverterar automatiskt vid nästa inloggning: alla gamla spenderade poäng (Philip/Jonathan/Markus) läggs tillbaka till `skillPoints` (oförbrukad pool), `skills`-objektet nollställs till de 5 nya nycklarna. Rank/level/xp/stats orörda. Ingen Supabase-migrering behövdes — skill-allokering har aldrig synkats till `profiles`-tabellen (samma sak gäller nu streak-state).

**Avvikelser mot ursprunglig spec:** (1) Streak- och skill-state är fortfarande *lokalt* auktoritativt state (localStorage) snarare än Supabase-kolumner som brief-förslaget föreslog — men speglas nu (write-only) till `notification_state` för synlighet/backup, med en manuell `PULL FROM CLOUD`-knapp för korrigering. Se "Nytt i v15 (2)". (2) Tog samtidigt bort 4 föräldralösa item-passiver (`iron_resolve`, `paralysis_resistance_amulet/pants`, `all_seeing`) som bara drev V1:s XP-bonusar och inte används av något föremål i nuvarande inventory. (3) Drop-odds-koden (`rollRarity` + gate-kortens odds-chip) var duplicerad innan — refaktorerad till en delad `effectiveDropOdds()`-funktion så de två aldrig kan divergera (adresserar buggrisken briefen själv flaggade).

### Cloud-spegel & korrigering (`notification_state`) — ✅ v15(2)
`notification_state` (redan använd för push-notis-triggers) speglar nu även `skills`, `current_streak_days`, `last_trained_date` — skrivs fire-and-forget i `_pushNotifState()` vid varje `saveState()`. Detta är **write-only** från klientens perspektiv: ingen auto-pull vid inloggning. Enda vägen tillbaka är knappen `☁️ PULL FROM CLOUD` (Demo Tools, `pullSkillCorrection()`), som hämtar raden och skriver över lokal `skills`/`skillPoints`/`currentStreakDays`/`lastTrainedDate` — inget annat rörs (rank/xp/stats/inventory/gate orörda, samma icke-destruktiva mönster som `SYNC PRESET DATA`).

**Så rättar Philip en väns data:** kör en SQL `UPDATE notification_state SET skills = '{...}'::jsonb, skill_points = N, current_streak_days = N, last_trained_date = 'YYYY-MM-DD' WHERE profile_id = '<id>'` mot Supabase, be sedan vännen trycka `PULL FROM CLOUD` en gång på sin egen enhet. Racerisk: om vännens app råkar spara (vilket sker kontinuerligt under spel) innan de hunnit trycka pull, skriver deras egen `_pushNotifState()` över korrigeringen igen — i praktiken litet problem för en liten vängrupp, men värt att känna till.

---

## Stats-system

Fyra stats: **STR, AGI, VIT, DIS** — inget hårt tak.

### Effective Stats
```js
effectiveSTR = applyBroadPower(player.str + itemBonusSTR, broadPowerPoints)
effectiveAGI = applyBroadPower(player.agi + itemBonusAGI, broadPowerPoints)
effectiveVIT = applyBroadPower(player.vit + itemBonusVIT, broadPowerPoints)
effectiveDIS = (player.dis + itemBonusDIS) × (1 + disciplinePoints × 0.005)
// applyBroadPower(base, pts) = base × (1 + pts × 0.007)
```
Skill Tree V2:s Broad Power/Discipline sitter direkt i denna funktion (`effectiveStat()` i koden) — allt som redan läser effective-stats (bossdamage, max HP, `critMult()`) får bonusen automatiskt utan egen kod.

### STR, AGI, VIT — rullande counters
| Stat | Trigger | Tröskel | Vinst |
|---|---|---|---|
| STR | Gympass loggat | 3 pass | +2 STR |
| AGI | Cardio-pass loggat | 2 pass | +2 AGI |
| VIT | Första nutrition check-in för dagen | 3 dagar | +1 VIT |

Counter nollställs till 0 efter varje upgrade. Sker omedelbart, oavsett veckogräns.

### DIS — veckobaserat
- 100% av schemalagda pass avklarade → **+2 DIS**
- ≥80% avklarade → **+1 DIS**
- Under 80% → **+0**

Schemalagda pass = gym + cardio. Daily quests räknas ej.

### simulateWeekEnd hanterar:
- DIS-beräkning
- Crit pending-flagga
- Boss-skada för missade pass
- Återställning av veckliga räknare
- Item-passiver med veckoavslut-trigger

**simulateWeekEnd rör INTE STR, AGI eller VIT.**

---

## Träningsschema

### Bro Split (Philips split) — 4 dagar/vecka
- Dag 1: **Bröst + Triceps** (Bänkpress, Lutande DB Press, Kabelflyga, Triceps Pushdown, Skull Crushers)
- Dag 2: **Rygg + Biceps** (Chins, Skivstångsrodd, Kabelrodd, Skivstångscurl, Hammer Curl)
- Dag 3: **Ben** (Knäböj, Benpress, Rumänsk marklyft, Benböj, Hip Thrust, Stående Calf Raise)
- Dag 4: **Axlar** (Press, Laterallyft, Face Pulls, Rear Delt Fly)

Detta är Philips split (`BRO_SPLIT`) — används som fallback för scratch-profiler. Jonathan och Markus har egna scheman/pass lagrade i sina presets (`PRESETS.jonathan.workouts` / `PRESETS.markus.workouts`), se deras respektive profilsektioner ovan.

### TRAIN-fliken — två lägen
**Normalt läge:** Veckovyn med dag/typ-taggar (GYM / CARDIO / REST — `cardio` tillkom i v14 för Markus separata löp-/cykelpass). Ej redigerbart. Klickbar rad → detaljpanel (cardio-dagar visar en "LOG CARDIO"-genväg till Log-fliken).

**Configure-läge** (`[ CONFIGURE ]` → `[ DONE ]`): Flytta om pass, ✏️-ikon per rad för att redigera övningar (namn, sets, reps). Modal med `[ + ADD EXERCISE ]` och `[ SAVE ]`.

---

## Daily Quest

**Daily Quest är INTE en schemalagd dag i veckoschemat.** Det är en daglig valfri aktivitet tillgänglig varje dag oavsett om det är gymdag, vilodag eller cardiodag.

### Placering
Egen sektion på **startsidan**, direkt under TODAY'S SESSION-sektionen.

### Innehåll per rank
| Rank | Push-ups | Sit-ups | Squats |
|---|---|---|---|
| E | 15 | 15 | 15 |
| D | 25 | 25 | 25 |
| C | 40 | 40 | 40 |
| B | 60 | 60 | 60 |
| A | 80 | 80 | 80 |
| S | 100 | 100 | 100 |

*Lunges ingår ej.*

### Bockning
En enda `[ COMPLETE QUEST ]`-knapp för hela questen. Vid avklarad: knappen ersätts med "✓ QUEST COMPLETED", XP triggas (Shadow Step-logik). Återställs via SIM DAY END.

---

## Starta Pass — flöde

### Trigger
På startsidan/TRAIN-tabben: `[ ⚔ STARTA PASS ]`-knapp för dagens schemalagda gymdag. Ersätter den gamla LOG SESSION-knappen för den dagen.

**Viktigt:** Retroaktiv loggning i TRAIN-tabben bevaras opåverkad. "Starta Pass" är ett tillägg, inte ett krav.

Passet kan bara startas en gång per dag. Efter avslut: knappen ändras till "✓ PASS AVSLUTAT".

Passet sparas i localStorage som `activeSession: { day, started, completedExercises[] }` — överlever sidomladdning.

### Modalens utseende
- Nära fullskärm (95% viewport height), centrerad
- ARISE-estetik: `#050a12` bakgrund, cyan border, hörnbrackets
- Scrollbar inuti
- **X-knapp** uppe till höger — minimerar modalen (stänger inte passet)
- Header: `⚔ [PASSNAMN] — [DAG DATUM]`

### Sektion 1 — Warm-up
Rubrik: `[ WARM-UP ]`

3 fasta rörelser baserat på dagens muskelgrupp. **En bock för hela sektionen** (inte per rörelse).

**Bröst + Triceps:**
- Arm circles — 30 sek
- Band pull-aparts — 15 reps
- Push-up (långsamt) — 10 reps

**Rygg + Biceps:**
- Cat-cow — 10 reps
- Shoulder dislocates — 10 reps
- Dead hang — 20 sek

**Ben:**
- Hip circles — 10 reps/sida
- Leg swings (fram/bak) — 10 reps/sida
- Bodyweight squat (djupt, långsamt) — 10 reps

**Axlar:**
- Arm circles — 30 sek
- Wall slides — 10 reps
- Band pull-aparts — 15 reps

### Sektion 2 — Övningar
Rubrik: `[ ÖVNINGAR ]`

Varje övning = ett kort:
```
[ Bänkpress              4×8    ☐ ]
```

- **Tryck på kortet** (inte bocken) → fäller ut info-kort med primärmuskel, utförande (2–3 meningar), vanliga misstag (1–2 punkter)
- **Tryck på bocken** → övningen bockas av, tonas ned och grönmarkeras. Kan avbockas.

### Avsluta Pass-knapp
Sticky längst ned: `[ AVSLUTA PASS ]`
- Kräver ingen bockning
- Triggar: XP, STR-counter, gate-progress
- Stänger modalen, tar bort persistenta pillen
- Knappen i TRAIN-tabben ändras till "✓ PASS AVSLUTAT"

---

## Persistent pill — aktivt pass

Visas **direkt ovanför navbaren** (som en extra rad, inte ovanpå innehåll) när ett pass är aktiverat men modalen är minimerad.

- Höjd: **36px**
- Bredd: **~170px**, centrerad horisontellt
- Bakgrund: `rgba(0,180,255,0.1)`
- Border: `1px solid rgba(0,200,255,0.4)`
- Text: `⚔ PASS AKTIVT` — Rajdhani, ~12px, cyan
- Tryck → öppnar modalen igen
- Lägger till `padding-bottom: 36px` på scrollbart innehåll så inget täcks
- Försvinner när passet avslutas

---

## Övningsbibliotek

Tillgängligt på **två ställen:**
1. Inuti Starta Pass-modalen (utfällbara kort per övning)
2. Som egen sektion i TRAIN-tabben via knapp: `[ 📖 ÖVNINGSBIBLIOTEK ]`

Samma JS-objekt `EXERCISE_LIBRARY` återanvänds på båda ställena. Inga bilder — enbart text.

### Övningsdata

```js
const EXERCISE_LIBRARY = {
  "Bänkpress": {
    muscle: "Bröst (pectoralis major)",
    howTo: "Ligg på bänken med fötterna plant i golvet. Sänk stången kontrollerat till bröstet, håll armbågarna ~45° från kroppen. Pressa upp explosivt till utsträckta armar.",
    mistakes: ["Studsar stången mot bröstet", "Armbågarna fläktar för brett ut"]
  },
  "Lutande DB Press": {
    muscle: "Övre bröst (clavicular head)",
    howTo: "Bänken i ~30–45° lutning. Håll hantlarna i axelbredd, sänk kontrollerat till brösthöjd och pressa upp. Håll handlederna raka.",
    mistakes: ["För brant lutning (blir axelpress)", "Hantlarna rör sig inåt i toppen"]
  },
  "Kabelflyga": {
    muscle: "Bröst (isolationsövning)",
    howTo: "Stå mitt emellan kabeltornen, en fot fram. Håll armarna lätt böjda och för samman handtagen i en vid bågrörelse framför bröstet. Känn stretchen i ytterläget.",
    mistakes: ["Raka armar (belastar armbågar)", "För liten rörelseomfång"]
  },
  "Triceps Pushdown": {
    muscle: "Triceps",
    howTo: "Stå nära kabelmaskinen, armbågarna tätt intill kroppen. Pressa handtaget nedåt tills armarna är utsträckta, håll kort i botten. Kontrollera uppfarten.",
    mistakes: ["Armbågarna rör sig bakåt/framåt", "Svajig kropp — håll core spänt"]
  },
  "Skull Crushers": {
    muscle: "Triceps (lång huvud)",
    howTo: "Ligg på bänken, håll stången/hantlarna rakt upp. Böj enbart i armbågen och sänk vikten mot pannan/bakom huvudet. Pressa upp utan att svänga.",
    mistakes: ["Armbågarna fläktar ut", "För tung vikt — rörelseomfånget förkortas"]
  },
  "Chins": {
    muscle: "Rygg (latissimus dorsi) + Biceps",
    howTo: "Håll med supinerat grepp (handflatorna mot dig), axelbredds avstånd. Dra dig upp tills hakan passerar stången, sänk kontrollerat hela vägen ned.",
    mistakes: ["Halvt rörelseomfång", "Svingar med benen för att komma upp"]
  },
  "Skivstångsrodd": {
    muscle: "Rygg (mitten och övre)",
    howTo: "Böj överkroppen ~45°, rygg rak. Dra stången mot naveln med armbågarna tätt intill. Kläm ihop skulderbladen i toppen.",
    mistakes: ["Rundig rygg", "Drar med armarna istället för ryggen"]
  },
  "Kabelrodd": {
    muscle: "Rygg (mitten)",
    howTo: "Sitt med rak rygg, dra handtaget mot magen. Håll överkroppen still — undvik att luta bakåt för att hjälpa till. Skulderbladen ihop i toppen.",
    mistakes: ["Överkroppen svänger bakåt", "Rundar ryggen i utsträckt läge"]
  },
  "Skivstångscurl": {
    muscle: "Biceps",
    howTo: "Stå rak, grepp i axelbredd. Curla stången upp mot axlarna med kontrollerad rörelse. Håll armbågarna stilla vid sidan av kroppen.",
    mistakes: ["Armbågarna rör sig framåt", "Svingar med ryggen för att hjälpa till"]
  },
  "Hammer Curl": {
    muscle: "Biceps (brachialis) + Underarmar",
    howTo: "Håll hantlarna neutralt (tummen upp). Curla upp mot axeln. Håll handleden neutral hela vägen.",
    mistakes: ["Roterar handleden i toppen", "För hög vikt — rörelseomfånget minskar"]
  },
  "Knäböj": {
    muscle: "Quadriceps, Glutes, Hamstrings",
    howTo: "Stången på övre ryggen, fötterna axelbreda. Böj i höft och knä samtidigt, håll ryggen rak. Knäna följer tåriktningen. Ner tills låren är parallella eller djupare.",
    mistakes: ["Knäna kollapsar inåt", "Hälen lyfter från golvet"]
  },
  "Benpress": {
    muscle: "Quadriceps + Glutes",
    howTo: "Fötterna axelbreda på plattan. Sänk kontrollerat tills knäna är ~90°, pressa upp utan att låsa knäleden helt i toppen.",
    mistakes: ["För liten rörelseomfång", "Knäna kollapsar inåt vid press"]
  },
  "Rumänsk marklyft": {
    muscle: "Hamstrings + Glutes",
    howTo: "Håll stången nära kroppen, sänk med rak rygg genom att skjuta höften bakåt. Känn stretchen i baksidan av låren. Pressa höften framåt för att komma upp.",
    mistakes: ["Rundar ryggen", "Böjer för mycket i knäna (blir vanlig marklyft)"]
  },
  "Benböj (Leg Curl)": {
    muscle: "Hamstrings (isolationsövning)",
    howTo: "Ligg i maskinen med knävecket mot kanten. Curla hela rörelseomfånget, håll kort i toppen. Sänk kontrollerat.",
    mistakes: ["Höften lyfter från bänken", "Studsar i bottenläget"]
  },
  "Hip Thrust": {
    muscle: "Glutes",
    howTo: "Övre ryggen mot bänk, stången över höfterna. Pressa höften rakt upp tills kroppen är rak. Kläm glutterna hårt i toppen, håll 1 sek.",
    mistakes: ["Höften skjuts framåt för mycket (hyperextension)", "Hakan i bröstet — titta rakt fram"]
  },
  "Stående Calf Raise": {
    muscle: "Gastrocnemius (vader)",
    howTo: "Stå med framfoten på en kant, hälen fri. Pressa upp på tå så högt som möjligt, sänk hela vägen ned för full stretch.",
    mistakes: ["Hoppar upp istället för kontrollerad press", "Ingen stretch i botten"]
  },
  "Press (OHP)": {
    muscle: "Axlar (anterior + lateral deltoid)",
    howTo: "Stå med stången vid överkanten av bröstet. Pressa rakt upp, huvudet något bakåt när stången passerar. Lås armbågarna i toppen.",
    mistakes: ["Lutar bakåt för mycket (belastar ländryggen)", "Stången rör sig framåt istället för rakt upp"]
  },
  "Laterallyft": {
    muscle: "Axlar (lateral deltoid)",
    howTo: "Håll hantlarna vid sidan, lyft med lätt böjda armar tills de är parallella med golvet. Kontrollera nedgången — minst 2 sek.",
    mistakes: ["Svingar med kroppen", "Lyfter för högt (belastar trapezius)"]
  },
  "Face Pulls": {
    muscle: "Bakre deltoid + Rotator cuff",
    howTo: "Kabeln i ögonhöjd, dra mot ansiktet med armbågarna höga och brett ut. Händerna ska sluta vid öronen. Håll kort i toppen.",
    mistakes: ["Armbågarna för låga", "För tung vikt — rörelseomfånget minskar"]
  },
  "Rear Delt Fly": {
    muscle: "Bakre deltoid",
    howTo: "Luta överkroppen framåt ~45°. Lyft hantlarna ut till sidan med lätt böjda armar, kläm ihop skulderbladen i toppen.",
    mistakes: ["Rundar ryggen", "Armbågarna böjs för mycket (blir mer rygg)"]
  }
};
```

---

## Kostplan (TRAIN-tabben)

### Placering
Egen sektion i TRAIN-tabben. Placeras under övningsbiblioteket och ovanför Nutrition Targets-sektionen.

### Rubrik och ingress
```
[ KOSTPLAN ]
Beräknat för Philip — Ectomorph, 73kg, mål: bygga muskler
Dagsmål: ~3 200 kcal · ~146g protein · ~2.6L vatten
```

### Träningsprofil-koppling — ✅ IMPLEMENTERAT (v14)
Kostplanen väljs dynamiskt per profil via `state.kostplanMeals` (fallback: `KOSTPLAN_MEALS`, Philips ursprungliga plan). Ingressen ("Anpassad för [namn] · [vikt] kg · [kroppstyp] · Mål: [mål].") beräknas från `state.name/weight/bodyType/goal` — se "Nytt i v14".

### Måltidskort (statiska, ej interaktiva)

Varje måltid visas som ett informationskort med namn, tid, innehåll, kcal och protein.

| Måltid | Tid | Innehåll | Kcal | Protein |
|---|---|---|---|---|
| Frukost | ca 07:00 | Havregryn 80g + mjölk 2dl + banan + nötter 20g | ~550 | ~23g |
| Förmiddagsmellanmål | ca 10:00 | Nötter 30g + frukt (banan/äpple) | ~250 | ~7g |
| Under träning | — | Clear whey proteinshake | ~100 | ~20g |
| Lunch (post träning) | ca 12–13 | Proteinkälla 200g (kyckling/nötkött/fisk) + kolhydratkälla 150g (ris/pasta/potatis) + grönsaker + olivolja 1 msk | ~750 | ~48g |
| Eftermiddagsmellanmål | ca 15:00 | Kvarg 250g + nötter 30g + frukt | ~450 | ~28g |
| Middag | ca 18:00 | Proteinkälla 200g (kyckling/nötkött/fisk) + kolhydratkälla 150g (ris/pasta/potatis) + grönsaker + olivolja 1 msk | ~750 | ~48g |
| Kvällsmat *(valfritt)* | ca 21:00 | Kvarg 150g + honung + bär | ~200 | ~17g |

Kvällsmaten markeras med en liten "VALFRITT"-tagg i dim-färg.

### Summering
```
TOTALT (ex. kvällsmat)    ~2 850 kcal    ~174g protein
TOTALT (inkl. kvällsmat)  ~3 050 kcal    ~191g protein
```

### Snabba mellanmål-tips (collapsbar panel) — ✅ IMPLEMENTERAT

Knapp: `[ 🛒 SNABBA MELLANMÅL — TIPS ]`. Internt namn `SNACK_TIPS` (rad ~3352, tidigare `ICA_TIPS`). Innehållet nedan är oförändrat.

Vid expansion visas:

**Bästa alternativen:**
- Kvarg (Arla/Lindahls) + nötmix + banan → ~400 kcal, ~27g protein
- Skyr + nötmix + frukt → liknande värden

**Snabbaste alternativet:**
- Nötmix 50g → ~300 kcal, bra kalorier i nödläge

**Undvik:**
- Proteinbars — ofta mycket socker, lite protein för pengarna
- Färdiga smoothies — mest socker

---

## Daily Nutrition Check-in

Tre ja/nej-frågor dagligen (på startsidan):
1. Nådde du ditt proteinmål idag?
2. Höll du dig inom kalorimålet?
3. Drack du tillräckligt med vatten?

Varje JA: XP (×Disciplined Mind bonus) + ökar veckans VIT-counter.

---

## Nutrition Targets (TRAIN-fliken, längst ned)

Tre block med beräknade värden från profilen:
- 💧 Vatten — med tips om svettförlust på träningsdagar
- 🔥 Kalorier — med tips om konsekvent överskott
- 🥩 Protein — med tips om måltidsfördelning

Värden i cyan (`#00e5ff`), beskrivningstext i dim-färg (`#4a7a9b`).

---

## Navigation (bottom tabs)

| Position | Tab | Ikon | Typ |
|---|---|---|---|
| Ytterst vänster | CHARACTER | ◈ | Vanlig tab |
| Inre vänster | TRAIN | ▦ | Vanlig tab |
| Center | ⬟ | ⬟ | FAB — rund, upphöjd, cyan glow |
| Inre höger | GATES | ⚔ | Vanlig tab |
| Ytterst höger | RANKS | ▲ | Vanlig tab |

◈-ikonen pulserar i guld/gul ton när spelaren har outnyttjade skill points.

FAB: rund, upphöjd ~8–10px, cyan glow/puls, fungerar som hemknapp.

Inställningar via ⚙ uppe till höger.

---

## Huvudskärm (FAB / Hem)

Innehåll uppifrån och ner:
1. **Character Summary** — namn, rank-titel, rank+level i rank-färg, XP-bar, `[ CHARACTER ]`-knapp
2. **Stat Summary** (kompakt) — STR/AGI/VIT/DIS med ikon, värde, färgkodad minibar
3. **Today's Session** — dagens schemalagda pass med `[ ⚔ STARTA PASS ]`-knapp (eller "✓ PASS AVSLUTAT")
4. **Daily Quest** — egen sektion med `[ COMPLETE QUEST ]`-knapp
5. **Nutrition Check-in** — tre ja/nej-frågor
6. **Aktiv Gate-status** (om gate aktiv) — gate-typ, tid kvar, boss HP-bar, spelar-HP, `[ GOTO GATES ]`
7. **Demo Tools** — längst ned

---

## CHARACTER-tab

1. **Stats** — detaljerad vy för alla fyra stats
2. **Skill Tree** — 4 skills med poängfördelning
3. **Inventory** — equipment slots + loot bag

---

## Inventory-system

### Startregel
Nya profiler (och Fas 2-profilskapande via PIN-onboarding) startar alltid med **tom inventory** (`inventory: []`, inga rader i Supabase `inventory`-tabellen). Inga items ska seedas eller genereras automatiskt vid profilskapande — all inventory kommer enbart från gate-drops eller framtida vänskapsgåvor. (Historik: en tidigare demo/test-artefakt, `DEMO_ITEMS`, lade oavsiktligt till 8 items vid start — fixad i v12, se ändringslogg.)

### Equipment Slots (8 st)
| Slot | Ikon | Primär stat-koppling |
|---|---|---|
| Weapon 1 | ⚔️ | STR |
| Weapon 2 | ⚔️ | STR |
| Helmet | 🪖 | VIT |
| Armor | 🛡️ | VIT |
| Pants | 👖 | AGI |
| Amulet | 📿 | AGI |
| Ring | 💍 | Wild card |
| Support | 🤝 | Team (Fas 2) |

### Raritetssystem
| Raritet | Färg | Stats |
|---|---|---|
| Common | `#9ca3af` grå | +3–5 på en stat |
| Rare | `#60a5fa` blå | +4–5 på en stat, +2–3 på en annan |
| Legendary | `#fbbf24` guld | +8–10 på en stat, +5–7 på en annan + passiv |
| Arcane | `#ff2040` glödande röd | +12–15 på tre stats + stark passiv |

Arcane med drawback märks **[ARCANE — CURSED]**.

### Item Data Model
```js
{
  id: "unique_id",
  name: "Monarch's Shortsword",
  slot: "weapon1",
  rarity: "legendary",
  cursed: false,
  icon: "⚔️",
  passive: {
    id: "shadow_strike",
    description: "Om du loggar alla dina schemalagda gympass under en vecka får du +200 XP vid veckoslutet."
  },
  statBonus: { str: 10, agi: 6, vit: 0, dis: 0 }
}
```

### Passiv-staplingsprincip
```js
totalDamage = baseDamage × (1 + bonus1 + bonus2 + bonus3 ...)
```

Se `ARISE_items_v1.md` och `ARISE_briefing_items.md` för fullständig item- och passiv-logik.

### Salvage-system — ✅ IMPLEMENTERAT

**Princip:** Salvage ger **XP, ingen ny valuta eller resurs** — medvetet val för att inte konkurrera med pity-systemet eller skapa en genväg till högre raritet.

**XP-skala per raritet:**
| Raritet | XP vid salvage |
|---|---|
| Common | 25 |
| Rare | 75 |
| Legendary | 250 |
| Arcane | 500 |

**Regler:**
- Endast items i loot-bagen (ej utrustade) kan salvage:as — utrustat item måste unequippas först
- Permanent, kräver bekräftelsedialog innan XP delas ut: `Salvage "[Namn]" för +[XP]? Detta kan inte ångras.`
- Ingen cap på hur mycket man kan salvage:a

**Skill-bonus-beslut (fattat av Claude Code, medvetet val):** Salvage-XP går igenom `addXP()` direkt via `addXPAndLog` — det innebär att item-passiver som `forbidden_knowledge` (×1.35) **appliceras** om utrustad, men skill-tree-bonusarna (Iron Body, Endless Runner osv.) gör **inte** det. Motivering: salvage är inte en träningsaktivitet och förtjänar inte skill-multiplikatorer, medan en item-passiv som redan är intjänad genom spel fortfarande ska gälla.

**UI:** `[ SALVAGE (+X XP) ]`-knapp i item-modalen (samma modal som EQUIP/UNEQUIP), separat rad under EQUIP+CLOSE-raden. Syns bara när `action === 'equip'` (dvs. bara loot-bag-items, aldrig utrustade). Knapptexten visar dynamiskt XP-värdet baserat på raritet. Salvage loggas i aktivitetsloggen (typ `'salvage'`) med item-namn och raritet.

---

## GATES-tab

### Om ingen gate är aktiv:
- `[ NORMAL GATE ]` — blå, samma rank
- `[ HIGH-RANK GATE ]` — blå, en rank över
- `[ RED GATE ]` — röd, en rank över, 2× HP
- Kort beskrivning + cooldown-status under varje knapp

#### Visa drop odds innan gate öppnas — ✅ IMPLEMENTERAT

UI-placering: inuti varje gate-kort, längst till höger i HP-kolumnen, en `ODDS ▼`-chip under HP-siffran (rad ~1594). Klick expanderar odds-panelen inline i kortet (ingen modal); `e.stopPropagation()` hindrar att `startGate_*` triggas av misstag. Ny funktion `renderGateOddsHTML` (rad ~1504) renderar ett 4-kolumns-grid (Common/Rare/Legendary/Arcane) för spelarens nuvarande rank.

Pity visas: om pity är aktiv visas de **effektiva** oddsen (bas + bonus) med `(base X%)` som subtext, plus raden `⚡ Pity active — Leg +X%, Arc +X%`. `rollRarity`-logiken är orörd — panelen är ren visning.

### Om en gate är aktiv:
- Gate-typ och färg
- Boss HP-bar (stor, dramatisk)
- Spelar-HP-bar (aktuell HP / maxHP)
- Tid kvar (veckor/dagar)
- Aktivitetslogg: senaste actions och skada utdelad
- `[ ABANDON GATE ]` (med bekräftelsedialog)

### Equipment Overview-panel (alltid synlig längst ned)
Visar alla 8 slots med raritets-färg. `[ CHARACTER ◈ ]`-knapp → navigerar till CHARACTER-tab.

### Loot-historik
Lista på tidigare avslutade gates med utfall och vad som droppade.

---

## Boss Fight-system

### Gate-typer
| Gate | Färg | Längd | Boss-rank (faktisk) | UI-label |
|---|---|---|---|---|
| Normal | 🔵 Blå | 3 veckor | Samma rank som spelaren | "[Rank]-Rank Boss" |
| High-Rank | 🔵 Blå | 3 veckor | Samma rank som spelaren (svårare, se HP-tabell) | "[Rank]-Rank Elite Boss" |
| Red Gate | 🔴 Röd | 5 veckor | Samma rank som spelaren (svårare, se HP-tabell) | "[Rank]-Rank Ascendant Boss" |

> **v11-rättelse:** Sedan v10 finns ingen faktisk rank-hoppning mellan gate-typer — hela svårighetsskillnaden sitter i Boss HP-tabellen (via `targetPasses`). Labeln visade tidigare felaktigt en högre rank ("D-Rank Boss" för en E-ranks-spelares High-Rank Gate) trots att HP:t hämtades från E-rankens egen High-Rank-kolumn. v11 rättar labeln så den alltid visar spelarens faktiska rank, med en svårighetsgrads-kvalificerare (Elite/Ascendant) istället för en påhittad rank-höjning.

### Gate-outcomes
| Utfall | Villkor | Cooldown |
|---|---|---|
| **Seger** | Boss HP når 0 | Ingen |
| **Timeout** | Tiden löper ut | 24h |
| **Död** | Spelarens HP når 0 | 72h |

Timeout och Död = inget loot. Ingen XP-straff.

### Boss HP-skalning (team)
```js
bossHP = BASE_HP[gateType][rank][levelInRank] × (1 + (players - 1) × 0.9)
```

### Boss Base HP — designprincip (v10)

> **Bakgrund (v9→v10-ändring):** Den gamla modellen hade en fast HP-siffra per rank som hoppade tvärt vid varje rank-up (t.ex. 800→2400 HP i sekunden man rankade upp), vilket kändes som en orättvis vägg. Lösningen är inte en per-spelare-live-beräkning (skulle bli inkonsekvent i party-läge), utan en **statisk tabell designad utifrån hur mycket skada en genomsnittlig spelare *bör* göra vid varje nivå.**

**Designformel (använd EN GÅNG för att generera tabellen nedan, körs inte live i appen):**
```js
targetPasses(gateType, levelInRank) = {
  normal:    10 - (2/19) * (levelInRank - 1),   // 10 pass vid nivå 1 → 8 vid nivå 20
  highrank:  13 - (2/19) * (levelInRank - 1),   // 13 → 11
  redgate:   22 - (3/19) * (levelInRank - 1),   // 22 → 19
}
bossHP[gateType][rank][level] = targetPasses(gateType, level) × BASE_GYM[rank] × expMult(estimatedSTR[rank][level])
```
`estimatedSTR[rank][level]` är beräknad utifrån ett antagande om **endast gym-XP** (inga items, ingen cardio/quest-XP inräknad) — se "Referens: STR-progression per nivå" nedan. Detta ger en **medveten underskattning** av riktig spelares STR (som får XP från fler källor och därför rankar upp snabbare relativt sin STR) — vilket betyder tabellen troligen känns något tuff initialt. Justera med Boss HP-balansering efter speltestning.

**Tidsbudget vid perfekt närvaro (4 gympass/vecka):** Normal = 12 pass (3 v), High-Rank = 12 pass (3 v), Red Gate = 20 pass (5 v). targetPasses ligger **under** budgeten för Normal (avslappnad marginal), och **över** budgeten för High-Rank/Red Gate (kräver crits/quests/cardio-skada utöver bara gym-pass för att hinna i tid — det är själva svårighetsknappen, inte den råa HP-siffran).

**Framtida global balansering:** Eftersom tabellen är statisk går det att skala hela svårighetsgraden med en enda multiplikator, t.ex. `BASE_HP_ALL × 1.10` om det visar sig vara för lätt efter mer speltestning — ingen omdesign av formeln krävs.

### Boss HP-tabell (Normal / High-Rank / Red Gate), nivå 1–20 per rank

**Rank E**
| Lvl | Normal | High-Rank | Red Gate |
|---|---|---|---|
| 1 | 500 | 650 | 1 100 |
| 2 | 495 | 645 | 1 092 |
| 3 | 496 | 648 | 1 099 |
| 4 | 491 | 643 | 1 091 |
| 5 | 492 | 647 | 1 098 |
| 6 | 494 | 650 | 1 106 |
| 7 | 495 | 654 | 1 113 |
| 8 | 496 | 657 | 1 120 |
| 9 | 498 | 661 | 1 127 |
| 10 | 499 | 664 | 1 134 |
| 11 | 500 | 667 | 1 141 |
| 12 | 508 | 680 | 1 164 |
| 13 | 516 | 693 | 1 187 |
| 14 | 517 | 696 | 1 194 |
| 15 | 525 | 710 | 1 218 |
| 16 | 533 | 723 | 1 242 |
| 17 | 541 | 736 | 1 267 |
| 18 | 549 | 750 | 1 292 |
| 19 | 565 | 774 | 1 336 |
| 20 | 574 | 789 | 1 362 |

**Rank D**
| Lvl | Normal | High-Rank | Red Gate |
|---|---|---|---|
| 1 | 1 495 | 1 943 | 3 289 |
| 2 | 1 500 | 1 954 | 3 311 |
| 3 | 1 526 | 1 993 | 3 379 |
| 4 | 1 552 | 2 032 | 3 449 |
| 5 | 1 578 | 2 072 | 3 520 |
| 6 | 1 604 | 2 112 | 3 592 |
| 7 | 1 654 | 2 184 | 3 717 |
| 8 | 1 681 | 2 226 | 3 792 |
| 9 | 1 709 | 2 269 | 3 870 |
| 10 | 1 761 | 2 345 | 4 003 |
| 11 | 1 789 | 2 389 | 4 084 |
| 12 | 1 844 | 2 469 | 4 225 |
| 13 | 1 873 | 2 516 | 4 310 |
| 14 | 1 929 | 2 599 | 4 457 |
| 15 | 1 986 | 2 685 | 4 610 |
| 16 | 2 045 | 2 773 | 4 767 |
| 17 | 2 076 | 2 825 | 4 862 |
| 18 | 2 167 | 2 958 | 5 097 |
| 19 | 2 230 | 3 055 | 5 270 |
| 20 | 2 294 | 3 155 | 5 449 |

**Rank C**
| Lvl | Normal | High-Rank | Red Gate |
|---|---|---|---|
| 1 | 5 979 | 7 773 | 13 155 |
| 2 | 6 168 | 8 038 | 13 615 |
| 3 | 6 274 | 8 196 | 13 896 |
| 4 | 6 470 | 8 474 | 14 381 |
| 5 | 6 579 | 8 640 | 14 677 |
| 6 | 6 783 | 8 931 | 15 187 |
| 7 | 6 993 | 9 232 | 15 714 |
| 8 | 7 208 | 9 542 | 16 259 |
| 9 | 7 429 | 9 862 | 16 821 |
| 10 | 7 655 | 10 192 | 17 402 |
| 11 | 7 887 | 10 532 | 18 002 |
| 12 | 8 126 | 10 882 | 18 621 |
| 13 | 8 370 | 11 244 | 19 260 |
| 14 | 8 620 | 11 616 | 19 921 |
| 15 | 8 877 | 12 000 | 20 602 |
| 16 | 9 267 | 12 568 | 21 603 |
| 17 | 9 540 | 12 981 | 22 340 |
| 18 | 9 956 | 13 594 | 23 422 |
| 19 | 10 246 | 14 038 | 24 217 |
| 20 | 10 689 | 14 698 | 25 387 |

**Rank B**
| Lvl | Normal | High-Rank | Red Gate |
|---|---|---|---|
| 1 | 27 858 | 36 215 | 61 287 |
| 2 | 28 735 | 37 447 | 63 431 |
| 3 | 29 637 | 38 719 | 65 646 |
| 4 | 30 563 | 40 031 | 67 936 |
| 5 | 31 514 | 41 384 | 70 301 |
| 6 | 32 492 | 42 781 | 72 745 |
| 7 | 33 495 | 44 221 | 75 270 |
| 8 | 35 007 | 46 345 | 78 965 |
| 9 | 36 079 | 47 898 | 81 696 |
| 10 | 37 179 | 49 500 | 84 517 |
| 11 | 38 842 | 51 865 | 88 651 |
| 12 | 40 015 | 53 591 | 91 701 |
| 13 | 41 217 | 55 370 | 94 850 |
| 14 | 43 043 | 58 003 | 99 471 |
| 15 | 44 323 | 59 919 | 102 874 |
| 16 | 46 272 | 62 757 | 107 872 |
| 17 | 48 299 | 65 723 | 113 106 |
| 18 | 49 713 | 67 877 | 116 953 |
| 19 | 51 874 | 71 074 | 122 611 |
| 20 | 54 119 | 74 414 | 128 533 |

**Rank A**
| Lvl | Normal | High-Rank | Red Gate |
|---|---|---|---|
| 1 | 143 013 | 185 917 | 314 628 |
| 2 | 147 517 | 192 242 | 325 635 |
| 3 | 154 269 | 201 545 | 341 714 |
| 4 | 159 091 | 208 374 | 353 631 |
| 5 | 166 334 | 218 428 | 371 053 |
| 6 | 173 886 | 228 950 | 389 311 |
| 7 | 179 256 | 236 658 | 402 823 |
| 8 | 187 348 | 248 023 | 422 597 |
| 9 | 195 780 | 259 915 | 443 317 |
| 10 | 204 564 | 272 356 | 465 027 |
| 11 | 213 714 | 285 371 | 487 770 |
| 12 | 223 242 | 298 984 | 511 595 |
| 13 | 233 161 | 313 223 | 536 552 |
| 14 | 243 486 | 328 113 | 562 691 |
| 15 | 254 231 | 343 682 | 590 066 |
| 16 | 265 409 | 359 961 | 618 734 |
| 17 | 277 035 | 376 978 | 648 753 |
| 18 | 289 124 | 394 766 | 680 184 |
| 19 | 301 692 | 413 357 | 713 089 |
| 20 | 319 146 | 438 825 | 757 971 |

**Rank S**
| Lvl | Normal | High-Rank | Red Gate |
|---|---|---|---|
| 1 | 843 357 | 1 096 364 | 1 855 386 |
| 2 | 882 060 | 1 149 493 | 1 947 101 |
| 3 | 922 435 | 1 205 116 | 2 043 243 |
| 4 | 964 546 | 1 263 346 | 2 144 018 |
| 5 | 1 008 461 | 1 324 297 | 2 249 643 |
| 6 | 1 054 247 | 1 388 092 | 2 360 342 |
| 7 | 1 117 360 | 1 475 166 | 2 510 920 |
| 8 | 1 167 799 | 1 546 006 | 2 634 183 |
| 9 | 1 220 357 | 1 620 130 | 2 763 338 |
| 10 | 1 275 113 | 1 697 679 | 2 898 658 |
| 11 | 1 350 741 | 1 803 636 | 3 082 868 |
| 12 | 1 410 960 | 1 889 679 | 3 233 451 |
| 13 | 1 494 227 | 2 007 305 | 3 438 523 |
| 14 | 1 560 396 | 2 102 729 | 3 606 037 |
| 15 | 1 651 996 | 2 233 254 | 3 834 262 |
| 16 | 1 724 632 | 2 339 032 | 4 020 547 |
| 17 | 1 825 309 | 2 483 807 | 4 274 458 |
| 18 | 1 904 962 | 2 601 006 | 4 481 546 |
| 19 | 2 015 512 | 2 761 514 | 4 763 938 |
| 20 | 2 132 118 | 2 931 663 | 5 063 781 |

### Referens: STR-progression per nivå (gym-only-baslinje, ingen items)
| Rank | STR vid nivå 1 | STR vid nivå 20 |
|---|---|---|
| E | 0 | 52 |
| D | 58 | 152 |
| C | 158 | 274 |
| B | 280 | 408 |
| A | 416 | 564 |
| S | 572 | 738 |

### Spelarens maxHP
```js
maxHP = 100 + (effectiveVIT × 1.5)
```

### Spelarens skada mot bossen
```js
const expMult = (stat) => Math.pow(2, stat / 100);
gymDamage    = BASE_GYM[rank]    * expMult(effectiveSTR)
cardioDamage = BASE_CARDIO[rank] * expMult(effectiveAGI)
questDamage  = BASE_QUEST[rank]  * expMult(effectiveVIT)
```

> **v10-ändring:** `BASE_GYM`, `BASE_CARDIO` och `BASE_QUEST` är nu **flata över gate-typer** — samma skada oavsett Normal/High-Rank/Red Gate. All svårighetsskillnad mellan gate-typer sitter numera enbart i Boss HP-tabellen (via targetPasses ovan), inte i skadan per slag. Detta gör balansering enklare: en spak (HP) istället för två som delvis motverkade varandra.

#### BASE_GYM
| Rank | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| Skada | 50 | 100 | 200 | 400 | 800 | 1 600 |

#### BASE_CARDIO
| Rank | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| Skada | 30 | 60 | 120 | 240 | 480 | 960 |

#### BASE_QUEST
| Rank | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| Skada | 20 | 40 | 80 | 160 | 320 | 640 |

### Player Crit
**Trigger:** 100% completion på schemalagda gym + cardio-pass → garanterad crit på nästa pass.
```js
critMultiplier = 1.30 + (effectiveDIS / 100) + flatCritBonuses
```
**UI-text:** *"Perfect week! — Next session will CRIT [×X.XX damage]"*

Sovereign's Ring: garanterad crit gäller för de två första passen istället för ett.

### Bossens skada mot spelaren
```js
const bossMult = (rankIndex) => Math.pow(2, rankIndex / 100);
missedGymDmg   = BASE_BOSS_GYM[gateType]   * bossMult(bossRankIndex)
missedOtherDmg = BASE_BOSS_OTHER[gateType] * bossMult(bossRankIndex)
```

| Gate | BASE_BOSS_GYM | BASE_BOSS_OTHER |
|---|---|---|
| Normal | 15 | 8 |
| High-Rank | 22 | 11 |
| Red Gate | 30 | 15 |

### Boss Crit
**Trigger:** spelaren klarar <20% av schemalagda pass under en vecka.

| Gate | Boss Crit-multiplikator |
|---|---|
| Normal | 1.5× |
| High-Rank | 2.0× |
| Red Gate | 2.5× |

---

## Fas 2 — Multiplayer-arkitektur (Supabase)

> Implementerad via två separata briefar: Brief A (schema + PIN-onboarding, Sonnet 5) och Brief B (Realtime-synk + race-condition-hantering, Fable 5). Appen är fortfarande en enda lokal `arise.html`-fil — Supabase är enbart backend/databas, ingen serverdeploy av appen själv.

### Auth-modell
Ingen riktig auth (Supabase Auth används inte). PIN-baserad profilval:
- Upp till 5 profiler totalt (Philip, Jonathan, + 3 framtida platser)
- Ny profil: namn + valfri preset-koppling + 4-siffrig PIN
- Befintlig profil: PIN krävs för att låsa upp
- Aktiv profil sparas i `localStorage` (`arise_active_profile`) för auto-login på samma enhet
- **RLS är avstängt på alla tabeller** — medvetet beslut, sluten vängrupp (max 5 personer), ingen känslig data. Detta skyddar mot misstag, inte mot avsiktligt fusk. Om appen någon gång växer utanför den närmaste vängruppen är detta första stället att lägga till riktig auth.

### Supabase-schema
```
profiles          — id, display_name, pin_code, preset_key, rank, level, xp, str/agi/vit/dis, skill points
teams             — id, name
team_members      — team_id, profile_id
gate_instances    — id, team_id, gate_type, boss_rank, boss_max_hp, boss_current_hp, started_at, ends_at, status
gate_progress     — gate_id, profile_id, sessions_completed, sessions_scheduled, crit_ready
inventory         — id, profile_id, item_key, rarity, acquired_at, equipped_slot
pity_counters     — profile_id, gate_type, no_legendary_streak, no_arcane_streak
push_subscriptions — id, profile_id, endpoint, keys_p256dh, keys_auth, created_at
```

### push_subscriptions (Brief A — push-notiser)

1-till-många från `profiles`: en profil kan ha flera rader (en per enhet/webbläsare
som prenumererat). `endpoint` är unikt — klienten upsertar på `endpoint` så att
samma enhet som prenumererar igen uppdaterar sin befintliga rad istället för att
skapa en dubblett.

Skrivs av klienten (via anon key, samma RLS-avstängda modell som resten av
schemat) när användaren godkänner notis-tillstånd. Läses/rensas av Edge
Function `send-push` (service role) — döda prenumerationer (410 Gone från
push-tjänsten) tas bort automatiskt vid sändning.

Generisk sändväg: `send-push` vet inget om spellogik, den skickar bara det den
blir ombedd att skicka (`profile_id`, `title`, `body`, valfri `tag`/`data`).
Verkliga triggers (T1-T4, K1-K2, L1-L3, B1-B4, se `ARISE_Notiser_Lista.md`)
byggs i Brief B ovanpå denna grund. Service worker (`sw.js`) stödjer
tagg-baserad visa/stäng för T2:s öppna/stäng-behov.

Källkod: `supabase/migrations/0001_push_subscriptions.sql`,
`supabase/functions/send-push/index.ts`, `supabase/migrations/0002_push_cron_stub.sql`,
`supabase/PUSH_SETUP.md` (deploy-runbook).

### Notissystem (Brief B) — ✅ IMPLEMENTERAT

Alla 11 notiser från `ARISE_Notiser_Lista.md` är byggda ovanpå Brief A:s infrastruktur.
Arkitekturen delar upp dem efter var triggern naturligt bor:

| Kategori | Notiser | Mekanism |
|---|---|---|
| Tidsbaserade | T1, T4, K1, K2, L3, B3, B4 | Edge Function `notify-cron`, körs var 15:e minut via pg_cron (`arise-notify-cron`) |
| Event-baserade (server) | B1 (boss-skada), B2 (boss dör) | Postgres-triggers på `gate_damage_events` / `gate_instances` → `arise_push()` → send-push |
| Event-baserade (klient) | T2 (aktivt pass, öppna+stäng), T3 (veckomål), L1 (level-up), L2 (rank-up) | Hooks i `index.html`: `startSession`/`finishSession`, `simulateWeekEnd`, `processLevels` |

**Nya tabeller:**
```
notification_preferences — profile_id, tz, t1/k1/k2/b34/l3-tider, t4_dow+t4_time, enabled, disabled_keys[]
notification_state       — klient-speglad spelstate: schedule (7 dagtyper, mån först), days_per_week,
                           weekly_gym/cardio, today_date + today_gym_logged/nutrition_done,
                           skill_points, last_skill_point_at, last_seen_at (presence)
notification_log         — dedup: (profile_id, notif_key, sent_on) unik — max 1 per typ och dag
```

**Klockslag är konfigurerbara per profil** i `notification_preferences` (defaults: T1 08:00,
K1 12:00, K2 20:00, B3/B4 07:30, L3 17:00, T4 torsdag 18:00, tz Europe/Stockholm).
Enskilda notistyper kan stängas av per profil via `disabled_keys` (t.ex. `'{b1}'`).

**Presence-modellen:** klienten skickar hjärtslag (`notification_state.last_seen_at`) var 60:e
sekund medan fliken är synlig. "Appen öppen" = hjärtslag färskare än 2 minuter. Används av
B2 (skicka bara till frånvarande team-medlemmar) och L1/L2 (via `only_if_absent`-flaggan i
send-push). Hjärtslaget startas medvetet EFTER `syncLoadActiveGate` i bootApp — så att
offline-intjänad XP (gate-utfall) processas medan `last_seen_at` ännu är gammal, vilket är
det som låter L1/L2 skickas för level-ups som hände "medan appen var stängd".

**Känd begränsning (L1/L2 + presence):** eftersom XP idag bara tjänas in av klient-side
actions kan en level-up i praktiken bara ske medan en enhet är aktiv — L1/L2 skickas därför
nästan uteslutande i offline-catchup-fallet ovan (gate avslutad medan spelaren var borta).
Om XP någon gång flyttas server-side blir presence-gaten mer meningsfull utan kodändring.

**Känd risk (T2-stäng på iOS):** `action:'close'`-pushen visar ingen notis, och iOS kan
strypa prenumerationer som får upprepade "tysta" pushar. Om T2-stängningen slutar fungera
på iPhone är fallbacken att ersätta close-pushen med en kort "Session complete"-notis med
samma tagg. Bevakas vid verklig användning.

**B1 är medvetet en egen liten SQL-funktion** (`arise_notify_boss_damage`) — beslutet
"varje skada" kan bytas till milstolpe-baserat genom att ändra enbart den funktionen.

**Notify-cron-detaljer:** "due" = lokal tid ≥ inställd tid (självläkande om en cron-körning
missas), profiler utan push-prenumerationer hoppas över helt, K2 skippas om alla tre
nutrition-checkins redan är gjorda, T1/B3/B4 skippas om dagens gympass redan loggats,
dedup-rader äldre än 30 dagar städas automatiskt.

**Medvetet uteslutna notiser** (från `ARISE_Notiser_Lista.md`, för framtida referens):
- **Missad-pass-nudge** — går emot no-forgiveness/no-guilt-designprincipen; T1 + T4 täcker behovet proaktivt
- **Gate-timeout-varning** — meningslös när bossen har mycket HP kvar; kräver HP-tröskel-logik som inte är värd komplexiteten
- **Loot-drop-notis** — redundant med B1/B2
- **Pity-snart-utlöst** — för nischad

Källkod: `supabase/migrations/0003_notification_system.sql`,
`supabase/functions/notify-cron/index.ts`, klient-hooks i `index.html`
(sök på "GAME NOTIFICATIONS (Brief B)").
Pity-counters är per spelare (ej per team) — oförändrat från Fas 1-designen, bara flyttat till Supabase.

### Realtid vs. refresh-on-load
- **Realtid (Supabase Realtime subscription):** `gate_instances.boss_current_hp` och `.status` — alla i samma team ser boss-HP uppdateras live utan refresh under en aktiv gate
- **Refresh-on-load (räcker gott):** inventory, profil-stats, leaderboard, skill tree

### Race-condition-hantering på boss-HP
Boss-skada skrivs INTE genom att klienten läser HP, räknar ut nytt värde och skriver tillbaka (klassisk race condition om två spelare loggar pass samtidigt). Istället används en atomär Postgres-funktion/RPC som gör `UPDATE ... SET boss_current_hp = boss_current_hp - $damage` server-side i ett steg. Gate-outcome (Victory/Timeout/Death) triggas en gång server-side och syns konsekvent för alla klienter i teamet.

### Skade-/XP-formler
Oförändrade — samma formler som i "Boss Fight-system" och "XP-källor & formler" ovan. Fas 2 flyttade bara **var** de exekveras och **var** resultatet lagras (klient-lokalt → delad Supabase-rad), inte **vad** de räknar ut.

### Team-koppling
Enkel modell lämplig för en sluten vängrupp — se implementationsbrief för exakt vald lösning (auto-team av alla profiler, eller val av deltagare per gate-försök).

---

## Hosting & Deployment (v12)

Appen (`index.html`, döpt om från `arise.html`) är publicerad via **GitHub Pages** så den går att öppna på mobilen och av Jonathan via en vanlig URL, istället för att bara finnas lokalt på Philips dator.

### Live-URL
**https://philipnilssonen.github.io/arise-training-app/**

Lägg till som genväg på hemskärmen (iOS: dela-ikon → "Lägg till på hemskärmen") för app-liknande känsla.

### Repo & synlighet
- **Repot är publikt.** Medvetet val efter avvägning: GitHub Pages på Free-planen kräver publikt repo (privat repo kräver GitHub Pro/Team). Dessutom är den publicerade sidan alltid öppen för alla oavsett repo-synlighet (statisk klient-app — koden syns via webbläsarens "View Page Source"), så ett privat repo hade ändå inte dolt Supabase anon-key fullt ut.
- **Risk-bedömning:** Med RLS avstängt i Supabase (se "Fas 2 — Multiplayer-arkitektur") kan i teorin vem som hittar nyckeln läsa/skriva i databasen. Bedömdes acceptabelt eftersom datan inte är känslig (träningsdata, XP, items) och projektet är ett litet hobbyprojekt för en sluten vängrupp — värsta praktiska scenario är att någon busar och stör datan, inte en allvarlig läcka. Om appen växer utanför vängruppen eller börjar hantera känsligare data är detta första stället att åtgärda (t.ex. slå på RLS, eller flytta känsliga anrop bakom en backend).

### Pusha nya ändringar live
Efter en ändring i `index.html` lokalt, körs följande i projektmappen för att publicera live (tar ~30–60 sek innan GitHub Pages byggt om):
```
git add .
git commit -m "beskrivning av ändringen"
git push
```
**Standardrutin:** Claude Code avslutar varje session där `index.html` ändrats med att committa och pusha automatiskt, om inget annat sägs.

---

## Drop rate-tabeller

### Normal Gate
| Raritet | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| Common | 70% | 58% | 45% | 32% | 20% | 10% |
| Rare | 26% | 34% | 40% | 42% | 42% | 40% |
| Legendary | 4% | 8% | 14% | 24% | 35% | 46% |
| Arcane | — | — | 1% | 2% | 3% | 4% |

### High-Rank Gate
| Raritet | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| Common | 45% | 34% | 24% | 15% | 8% | 3% |
| Rare | 42% | 44% | 44% | 42% | 38% | 33% |
| Legendary | 13% | 20% | 30% | 40% | 50% | 58% |
| Arcane | — | 2% | 3% | 4% | 5% | 6% |

### Red Gate
| Raritet | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| Common | 20% | 12% | 6% | 2% | — | — |
| Rare | 46% | 42% | 36% | 28% | 20% | 12% |
| Legendary | 34% | 43% | 54% | 64% | 72% | 78% |
| Arcane | — | 3% | 4% | 6% | 8% | 10% |

### Antal items per gate-seger
| Gate-typ | Items |
|---|---|
| Normal | 1 item garanterat (35% chans på 2) |
| High-Rank | 2 item garanterat (35% chans på 3) |
| Red Gate | 3 item garanterat (35% chans på 4) |

### Pity-system
| Gate-typ | +% per seger utan Legendary | +% per seger utan Arcane |
|---|---|---|
| Normal | +5% | +2% |
| High-Rank | +9% | +4% |
| Red Gate | +15% | +8% |

- Legendary droppar → Legendary-counter nollställs
- Arcane droppar → båda counters nollställs
- Pity persisterar mellan gates av samma typ
- Pity tillämpas per spelare individuellt

---

## Visuell design

**Färgpalett:**
- Bakgrund: `#050a12`
- Panel-bakgrund: `rgba(0,180,255,.07)`
- Panel-kant: `rgba(0,200,255,.25)`
- Accent cyan: `#00e5ff`
- Dim text: `#4a7a9b`
- Ljus text: `#c8e8ff`
- Vit text: `#e8f8ff`

**Bakgrundseffekt:**
```css
background-image: linear-gradient(rgba(0,200,255,.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(0,200,255,.03) 1px, transparent 1px);
background-size: 40px 40px;
```

**Panelhörn:** `::before` och `::after` med glödande hörnbrackets (┌ och ┘).

**Typsnitt:**
- `Rajdhani` — rubriker, etiketter, siffror, UI-text
- `Barlow Condensed` — brödtext, inputs

**Knappar:** Rektangulära, `[ BRACKET STYLE ]`, versaler, cyan glow.

**Notiser:** Mörk overlay-popup, neon cyan-kant, hörnbrackets, animerad scale-in.

---

## Demo Tools

- **+200 XP** — lägger till 200 XP
- **NEXT LEVEL** — hoppar exakt en level framåt
- **JUMP TO E20** — hoppar till max level av nuvarande rank
- **+GYM** — loggar ett gympass (XP + STR-counter)
- **+CARDIO** — loggar ett cardio-pass (XP + AGI-counter)
- **⏱ SIM DAY END** — återställer dagens nutrition-checkboxar och daily quest
- **⚡ SIMULATE WEEK END** — DIS-beräkning, crit-flagga, boss-skada, veckoavslut-passiver, återställer räknare

---

## Vänner / Leaderboard (RANKS-tab)

**Sedan v13:** Datakällan är live Supabase `profiles`-tabellen, inte längre en hårdkodad lista. `renderLeaderboard()` hämtar `id, display_name, rank, level` för samtliga profiler vid varje öppning av RANKS-tabben (refresh-on-load, ingen Realtime-subscription — matchar Fas 2:s princip för icke-tidskritisk data). Sorteras efter rank (E→S) sedan level inom samma rank. Nuvarande inloggad profil (`arise_active_profile`) markeras med ◄-markör. Skalar automatiskt till valfritt antal profiler (upp till de 5 platserna i PIN-onboardingen) — inget hårdkodat antal rader.

Edge cases: tomt/misslyckat Supabase-anrop visar ett tomt-state istället för att krascha renderingen; en enda profil visas utan problem.

**Förutsättning som byggdes samtidigt:** `profiles.rank/level/xp` synkades tidigare aldrig från klientens lokala state efter profilskapande (frös vid E1/0 XP för alltid — samma mönster som DEMO_ITEMS-buggen). `syncProfileRank()` skriver nu rank/level/xp till Supabase fire-and-forget varje gång de faktiskt ändras (i `processLevels()` och `confirmRankUp()`), så leaderboarden visar verklig progress.

**Historik (Fas 1, borttaget i v13):** tidigare visades fyra påhittade demo-vänner, hårdkodade i `renderRanks()`.

---

## Planerade features (bygg ej ännu)

> ✅ Fas 2 (Supabase/multiplayer) och Jonathans profil är nu implementerade — se "Fas 2 — Multiplayer-arkitektur" ovan. Följande var tidigare blockerade av Fas 2 och är nu olåsta för byggnation:

- **Team-passiver (Grupp 7):** str_aura, vit_aura, agi_aura, rallying_cry, soul_bond, pack_hunter, synced_strike, shadow_army, blood_pact_support — Supabase-beroendet är löst, redo att byggas
- **Party Challenges:** Vecklig tävling bland vänner — kräver multiplayer, nu möjlig
- **Visuals:** Boss-illustrationer, item-ikoner, loot-animationer — Supabase Storage finns nu tillgängligt, kan påbörjas

Fortsatt ej byggda, inget nytt beroende:
- **Dynamisk kostplan:** Beräknas automatiskt per profil baserat på kroppstyp + mål + kön + vikt/längd
- **Boss HP-balansering:** HP-tabellen tweakas efter verklig multiplayer-speltestning (nu möjlig med riktiga spelare, inte bara solo-simulering)
- **Job-system:** Auto-tilldelas vid D-rank
- **Titlar:** Achievements via milstolpar
- **Side Quests:** Slumpmässiga bonusuppgifter
- **Notiser:** Nästa pass-påminnelse via push-notiser

---

## Tech Notes

- Single-page web app (HTML/CSS/JS eller React)
- State i localStorage för persistens
- Mobilskärmsbredd (~390px)
- Google Fonts: `Rajdhani` och `Barlow Condensed`
- `data-a` / `data-v`-attribut med event delegation-lyssnare
- Inputs som persistenta DOM-element — rendera inte om hela sidan vid input
- `activeSession` i localStorage: `{ day, started, completedExercises[] }` — hanterar aktivt pass

### Känd lärdom: demo/testdata som smyger sig in i produktionsflödet
DEMO_ITEMS-buggen (fixad i v12) uppstod eftersom tillfällig testdata för att snabbt kunna se UI för alla rariteter/slots skrevs direkt in i `defaultState()` och `loadState()` istället för att hållas isolerad bakom en demo-flagga eller enbart i Demo Tools-panelen. Den glömdes sedan bort och följde med rakt in i Fas 2.

**Håll koll på samma mönster framöver:** all tillfällig test-/demodata (extra XP, forcerade rank-ups, mock-items, etc.) bör läggas i en tydligt namngiven och lätt sökbar konstant eller bakom Demo Tools-knapparna — aldrig direkt i de funktioner som kör för riktiga användare (`defaultState`, `loadState`, profilskapande). Innan en fas anses klar: grep:a igenom koden efter `DEMO`, `TEST`, `mock` och liknande för att fånga kvarlämnad testdata innan den följer med vidare.

### Känd lärdom: tab-scoped rendering vs. state-scoped rendering
Log Session-buggen (fixad i v6) berodde på att state (`activeSession`) uppdaterades korrekt i localStorage, men bara den flik som var aktiv vid state-ändringen re-renderades (`nav_home` anropar `switchTab('home')` utan ny render; `finishSession()` uppdaterar bara `#today-session`, inte HOME-tabben om man stod på TRAIN). Symptomet blev "fungerar ibland" — stale UI tills sidomladdning, eftersom state i sig var korrekt.

**Håll koll på samma mönster på andra ställen** där samma state visas i flera flikar samtidigt (t.ex. Gate-status på Hem vs. GATES-fliken, Character-summary på Hem vs. CHARACTER-fliken). Om fler sådana ställen hittas är en central `renderAll()`/state-subscription-modell att föredra över punktvisa render-anrop per händelse.
