# Tollaslabda versenyrendező alkalmazás

**Szakdolgozat – Gál Gergő Károly**  
MERN-alapú webalkalmazás tollaslabda-versenyek lebonyolításának támogatására.

---

## A rendszerről

A TVR (Tollaslabda Versenykezelő Rendszer) kisebb és közepes méretű amatőr tollaslabda-versenyek teljes szervezési folyamatát lefedi: a kategóriák és játékosok felvételétől a helyszíni check-inen és sorsoláson át a meccslista-generálásig, eredményrögzítésig és végeredmény közzétételéig.

A rendszer két felületen működik egyszerre: a versenyszervező egy jelszóval védett adminisztrációs felületen vezeti a versenyt, míg a résztvevők és nézők egy nyilvános kijelzőoldalon követhetik az aktuális állást és a futó meccseket — bejelentkezés nélkül.

---

## Főbb funkciók

- Verseny életciklus kezelése: tervezet → aktív → lezárt
- Csoportkör, csoportkör + rájátszás és egyenes kiesés formátumok
- Csonka körmérkőzés (részleges round robin) nagy mezőnynél
- Automatikus ütemezés pályákra, fairness-gap alapú kategória-rotációval
- Többlépéses holtverseny-feloldás: mini-tabella → összesített statisztika → közös helyezés
- Helyszíni check-in kezelése türelmi idővel, nem megjelent játékosok automatikus kizárásával
- Walkover, feladás (FF) és sérülés (RET) kezelése
- Fizetési csoportok és nevezési díj nyilvántartása
- Nyilvános eredménykijelző oldal, bejelentkezés nélkül
- CSV export meccslistára, játékoslistára és tabellára
- Teljes műveleti napló minden adminisztrátori műveletről

---

## Technológiai stack

| Réteg | Technológia |
|---|---|
| Backend | Node.js, Express, MongoDB, Mongoose |
| Frontend | React (Vite), egyedi CSS |
| Autentikáció | JWT (JSON Web Token) |
| Adatbázis | MongoDB Atlas (felhő) vagy lokális MongoDB |

---

## Előfeltételek

