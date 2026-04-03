# Tollaslabda Versenyalkalmazás – Frontend oldalterv

Ez a dokumentum a frontend tervezett oldalstruktúráját és a fő felhasználói folyamatokat foglalja össze a rendszer jelenlegi backend állapota alapján.

A frontend célja nem egy egyszer végigkattintható varázsló, hanem egy olyan adminisztrációs felület, amely a döntnök / versenyszervező valós munkafolyamatát követi:

1. verseny létrehozása  
2. verseny globális beállításai  
3. kategóriák létrehozása és konfigurálása  
4. nevezések / játékosok kezelése  
5. check-in  
6. draw lezárása  
7. meccsek és ütemezés  
8. eredményrögzítés  
9. csoportállás és továbbjutás  
10. playoff és bronzmeccs  
11. kijelzős nézet / board  
12. export és lezárás  

---

## 1. Bejelentkezés

**URL:** `/login`

### Funkciók
- e-mail mező
- jelszó mező
- belépés gomb
- átirányítás regisztrációra

---

## 2. Regisztráció

**URL:** `/register`

### Funkciók
- név
- e-mail
- jelszó
- jelszó megerősítés
- regisztráció gomb
- vissza a bejelentkezéshez

---

## 3. Dashboard

**URL:** `/`

A rendszer főoldala, ahol a felhasználó a saját versenyeit látja.

### Funkciók
- „Új verseny létrehozása” gomb
- saját versenyek listája
- státusz szerinti bontás:
  - tervezet
  - aktív
  - lezárt
- keresés / szűrés
- kattintható versenykártyák → verseny áttekintő oldal

---

## 4. Új verseny létrehozása

**URL:** `/tournaments/new`

Ez az oldal a verseny globális szintű adatait és erőforrásait kezeli.  
Itt még nem kategóriákat hozunk létre, hanem a teljes verseny kereteit adjuk meg.

### Alapadatok
- verseny neve
- dátum
- helyszín

### Globális versenybeállítások
- pályák száma
- becsült meccsidő
- minimális játékospihenő
- pályaforgatási idő

### Nevezési díj
- van-e nevezési díj
- nevezési díj összege

### Hivatalos személyek / globális erőforrások
- döntnök / versenyszervező megnevezése
- van-e játékvezetői erőforrás a versenyen
- játékvezetők listája név szerint

Megjegyzés: a játékvezetők nem egy-egy kategóriához, hanem az adott versenyhez tartozó globális erőforrások, ezért itt kell őket kezelni.

### Funkciók
- mentés
- verseny létrehozása
- vissza a dashboardra

---

## 5. Verseny áttekintő oldal

**URL:** `/tournaments/:id`

Ez a verseny központi adminisztrációs oldala.

### Tartalom
- verseny alapadatai
- gyors statisztikák:
  - kategóriák száma
  - nevezések száma
  - check-inelt játékosok száma
  - meccsek száma
- kategóriák listája
- nevezések / játékosok link
- check-in link
- meccsek link
- standings link
- playoff link
- board link
- export lehetőségek
- lezárás gomb

---

## 6. Kategóriák listája

**URL:** `/tournaments/:id/categories`

### Funkciók
- a verseny kategóriáinak listája
- új kategória létrehozása
- meglévő kategória megnyitása
- kategória szerkesztése
- kategória törlése

### Listaelemek
- kategória neve
- formátum
- csoportok száma
- továbbjutók száma
- playoff méret
- állapot

---

## 7. Új kategória létrehozása

**URL:** `/tournaments/:id/categories/new`

## 8. Kategória szerkesztése

**URL:** `/tournaments/:id/categories/:categoryId/edit`

A két oldal mezői lényegében azonosak.

### Alapmezők
- kategória neve
- nem
- korosztály

### Formátum
- `group`
- `group+playoff`
- `playoff`

### Csoportkörös beállítások
- csoportok száma
- csoportlétszám célérték / struktúra
- csonka round robin meccsszám játékosonként

### Továbbjutás / playoff
- továbbjutók száma
- playoff méret
- bronzmeccs információ megjelenítése  
  (a backend logika szerint a bronzmeccs kötelezően létrejön, ahol releváns)

### Tie-break policy
- többfős holtverseny kezelése:
  - `direct_only`
  - `direct_then_overall`
- feloldhatatlan holtverseny kezelése:
  - `shared_place`
  - `manual_override`

### Funkciók
- mentés
- vissza a kategória oldalra

---

## 9. Nevezések / játékosok kezelése

**URL:** `/tournaments/:id/entries`

A frontend fő nézete itt már ne csak egyszerű játékoslista legyen, hanem nevezésközpontú adminisztrációs oldal.

### Táblázat mezői
- játékos neve
- klub
- kategória
- check-in állapot
- befizette-e
- nevezési díj összege
- payment group
- számlázási név
- számlázási cím

### Funkciók
- egyéni hozzáadás
- tömeges felvétel
- szerkesztés
- törlés
- check-in státusz módosítás
- befizetési státusz módosítás
- payment group hozzárendelés

---

## 10. Payment group kezelés

**URL:** `/tournaments/:id/payments`

Ez az oldal a csoportos befizetések adminisztrációját kezeli.

