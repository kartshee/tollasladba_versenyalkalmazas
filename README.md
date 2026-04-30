# Tollaslabda versenyrendező alkalmazás

Szakdolgozat – Gál Gergő Károly  
MERN-alapú webalkalmazás tollaslabda versenyek lebonyolításának támogatására.

---

## Az alkalmazásról

A rendszer lehetővé teszi tollaslabda versenyek teljes körű adminisztrációját: kategóriák kezelését, játékosok felvételét és check-inelését, automatikus csoportsorsolást, meccslista-generálást, eredményrögzítést, tabellaszámítást, rájátszás lebonyolítását és CSV-exportot.

**Főbb funkciók:**
- Verseny életciklus kezelése (tervezet → aktív → lezárt)
- Csoportkör, csoportkör + rájátszás és egyenes kiesés formátumok
- Csonka körmérkőzés (részleges round robin) nagy mezőnynél
- Automatikus ütemezés pályákra, fairness-gap alapú kategória-rotációval
- Többlépéses holtverseny-feloldás (mini-tabella → összesített statisztika → közös helyezés)
- Walkover, feladás (FF) és sérülés (RET) kezelése
- Fizetési csoportok és nevezési díj nyilvántartása
- Nyilvános eredménykijelző oldal (bejelentkezés nélkül elérhető)
- CSV export meccslistára, játékoslistára és tabellára

---

## Technológiai stack

| Réteg | Technológia |
|---|---|
| Backend | Node.js, Express, MongoDB, Mongoose |
| Frontend | React (Vite), egyedi CSS |
| Autentikáció | JWT |
| Adatbázis | MongoDB Atlas |

---

## Előfeltételek

- **Node.js** v18 vagy újabb
- **MongoDB Atlas** fiók (ingyenes tier elegendő), vagy lokális MongoDB példány
- **npm** (Node.js-sel együtt települ)

---

## Telepítés és futtatás

### 1. Klónozd a repót

```bash
git clone <repo-url>
cd tollasladba_versenyalkalmazas
```

### 2. Backend beállítása

```bash
cd alkalmazas/backend
npm install
```

Hozz létre egy `.env` fájlt az `alkalmazas/backend/` mappában:

Másold le a `.env.example` fájlt `.env` névvel, és töltsd ki a saját adataiddal.

```env
MONGO_URI=mongodb+srv://<felhasználónév>:<jelszó>@<cluster>.mongodb.net/?appName=<appnév>
PORT=5001
JWT_SECRET=<tetszőleges hosszú véletlenszerű string>
```

A `MONGO_URI` értéket a MongoDB Atlas felületén a **Connect → Drivers** menüpontban találod.

### 3. Frontend beállítása

```bash
cd ../frontend
npm install
```

Nincs szükség külön `.env` fájlra – a frontend a Vite proxy-n keresztül kommunikál a backenddel (alapértelmezetten `localhost:5001`).

### 4. Alkalmazás indítása

Két külön terminálban:

```bash
# 1. terminál – backend
cd alkalmazas/backend
npm run dev
```

```bash
# 2. terminál – frontend
cd alkalmazas/frontend
npm run dev
```

A frontend ezután elérhető: **http://localhost:5173**

---

## Demo adatok betöltése

A rendszer tartalmaz egy seed scriptet, amely három versenyből álló bemutató adathalmazt tölt az adatbázisba:

```bash
cd alkalmazas/backend
npm run seed:demo
```

Ez létrehozza az alábbi versenyeket egy demo felhasználó alatt:

| Verseny | Státusz | Tartalom |
|---|---|---|
| DEMO – Tervezet verseny | Tervezet | Check-in nyitva, fizetési csoportok, befizetés előtt |
| DEMO – Aktív verseny | Aktív | Futó meccsek, tabella, rájátszás, hibavédelmi tesztek |
| DEMO – Lezárt verseny | Lezárt | Végeredmény, WO/RET példák, lezárt eredményjavítás |

**Bejelentkezési adatok a demo fiókhoz:**

```
E-mail:  demo@tollas.local
Jelszó:  Demo123!
```

> A `--replace` flag hatására a script törli az előző demo adatokat és újra létrehozza őket. Az `npm run seed:demo` alapból ezt használja.

---

## Backend tesztek

A `alkalmazas/backend/src/scripts/` mappában end-to-end tesztszkriptek találhatók, amelyek a teljes API-t lefedik:

```bash
cd alkalmazas/backend

# Gyors smoke teszt
npm run smoke:e2e

# Önálló unit tesztek (service-réteg)
npm run selftest

# Egyedi tesztek (példák)
node src/scripts/e2e_standings_tiebreak.js   # holtverseny-feloldás
node src/scripts/e2e_playoff_qualifiers.js   # rájátszás kvalifikáció
node src/scripts/e2e_match_lifecycle.js      # meccs életciklus
node src/scripts/e2e_auth_ownership.js       # autentikáció és jogosultság
```

---

## Projektstruktúra

```
alkalmazas/
├── backend/
│   ├── src/
│   │   ├── middleware/      # JWT autentikáció
│   │   ├── models/          # Mongoose modellek
│   │   ├── routes/          # Express route handlerek
│   │   ├── services/        # Üzleti logika (standings, scheduler, playoff, stb.)
│   │   └── scripts/         # Seed és e2e tesztszkriptek
│   └── index.js
└── frontend/
    └── src/
        ├── components/      # Újrafelhasználható UI komponensek
        ├── context/         # React Context (auth)
        ├── layouts/         # Oldal-elrendezések (navigáció, auth)
        ├── pages/           # Oldalak
        ├── router/          # Kliens oldali routing
        └── services/        # API hívások, hibaüzenet-fordítás
```

---

## Szerző

**Gál Gergő Károly**  
Szakdolgozat, 2026
