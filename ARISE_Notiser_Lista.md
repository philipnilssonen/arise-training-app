# ARISE — Notiser: Fullständig lista (för godkännande)

> Status: Föreslagen, väntar på implementation. Denna lista är källan till sanning för Brief A + Brief B nedan. Uppdatera denna fil om listan ändras innan build.

---

## Träning

| # | Trigger | Text (exempel) | Typ |
|---|---|---|---|
| T1 | Träningspass planerat idag, vid valt klockslag | "You have a training session today" | Tidsbaserad |
| T2 | Aktivt träningspass pågår | "You have an active session — Click to open session" (försvinner automatiskt när passet avslutas) | Öppna+Stäng (tvådelad) |
| T3 | Veckomål uppnått (slut av vecka) | "Good job Hunter [name]! You have reached your weekly target, your next boss damage will Crit ⚔️" | Completion-baserad |
| T4 | DIS i fara mitt i veckan (t.ex. 3 dagar kvar, under mål) | "3 days left this week and you're behind pace — log a session to secure your crit bonus." | Completion-baserad, proaktiv |

## Kost

| # | Trigger | Text (exempel) | Typ |
|---|---|---|---|
| K1 | Mitt på dagen | "Don't forget your macro goals today!" | Tidsbaserad |
| K2 | Slutet av dagen | "Log your nutritional goals for the day!" | Tidsbaserad |

## Level

| # | Trigger | Text (exempel) | Typ |
|---|---|---|---|
| L1 | Level-up när appen är stängd | "You leveled up! Click to assign skill point" | Event-baserad |
| L2 | Rank-up (separat, större händelse) | "Congratulations Hunter, you have ranked up to [Rank]!" | Event-baserad |
| L3 | Oanvänt skill point kvar 3+ dagar | "You still have a skill point to assign." | Tidsbaserad, låg prioritet |

## Boss

| # | Trigger | Text (exempel) | Typ |
|---|---|---|---|
| B1 | Team-medlem gör skada mot boss | "[name] just did X damage to [Boss name]" | Event-baserad (varje skada) |
| B2 | Boss dör, spelare inte i appen | "[name] just made the final strike to [Boss name]. Congratulations Hunter, you killed the boss. You've been rewarded for your efforts." | Event-baserad |
| B3 | Aktiv solo-gate + planerat pass, på morgonen | "You're in a [gate name], deal your damage by completing your training session today!" | Tidsbaserad + state-koll |
| B4 | Aktiv team-gate + planerat pass, på morgonen | "You're in a [gate name], contribute by completing your training session today!" | Tidsbaserad + state-koll |

## Medvetet uteslutna (diskuterade och avfärdade)

- **Missad-pass-nudge** ("du missade igår") — avfärdad, går emot no-forgiveness/no-guilt-designprincipen. Pre-session (T1) och DIS-varning (T4) täcker det proaktiva behovet.
- **Gate-timeout-varning** — avfärdad, meningslös när boss har mycket HP kvar; skulle behöva egen HP-tröskel-logik för att bli meningsfull, inte värt komplexiteten just nu.
- **Loot-drop-notis (separat)** — avfärdad, redundant med B2/B1.
- **Pity-snart-utlöst-notis** — avfärdad, för nischad.

---

**Öppna frågor att bekräfta i implementation:**
- B1 körs "varje skada" från start (inte milstolpe-baserat) — utvärderas efter några veckors verklig användning; milstolpe-fallback finns redan designad om det blir för mycket brus.
- Exakt klockslag för T1/K1/K2/B3/B4 — sätts som konfigurerbar per profil, inte hårdkodat, så det kan justeras utan ny kodsession.
