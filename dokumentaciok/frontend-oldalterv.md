# Tollaslabda Versenyalkalmazás – Frontend Oldalterv

Ez a dokumentum összefoglalja a webalkalmazás tervezett oldalstruktúráját, funkcióit és felhasználói folyamatát.  
A terv az adminisztrációs folyamatot követi: a verseny létrehozásától a játékosok felvételén át a csoportkörök és playoff lebonyolításáig.

---

## 1. Bejelentkezés
**URL:** `/login`

**Funkciók**
- Email mező
- Jelszó mező
- Belépés gomb
- Átirányítás a regisztrációra

---

## 2. Regisztráció
**URL:** `/register`

**Funkciók**
- Név
- Email
- Jelszó
- Jelszó megerősítés
- Regisztráció gomb
- Vissza a bejelentkezéshez

---

## 3. Főoldal (Dashboard)
**URL:** `/`

**Funkciók**
- „Új verseny létrehozása” gomb
- Folyamatban lévő versenyek listája
- Lezárt versenyek listája
- Kattintható versenykártyák → áttekintő oldalra vezetnek

---

## 4. Verseny létrehozása – Alapadatok
**URL:** `/tournament/create/basic`

**Mezők**
- Verseny neve
- Dátum
- Helyszín
- Kategória

**Navigáció**
- Tovább gomb

---

## 5. Verseny létrehozása – Formátum & Konfiguráció
**URL:** `/tournament/create/config`

**Beállítások**
- Verseny típusa:
  - Csak csoportkör
  - Csoportkör + playoff
- Csoportok száma
- Csoportok egyedi elnevezése (pl. *2004 B Fiú*)
  - Dinamikusan hozzáadható sorok
- Pályák száma
- Bírók száma (opcionális)

**Navigáció**
- Mentés
- Tovább a játékoskezelésre

---

## 6. Játékosok kezelése
**URL:** `/tournament/:id/players`

**Lista mezők**
- Név
- Klub (opcionális)
- Csoport (dropdown)
- Törlés

**Funkciók**
- Új játékos hozzáadása (popup)
- „Verseny indítása” gomb (csak ha minden csoportban van legalább 1 játékos)

---

## 7. Csoportok áttekintése (Sorsolás oldal)
**URL:** `/tournament/:id/groups`

**Tartalom**
- Csoportok táblázatos listája:
  - Csoport neve
  - Játékosok száma
  - „Megnyitás” gomb
- „Minden csoport sorsolása” gomb

---

## 8. Csoport részletei oldal
**URL:** `/tournament/:id/groups/:groupId`

**Tartalom**
- Játékosok listája a csoportban
- Automatikusan generált sorsolások
- Funkciók:
  - Sorsolás újragenerálása (csak erre a csoportra)
  - „Csoportkör indítása” gomb

---

## 9. Csoportkör meccsei
**URL:** `/tournament/:id/groupstage`

**Funkciók**
- Meccslista csoportonként
- Eredménybeviteli felület
- Mentés gomb meccsenként
- Automatikusan frissülő tabella

---

## 10. Playoff / Ágrajz
**URL:** `/tournament/:id/playoff`

**Funkciók**
- Vizuális ágrajz (negyeddöntő–elődöntő–döntő)
- Meccsekre kattintás → eredmény rögzítése
- Automatikus továbbjutó megjelenítése

---

## 11. Verseny áttekintő oldal
**URL:** `/tournament/:id`

**Tartalom**
- Verseny alapadatai
- Csoportkör összegzése
- Tabellák
- Playoff ágrajz
- Exportálási lehetőségek:
  - Csoportok PDF
  - Tabellák PDF
  - Playoff PDF
  - Teljes verseny export

**Funkciók**
- „Verseny lezárása” gomb

---

## 12. Profil oldal
**URL:** `/profile`

**Elemei**
- Név
- Email
- Jelszó módosítása
- Kijelentkezés

---

## 13. Hibakezelő oldal
**URL:** `/404`

**Tartalom**
- Minimális hibaüzenet
- Vissza a főoldalra link

---

## Összefoglaló – Szükséges oldalak
| Oldal | Készül |
|-------|--------|
| Login / Register | ✔️ |
| Dashboard | ✔️ |
| Alapadatok | ✔️ |
| Konfiguráció | ✔️ |
| Játékos kezelés | ✔️ |
| Csoportok listája | ✔️ |
| Csoport oldal | ✔️ |
| Csoportkör | ✔️ |
| Playoff | ✔️ |
| Áttekintő oldal | ✔️ |
| Profil | ✔️ |
| 404 | ✔️ |

---

