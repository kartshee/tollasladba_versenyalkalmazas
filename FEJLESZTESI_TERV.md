# MERN Projekt Fejlesztési Terv

## 1. Projekt célja

A projekt célja egy **tollaslabda-versenyek lebonyolítására szolgáló webalkalmazás** fejlesztése,  
amely képes teljes körű, automatizált és konfigurálható versenykezelésre,  
ugyanakkor lehetőséget biztosít a versenybírói beavatkozásokra is.  
Az alkalmazás fő célja, hogy a versenyek szervezése és követése **hatékony, átlátható és intuitív módon történjen**,  
a szabályok és időkorlátok figyelembevételével.  
Az alkalmazás kizárólag a verseny adminisztrátora által használt laptopon fut majd.

### **Fő funkciók**

1. **Verseny létrehozása és konfigurálása**
   - Verseny típusa: csoportkör /(+) egyenes kiesés
   - Meccs paraméterei:
     - Alap: 2 nyert szett, 21 pontig (konfigurálható)
     - Időtartam figyelembevétele (pl. 35 perc per meccs)
   - Pályák és bírók hozzárendelése (pályák száma, bírók száma konfigurálható)
   - Szabályok és speciális esetek kezelése (pl. sérülés, késés)

2. **Versenyzők kezelése**
   - Hozzáadás/eltávolítás kizárólag admin jóváhagyással
   - Kézi módosítás lehetősége (pl. későn érkező játékos)
   - Automatikus figyelés, hogy egy játékos egyszerre ne legyen két pályán

3. **Meccsek lebonyolítása**
   - Pontok egyszerű, intuitív rögzítése
   - Eredmények visszamenőleges módosítása, amíg az adott kör vagy forduló le nem zárul
   - Kézi lezárás a körbeveréses szakaszokban az ujrasorsolás előtt
   - Lehetőség meccsek hozzáadására, törlésére vagy újrasorsolására

4. **Verseny állapotának vizualizálása**
   - Csoportos táblázatok és ágrajzok
   - Nyertesek, vesztesek, pontszámok egyértelmű megjelenítése
   - Az ágrajzról vagy UI elemről közvetlen hozzáférés az egyes meccsekhez

5. **Bírói és adminisztrátori funkciók**
   - Bírók hozzáadása meccsekhez
   - Konfigurációs beállítások megtekintése ikonokra kattintva (minden beállítás következményei)
   - Kézi beavatkozás lehetősége speciális eseteknél (pl. sérülés, szabálytalan esemény)

6. **Rendszerlogika és szabályok**
   - A szoftver ismeri és kezeli a tollaslabda alapvető szabályait
   - Automatikusan figyeli az időzítést és pályák elérhetőségét
   - Konfigurációval rugalmasan alkalmazkodik különböző versenyformátumokhoz

---

## 2. Technológiai stack

- **Frontend:** React  
- **Backend:** Node.js + Express  
- **Adatbázis:** MongoDB  
- **Fejlesztőkörnyezet:** WebStorm  
- **Verziókezelés:** Git + GitHub  
- **Deploy:** Saját szerverre

---

## 3. Projekt struktúra

- **Frontend:** `/client`  
  - Komponensek, oldalak, szolgáltatások (API hívások), állapotkezelés  
- **Backend:** `/server`  
  - Express app, modellek, kontroller, routerek, middleware  
- **Konfiguráció:** `.env`, egyéb konfigurációs fájlok

---

## 4. Fejlesztési fázisok

### Fázis 1 – Alap backend
- Express szerver létrehozása  
- MongoDB csatlakoztatása  
- User model + autentikáció (admin)  
- Alap CRUD API-k tesztelése

### Fázis 2 – Alap frontend
- React projekt létrehozása  
- Oldalak és komponensek felépítése  
- React Router beállítása  
- Kapcsolódás a backend API-hoz fetch/axios segítségével

### Fázis 3 – Verseny létrehozás és konfigurálás
- Verseny létrehozása csoportkör /(+) egyenes kiesés formátumban  
- Pályák és bírók hozzárendelése  
- Meccs paraméterek beállítása (szettek, pontok, idő)  
- Speciális esetek kezelése (pl. sérülés, késés)

### Fázis 4 – Meccsek lebonyolítása
- Pontok rögzítése, eredmények módosítása  
- Körök lezárása, ujrasorsolás  
- Meccsek hozzáadása/törlése

### Fázis 5 – Verseny állapotának vizualizálása
- Csoportos táblázatok, ágrajzok megjelenítése  
- Meccsek és játékosok állapotának követése  
- Interaktív UI az ágrajzról vagy külön elemekről

### Fázis 6 – Finomítás
- UI stílusok, intuitív kezelhetőség  
- Hibakezelés, form validáció  
- Időzítés és pályaellenőrzés optimalizálása

### Fázis 7 – Deploy
- Backend és frontend telepítése saját szerverre  
- Környezeti változók beállítása  
- Alap monitoring és hibakezelés

---

## 5. Projektmenedzsment

- **Task lista / Kanban:** Trello 
- **Git branching:** main / develop / feature branches  
- **Commits:** rövid, értelmes commit üzenetek