### Funkciók
- új payment group létrehozása
- payer név megadása
- számlázási név
- számlázási cím
- több nevezés hozzárendelése ugyanahhoz a fizetési csoporthoz
- fizetett / nem fizetett állapot kezelése

---

## 11. Check-in oldal

**URL:** `/tournaments/:id/checkin`

Ez külön operatív oldal, mert a verseny napján önálló adminisztrációs feladat.

### Funkciók
- kategóriánkénti játékoslista
- jelen van / nincs jelen állapot állítása
- tömeges check-in
- szűrés kategóriára
- check-in összesítés

---

## 12. Kategória műveleti oldal

**URL:** `/tournaments/:id/categories/:categoryId`

Ez az adott kategória fő adminisztrációs oldala.

### Tartalom
- kategória alapadatai
- résztvevők listája
- draw állapot
- csoportok listája vagy playoff állapot
- standings összefoglaló
- legfontosabb műveleti gombok

### Fő műveletek
- draw finalizálása
- csoportmeccsek generálása
- playoff generálása
- továbbjuttatás / advance
- kategóriaszintű ütemezés indítása
- szerkesztés

---

## 13. Meccsek oldala

**URL:** `/tournaments/:id/matches`

Ez az egyik legfontosabb operatív oldal.

### Szűrők
- kategória
- csoport
- round
- státusz
- pálya

### Táblázat mezői
- játékos 1
- játékos 2
- kategória
- round
- státusz
- pálya
- időpont
- játékvezető
- eredmény

### Funkciók
- státusz módosítása
- játékvezető hozzárendelése
- eredmény rögzítése
- eredmény javítása

Megjegyzés: a játékvezetők a verseny globális erőforrásai, de a konkrét hozzárendelés meccsszinten itt történik.

---

## 14. Ütemezés oldal

**URL:** `/tournaments/:id/schedule`

Ez a verseny teljes ütemezési áttekintő oldala.

### Funkciók
- globális scheduler futtatása
- pályák szerinti nézet
- időrendi nézet
- kategória szerinti szűrés
- betervezett és futó meccsek áttekintése

---

## 15. Csoportállás / standings oldal

**URL:** `/tournaments/:id/categories/:categoryId/standings`

### Tartalom
- helyezés
- játékos neve
- győzelmek / win rate
- szettkülönbség
- pontkülönbség
- tie-break információ
- shared place jelölés
- unresolved tie figyelmeztetés

### Funkciók
- tie-break policy szerinti megjelenítés
- ha szükséges, manuális döntéshez kapcsolódó állapot megjelenítése

---

## 16. Playoff oldal

**URL:** `/tournaments/:id/categories/:categoryId/playoff`

### Funkciók
- vizuális bracket nézet
- elődöntő
- döntő
- bronzmeccs
- playoff-only kategóriák támogatása
- meccsre kattintva eredményrögzítés
- továbbjutók automatikus megjelenítése

---

## 17. Board / kijelzős oldal

**URL:** `/tournaments/:id/board`

Ez a kijelzős / TV-s nézet adminból is elérhető előnézetként.

### Tartalom
- éppen futó meccsek
- következő meccsek
- pályák szerinti bontás

### Cél
A játékosok és nézők gyorsan lássák:
- hol folyik jelenleg meccs
- melyik meccs következik
- melyik pályán fognak játszani

---

## 18. Export és adminisztratív műveletek

Ez lehet külön oldal vagy a verseny áttekintő oldal egyik blokkja.

**Javasolt URL:** `/tournaments/:id/admin`

### Funkciók
- meccslista export CSV
- játékos / check-in lista export CSV
- standings export CSV
- műveleti napló megjelenítése
- fontos események időrendje

---

## 19. Profil oldal

**URL:** `/profile`

### Funkciók
- név
- e-mail
- jelszó módosítása
- kijelentkezés

---

## 20. Hibakezelő oldal

**URL:** `*`

### Tartalom
- 404 hibaüzenet
- vissza a főoldalra

---

# Összefoglaló – Tervezett oldalak

## Auth
- `/login`
- `/register`

## Fő admin
- `/`
- `/tournaments/new`
- `/tournaments/:id`

## Kategóriák
- `/tournaments/:id/categories`
- `/tournaments/:id/categories/new`
- `/tournaments/:id/categories/:categoryId`
- `/tournaments/:id/categories/:categoryId/edit`
- `/tournaments/:id/categories/:categoryId/standings`
- `/tournaments/:id/categories/:categoryId/playoff`

## Nevezések / fizetések
- `/tournaments/:id/entries`
- `/tournaments/:id/payments`

## Operatív oldalak
- `/tournaments/:id/checkin`
- `/tournaments/:id/matches`
- `/tournaments/:id/schedule`
- `/tournaments/:id/board`

## Adminisztratív kiegészítők
- `/tournaments/:id/admin`
- `/profile`
- `*`

---

# MVP javaslat

Az első frontend verzióban az alábbi oldalak legyenek prioritásban:

1. login / register  
2. dashboard  
3. új verseny létrehozása  
4. kategória létrehozása / szerkesztése  
5. nevezések / játékosok kezelése  
6. check-in  
7. kategória műveleti oldal  
8. meccsek oldala  
9. standings oldal  
10. playoff oldal  

Ezután jöhet második körben:
- payment group finomabb UI
- board oldal
- export / admin blokk
- profil oldal részletesebb kidolgozása
