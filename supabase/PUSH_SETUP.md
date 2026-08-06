# Push-notiser — deploy & test (Brief A)

Detta miljö saknar Supabase CLI/node, så följande steg måste köras av dig. Allt
källkod (migrations, Edge Function) finns redan i `supabase/`.

## 1. Skapa tabellen

Öppna Supabase Dashboard → SQL Editor → kör innehållet i
[`migrations/0001_push_subscriptions.sql`](migrations/0001_push_subscriptions.sql).

## 2. Installera Supabase CLI (om du inte redan har den)

```bash
brew install supabase/tap/supabase
```

## 3. Logga in och länka projektet

```bash
supabase login
supabase link --project-ref tdzdeljxuhghrfobtbti
```

## 4. Sätt VAPID-nycklarna som Edge Function-secrets

Ett nyckelpar genererades lokalt i den här sessionen (aldrig skickat över nätet).
**Den privata nyckeln finns ENDAST i chatten där den skapades — den ligger
medvetet inte i den här filen eftersom repot är publikt.** Kopiera den därifrån
(eller spara den i en lösenordshanterare) och kör:

```bash
supabase secrets set VAPID_PUBLIC_KEY=<publik-nyckel-från-chatten>
supabase secrets set VAPID_PRIVATE_KEY=<privat-nyckel-från-chatten>
supabase secrets set VAPID_SUBJECT=mailto:philip.nilssonen@gmail.com
```

Den publika nyckeln är redan inbakad i `index.html` (rad med `VAPID_PUBLIC_KEY`)
— det är avsiktligt, den är designad för att vara publik.

## 5. Deploya Edge Function

```bash
supabase functions deploy send-push
```

## 6. Testa manuellt (innan cron/telefon)

Via dashboard: Edge Functions → `send-push` → Invoke, med body:
```json
{ "profile_id": "<ditt-profile-id>", "title": "Test", "body": "Hej från dashboarden" }
```
Eller via curl:
```bash
curl -X POST 'https://tdzdeljxuhghrfobtbti.supabase.co/functions/v1/send-push' \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"<ditt-profile-id>","title":"Test","body":"Hej"}'
```
(Ger `{"sent":0,...}` tills du har en sparad prenumeration — se steg 7.)

## 7. Testa på Philips iPhone (kritiskt — läs detta)

**iOS Safari stödjer web push ENDAST för installerade PWA:er (Lägg till på
hemskärmen), inte för vanliga Safari-flikar, och kräver iOS 16.4+.**

1. Öppna live-URL:en i Safari på iPhone.
2. Dela-ikon → **"Lägg till på hemskärmen"**.
3. Stäng Safari, öppna appen **från hemskärms-ikonen** (inte från Safari) — den måste
   köra i standalone-läge för att push ska funka.
4. Logga in på din profil, öppna ⚙ Inställningar → **🔔 ENABLE NOTIFICATIONS**.
   Godkänn tillståndsprompten.
5. Kolla Settings-panelen: statusraden ska visa "✓ Aktiverad på den här enheten".
6. Gå till startsidan → Demo Tools → **🔔 SEND TEST PUSH**. Notisen bör dyka upp
   på låsskärmen/notiscenter inom några sekunder.

Om notisen inte dyker upp: kontrollera att Supabase-secrets är satta (steg 4),
att functionen är deployad (steg 5), och att raden faktiskt sparades i
`push_subscriptions` (Table Editor).

## 8. Cron-stub

Kör [`migrations/0002_push_cron_stub.sql`](migrations/0002_push_cron_stub.sql) i
SQL Editor, efter att ha bytt ut `<PHILIP_PROFILE_ID>` mot ditt riktiga
`profiles.id` (kör `select id, display_name from profiles;` för att hitta det).

Detta schemalägger ett jobb som körs varje heltimme och skickar ett hårdkodat
testmeddelande — bara för att bevisa att pg_cron → Edge Function → telefon
fungerar end-to-end. Riktiga speltriggers ersätter detta i Brief B.

Om `pg_cron`/`pg_net` inte redan är påslagna: Database → Extensions i dashboarden,
sök upp och aktivera båda (SQL:en i filen försöker också göra detta, men
dashboard-togglen är säkrare på hostad Supabase).
