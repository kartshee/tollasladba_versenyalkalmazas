# Szakdolgozat – Tollaslabda versenyalkalmazás (MERN) – munkanapló

## Projekt rövid leírása
Webalapú tollaslabda versenykezelő alkalmazás (MERN), amely:
- csoportkört (round robin) és egyenes kiesést kezel,
- vizuális ágrajzot (bracket) tud megjeleníteni,
- eredmények rögzítését és a továbbjutás logikát támogatja,
- exportálható (pl. PDF).

---

## Időszak: 2026-01-29 – 2026-01-30 (összefoglaló az eddigi beszélgetések + mai tesztek alapján)

### Célok (amiért hozzányúltunk)
1) Csoportkörös meccsek generálása és lekérdezése stabilan  
2) Ütemezés (scheduler) megbízható működésének biztosítása  
3) Meccs státusz és eredmény rögzítés tesztelése, “valós” időbélyegek kezelése  
4) Hibák elhárítása: `req.body` undefined, hibás HTTP request formátum, ütemezés reset igény

---

## Elkészült / működik

### 1) Round-robin meccsgenerálás és listázás
**Fájl:** `alkalmazas/backend/src/routes/matches.routes.js`  
**Érintett endpointok:**
- `POST /api/matches/group/:groupId` – group meccsek generálása (duplikáció védelemmel)
- `GET /api/matches/group/:groupId` – group meccsek listázása (rendezve)
- `GET /api/matches` – query-paraméteres listázás (tournamentId/groupId/categoryId/status/round)

**Eredmény:** group meccsek rendben legenerálódnak és visszaolvashatók.

---

### 2) Scheduler (ütemezés) működése + reset
**Fájl:** `alkalmazas/backend/src/routes/matches.routes.js`

**Endpoint:**
- `POST /api/matches/group/:groupId/schedule`
  - Paraméterek: `startAt`, `courtsCount`, `matchMinutes`, `playerRestMinutes`, `courtTurnoverMinutes`, `force`
  - Szűrés: alapból csak `status=pending` + (ha `force=false`) csak a még nem ütemezett (`startAt=null`) meccseket ütemezi.
- `PATCH /api/matches/group/:groupId/schedule/reset`
  - Csak a `status=pending` group meccsekre nullázza: `startAt`, `endAt`, `courtNumber`

**Eredmény:**  
- Reset után a meccsek ütemezése újra lefuttatható és ténylegesen beállítja az időket/pályaszámot.
- A schedule endpoint már “véd” a hiányzó body ellen (korábban 500-at dobott).

---

### 3) Meccs státusz és eredmény tesztelés (running/finished)
**Fájl:** `alkalmazas/backend/src/routes/matches.routes.js`

**Endpoint:**
- `PATCH /api/matches/:matchId/status`  
  body: `{ "status": "running" | "pending" }`

**Megfigyelés:**  
- A “csak pending indítható” szabály működik (hibára helyesen 409-et ad).
- Running-ra váltáskor rögzítésre került tényleges kezdés (`actualStartAt`).

**Eredmény rögzítés:**
- `PATCH /api/matches/:matchId/result`  
  body: `{ "sets": [ {p1,p2}, ... ] }` (2 vagy 3 szett)

**Megfigyelés:**  
- Le tudtál zárni meccseket (`finished`), a winner újraszámolódik.
- Teszt alapján az eredmény utólagos módosítása is működött (új `sets` -> új winner).

---

## Hibák, amik kijöttek és megoldás / tanulság

### A) `req.body` undefined (schedule és status patch esetek)
**Tünet:** 500 “Cannot destructure property 'startAt' / 'status' of 'req.body' as it is undefined.”  
**Ok:** a kérés nem küldött JSON body-t jól (Content-Type hiány / rossz HTTP kliens formátum), vagy a backendben nem fut a JSON body parser. Expressben a `req.body` csak akkor töltődik, ha van megfelelő body-parsing middleware. 

**Megoldás (kliens oldali):**
- Küldd így a requestet:
  - Header: `Content-Type: application/json`
  - Body: tényleges JSON payload

**Megoldás (szerver oldali hardening):**
- `matches.routes.js`-ben safe destructuring:
  - `const { status } = req.body ?? {};`
- schedule endpoint elején guard:
  - ha `!req.body` => 400, érthető hibaüzenettel

**Megjegyzés:** az Express `express.json()` middleware a hivatalos beépített JSON body parser. 

### B) JetBrains / HTTP kliens hiba: “header name … invalid character 0x7b '{'”
**Ok (tipikusan):** a JSON body-t a kliens headerként értelmezte (rossz request formátum / hiányzó üres sor a header és body között, vagy rossz URL mint `http://api/...`).  
**Megoldás:** helyes HTTP request szintaxis + teljes URL (`http://localhost:5000/...`).

---

## Mi van “készen” (késznek tekinthető MVP szinten)
- Group round-robin meccsek generálása + listázása
- Group meccsek ütemezése több pályára (courtsCount), pihenőidő figyelembevétellel (playerRestMinutes)
- Schedule reset (pending meccsekre)
- Meccs státusz váltás (pending <-> running; finished védett)
- Meccs eredmény rögzítés (2/3 szett validáció, winner számítás)
- Actual start/end időbélyegek elkezdve (actualStartAt/actualEndAt)

---

## Következő potenciális lépcsőfok (javaslat)
### Következő (A) – “Szerkeszthető finished eredmény” szabályozottan (audit + biztonság)
**Fájl:** `alkalmazas/backend/src/routes/matches.routes.js` – `PATCH /:matchId/result` szekció
- Döntés: jelenleg “átírható” a finished eredmény (teszt alapján működik) – ezt érdemes formalizálni:
  - opcionális `reason` mező (miért módosították)
  - opcionális `editedBy` (admin/bíró) később auth után
  - `actualEndAt` frissítés logika: módosításnál újraírjuk-e vagy külön “lastEditedAt”?

### Következő (B) – Csoporttabella számítás (állás)
**Új service javaslat:**
- `alkalmazas/backend/src/services/groupStandings.service.js`
- API:
  - `GET /api/groups/:groupId/standings` (vagy `GET /api/matches/group/:groupId/standings`)
- Számolja: győzelem/vereség, szettarány, pontarány, rangsorolás

### Következő (C) – Frontend integráció
- Ütemezés UI (courtsCount, startAt, pihenőidő)
- Meccs lap: start (running), eredmény rögzítés, és “eredmény javítása” (ha finished)

---

## Rövid “hogyan pusholjam Git-re” lépések (Windows)
1) Ellenőrzés:
   - `git status`
2) Add (mindent vagy célzottan):
   - `git add .`
   - vagy célzottan:
     - `git add alkalmazas/backend/src/routes/matches.routes.js`
     - `git add alkalmazas/backend/src/models/Match.js`
     - `git add WORKLOG.md` (ha létrehozod)
3) Commit:
   - `git commit -m "Backend: scheduler reset + body guards + actualStart/End timestamps"`
4) Push:
   - ha a branch már trackelve van:
     - `git push`
   - ha új branch:
     - `git push -u origin <branch-nev>`

**Megjegyzés:** a CRLF/LF warning Windows-on gyakori; nem blokkoló. Ha zavar, később beállítható `core.autocrlf`, de ezt most nem muszáj piszkálni.

---
