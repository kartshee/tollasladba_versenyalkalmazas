# Munkanapló (összefoglaló) – Backend fejlesztés

## 1) Fejlesztőkörnyezet és szerverindítás stabilizálása
- Node/Express backend futtatása `nodemon`-nal.
- Modulrendszer hibák javítása (ESM vs CommonJS):
  - `package.json` “type” beállítások rendbetétele (duplikált/ellentmondó `type` mező megszüntetése).
  - Import/export hibák javítása (hiányzó `export default` esetek).
- Szerverport egységesítése: backend **5000** porton fut, alap visszajelzés rendben.

## 2) Alap REST API-k felépítése (Player ág)
- Player modell és route-ok elkészítése.
- Tesztelés WebStorm HTTP Clienttel:
  - `POST /api/players` teszt játékosok felvitele.
  - `GET /api/players` visszaellenőrzés.
- MongoDB Atlas kapcsolódási hiba kezelése:
  - IP whitelist probléma azonosítása és megoldási irány rögzítése.
  - Biztonsági elvek tisztázása publikus repo mellett (`.env` ne kerüljön fel GitHubra).

## 3) Tesztadatok és adatbázis tisztítása
- MongoDB Compass használata a tesztadatok törlésére (kollekciók ürítése).
- Új tesztadatok felvitele:
  - több játékos létrehozása,
  - csoport létrehozása játékosokból.

## 4) Meccsgenerálás (group round-robin)
- Round-robin párosítás generálás implementálása (`roundRobin.service`).
- Endpoint:
  - `POST /api/matches/group/:groupId` → meccsek generálása a group játékosaiból.
- Meccsek listázása:
  - `GET /api/matches/group/:groupId` → teljes meccslista (player adatok `populate`-tal).

## 5) Tollaslabda szabálylogika bevezetése (szettek + győztes)
- Szabályok rögzítése:
  - 2 nyert szettig tart,
  - szett 21 pontig, min. 2 pont különbség,
  - 20–20 esetén hosszabbítás max 30-ig.
- `Match` modell bővítése `sets` mezővel:
  - `sets: [{ p1, p2 }, ...]`
- Eredményrögzítés endpoint:
  - `PATCH /api/matches/:matchId/result` body: `{ sets: [...] }`
  - validáció: 2 vagy 3 szett, minden szett pontszáma szabályos,
  - winner automatikus meghatározása a szettek alapján.
- Kritikus tesztesetek futtatása (hibás pontszám, hibás típus, nincs 2 nyert szett), validációk finomítása.

## 6) Csoportkör lezárás és státusz ellenőrzés
- Csoportmeccsek tömeges eredményfeltöltése (teljes körmérkőzéses kör lezárása).
- Státusz endpoint:
  - `GET /api/matches/group/:groupId/status` → total/finished/unfinished visszaadása.

## 7) Csoporttabella (Standings) és holtverseny kezelése
- Standings endpoint:
  - `GET /api/groups/:groupId/standings`
  - statisztika: `played`, `wins`.
- Tie-break logika:
  - elsődleges rendezés: győzelmek száma (`wins`),
  - holtverseny esetén: egymás elleni eredmény (head-to-head).
- Tie-break helyességének verifikálása a meccslistával (az egymás elleni winner alapján rendez).

## 8) Playoff (top4 → elődöntők → döntő → győztes)
- Playoff generálás a group tabella top4 alapján:
  - `POST /api/groups/:groupId/playoff`
  - előfeltétel: minden csoportmeccs befejezett (winner + min. 2 szett),
  - elődöntők: #1 vs #4 és #2 vs #3 (`round: playoff_semi`).
- Döntő generálás:
  - `POST /api/groups/:groupId/playoff/final`
  - előfeltétel: 2 elődöntő létezik és mindkettőnek van winner-e,
  - döntő: `round: playoff_final`.
- Playoff lekérdezés frontend-barát struktúrában:
  - `GET /api/groups/:groupId/playoff` → `{ semis, final }` + `populate`.
- Győztes lekérdezése:
  - `GET /api/groups/:groupId/winner` → champion + final meccs adatai.

## 9) Kódminőség és refaktor
- Standings számítás kiszervezése helper függvénybe:
  - `computeStandings(players, finishedMatches)` használata több route-ban, duplikációk csökkentése.
- Felesleges/nem támogatott mezők eltávolítása (pl. `meta`, mivel nincs a Match sémában).
- Endpoint-struktúra tisztítása: külön listázás és külön status lekérés.

## 10) Verziókezelés (Git)
- Változások commitolása és push GitHubra.
- Publikus repo mellett biztonsági szempontok rögzítése:
  - `.env` és titkok tiltása gitből (`.gitignore`),
  - érzékeny connection stringek ne kerüljenek verziókezelésbe.

## Következő lépések (terv)
- Frontend: group dashboard (standings táblázat + playoff bracket + winner kártya).
- Tie-break bővítés 3+ fős holtverseny esetére (szettarány / pontarány).
- Tournament szintű konfigurátor (korcsoport/nem, csoportszám, továbbjutók, stb.).
- Ágrajz vizualizáció és PDF export.
