# MERN Projekt Fejlesztési Terv

## 1. Projekt célja

A projekt célja egy **tollaslabda-versenyek lebonyolítására szolgáló webalkalmazás** fejlesztése,  
amely képes teljes körű, automatizált és konfigurálható versenykezelésre,  
ugyanakkor lehetőséget biztosít a versenybírói beavatkozásokra is.  
Az alkalmazás fő célja, hogy a versenyek szervezése és követése **hatékony, átlátható és intuitív módon történjen**,  
a szabályok, időkorlátok és pihenőidők figyelembevételével.  
A rendszer kizárólag a verseny adminisztrátora által használt laptopon fut, internetkapcsolat nélkül is működőképes módon.

## 2. Hasonló rendszerek elemzése

//TODO

A projekt megkezdése előtt érdemes áttekinteni más, hasonló célú versenykezelő rendszereket, például:

- **TournamentSoftware** – nemzetközi szinten használt rendszer, részletes statisztikákkal, de kevésbé rugalmas konfigurációban  
- **Challonge** – általános versenyszervező webalkalmazás több sportágra, de nem sportágspecifikus  
- **Toornament** – fejlett platform online versenyekre optimalizálva, offline, manuális beavatkozásra kevésbé alkalmas  

A fejlesztendő rendszer célja, hogy a fenti megoldásokhoz képest **teljesen offline működjön**, és a tollaslabda-specifikus szabályokat, időzítéseket és bírói döntéseket közvetlenül kezelni tudja.

//TODO

## 3. Fő funkciók

1. **Verseny létrehozása és konfigurálása**
   - Verseny típusa: csoportkör /(+) egyenes kiesés
   - Meccs paraméterei:
     - Alap: 2 nyert szett, 21 pontig (konfigurálható)
     - Időtartam figyelembevétele (pl. 35 perc per meccs)
     - **Pihenőidő figyelembevétele** (pl. 15–20 perc két mérkőzés között)
   - Pályák és bírók hozzárendelése
   - Szabályok és speciális esetek kezelése (pl. sérülés, késés)

2. **Versenyzők kezelése**
   - Hozzáadás/eltávolítás kizárólag admin jóváhagyással
   - Kézi módosítás lehetősége (pl. későn érkező játékos)
   - Automatikus figyelés, hogy egy játékos egyszerre ne legyen két pályán

3. **Sorsolási logika**
   - Véletlenszerű sorsolás, figyelembe véve az azonos klubból érkező játékosokat igény szerint
   - Továbbjutás számítása győzelmek, pontkülönbség, egymás elleni eredmény alapján
   - Lehetőség újrasorsolásra manuálisan, a kör lezárása előtt

4. **Meccsek lebonyolítása**
   - Pontok egyszerű, intuitív rögzítése
   - Eredmények visszamenőleges módosítása, amíg az adott kör vagy forduló le nem zárul
   - Kézi lezárás a körbeveréses szakaszokban az újrasorsolás előtt
   - Lehetőség meccsek hozzáadására, törlésére vagy újrasorsolására

5. **Verseny állapotának vizualizálása**
   - Csoportos táblázatok és ágrajzok
   - Nyertesek, vesztesek, pontszámok egyértelmű megjelenítése
   - Az ágrajzról vagy UI elemről közvetlen hozzáférés az egyes meccsekhez

6. **Bírói és adminisztrátori funkciók**
   - Bírók hozzáadása meccsekhez
   - Konfigurációs beállítások megtekintése ikonokra kattintva
   - Kézi beavatkozás lehetősége speciális eseteknél

7. **Rendszerlogika és szabályok**
   - A szoftver ismeri és kezeli a tollaslabda alapvető szabályait
   - Automatikusan figyeli az időzítést, pályák elérhetőségét és pihenőidőt
   - Konfigurációval rugalmasan alkalmazkodik különböző versenyformátumokhoz

## 4. Technológiai stack

- **Frontend:** React  
- **Backend:** Node.js + Express  
- **Adatbázis:** MongoDB  
- **Fejlesztőkörnyezet:** WebStorm  
- **Verziókezelés:** Git + GitHub  
- **Deploy:** Saját szerverre

## 5. Projekt struktúra

- **Frontend:** `/client` – komponensek, oldalak, szolgáltatások, állapotkezelés  
- **Backend:** `/server` – Express app, modellek, kontroller, routerek, middleware  
- **Konfiguráció:** `.env`, egyéb konfigurációs fájlok

## 6. Fejlesztési fázisok

1. **Alap backend** – Express szerver, MongoDB, admin autentikáció, CRUD API-k  
2. **Alap frontend** – React projekt, oldalak, komponensek, React Router, backend kapcsolat  
3. **Verseny létrehozás és konfigurálás** – csoportkör/egyenes kiesés, pályák, bírók, meccs paraméterek, pihenőidő  
4. **Meccsek lebonyolítása** – pontok rögzítése, eredmények módosítása, körök lezárása, újrasorsolás  
5. **Verseny állapotának vizualizálása** – csoportos táblázatok, ágrajzok, interaktív UI  
6. **Finomítás** – UI stílusok, hibakezelés, form validáció, időzítés optimalizálása  
7. **Deploy** – backend és frontend telepítése, környezeti változók beállítása, alap monitoring

## 7. Projektmenedzsment

- **Task kezelés / Kanban:** Trello  
- **Git branching:** main, opcionálisan ideiglenes feature ágak  
- **Commit üzenetek:** rövid, leíró és funkcionális