- **Node.js** v18 vagy újabb — [nodejs.org](https://nodejs.org)
- **npm** — Node.js-sel együtt települ, külön teendő nincs
- **MongoDB Atlas fiók** — ingyenes, regisztráció: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
  - Alternatíva: lokális MongoDB példány, de fejlesztéshez az Atlas ajánlott.
- **Git** — a repó klónozásához

---

## Telepítés és futtatás

### 1. Repó klónozása

```bash
git clone https://github.com/kartshee/tollaslabda_versenyalkalmazas.git
cd tollasladba_versenyalkalmazas
```

### 2. MongoDB Atlas adatbázis beállítása

1. Jelentkezz be az [Atlas felületére](https://cloud.mongodb.com), és hozz létre egy ingyenes **M0** clustert, ha még nincs.
2. A cluster oldalán kattints a **Connect** gombra, majd válaszd a **Drivers** opciót.
3. Másold ki a kapcsolati stringet. Példa:

```text
mongodb+srv://<felhasználónév>:<jelszó>@<cluster>.mongodb.net/?appName=<appnév>
```

4. Az **Atlas → Database Access** menüpontban hozz létre egy adatbázis-felhasználót.
5. Az **Atlas → Network Access** menüpontban add hozzá az IP-címedet, vagy fejlesztési célra engedélyezd az összes IP-t:

```text
0.0.0.0/0
```

### 3. Backend beállítása

```bash
cd alkalmazas/backend
npm install
```

Másold le a `.env.example` fájlt `.env` névvel:

```bash
cp .env.example .env
```

Nyisd meg a `.env` fájlt, és töltsd ki:

```env
MONGO_URI=mongodb+srv://<felhasználónév>:<jelszó>@<cluster>.mongodb.net/?appName=<appnév>
PORT=5001
JWT_SECRET=ide_irj_egy_tetszoleges_hosszu_titkos_kulcsot
```

A környezeti változók jelentése:

- `MONGO_URI` — az Atlas kapcsolati stringje.
- `PORT` — a backend portja. Alapértelmezetten `5001`, általában nem kell módosítani.
- `JWT_SECRET` — hosszabb, véletlenszerű titkos kulcs. Például: `superTitkosKulcs2026`.

### 4. Frontend beállítása

```bash
cd ../frontend
npm install
```

A frontendnek nincs külön `.env` fájlra szüksége. A Vite fejlesztői szerver automatikusan proxy-zza az API-hívásokat a `localhost:5001` címre.

### 5. Alkalmazás indítása

Két külön terminálban kell elindítani a backendet és a frontendet.

Backend:

```bash
cd alkalmazas/backend
npm run dev
```

Frontend:

```bash
cd alkalmazas/frontend
npm run dev
```

A frontend elérhető:

```text
http://localhost:5173
```

A backend API elérhető:

```text
http://localhost:5001
```

---

## Demo adatok betöltése

A rendszer tartalmaz egy seed scriptet, amely feltölti az adatbázist egy kész bemutatóadathalmazzal. Ez lehetővé teszi, hogy az alkalmazás azonnal kipróbálható legyen saját adatbevitel nélkül.

```bash
cd alkalmazas/backend
npm run seed:demo
```

A script az alábbi három versenyt hozza létre egy demo felhasználó alatt:

| Verseny | Státusz | Tartalom |
|---|---|---|
| DEMO – Tervezet verseny | Tervezet | Játékosok felvéve, check-in nyitva, fizetési csoportok |
| DEMO – Aktív verseny | Aktív | Futó meccsek, tabella, rájátszás, sorsolás lezárva |
| DEMO – Lezárt verseny | Lezárt | Végeredmény, WO/RET példák, lezárt eredményjavítás |

**Bejelentkezési adatok:**

```text
E-mail: demo@tollas.local
Jelszó: Demo123!
```

> A script ismételt futtatáskor (`npm run seed:demo`) automatikusan törli az előző demo adatokat, majd újra létrehozza őket.

---

## Backend tesztek

Az `alkalmazas/backend/src/scripts/` mappában end-to-end tesztszkriptek találhatók, amelyek a teljes API-t lefedik élő adatbázis-kapcsolaton keresztül. A tesztek futtatásához a backend `.env` fájljának beállítva kell lennie.

```bash
cd alkalmazas/backend
```

Gyors smoke teszt — az összes főbb folyamat egymás után:

```bash
npm run smoke:e2e
```

Service-réteg unit tesztjei adatbázis nélkül:

```bash
npm run selftest
```

Egyedi tesztek:

```bash
node src/scripts/e2e_standings_tiebreak.js   # holtverseny-feloldás
node src/scripts/e2e_playoff_qualifiers.js   # rájátszás kvalifikáció
node src/scripts/e2e_match_lifecycle.js      # meccs életciklus
node src/scripts/e2e_auth_ownership.js       # autentikáció és tulajdonosi jogok
node src/scripts/e2e_global_schedule.js      # globális ütemezés
node src/scripts/e2e_match_rules.js          # BWF meccsszabályok validációja
node src/scripts/e2e_withdraw.js             # visszalépés kezelése
```

---

## Projektstruktúra

```text
alkalmazas/
├── backend/
│   ├── src/
│   │   ├── middleware/      # JWT autentikáció
│   │   ├── models/          # Mongoose sémák és modellek
│   │   ├── routes/          # Express route handlerek
│   │   ├── services/        # Üzleti logika: standings, scheduler, playoff, stb.
│   │   └── scripts/         # Seed és e2e tesztszkriptek
│   ├── .env.example         # Környezeti változók sablonja
│   └── index.js             # Belépési pont
└── frontend/
    └── src/
        ├── components/      # Újrafelhasználható UI komponensek
        ├── context/         # React Context: auth állapot
        ├── layouts/         # Oldal-elrendezések: navigáció, auth
        ├── pages/           # Oldalak
        ├── router/          # Kliens oldali routing
        └── services/        # API hívások, hibaüzenet-fordítás, formázók
```

---

## Szerző

**Gál Gergő Károly**  
Szakdolgozat, 2026
