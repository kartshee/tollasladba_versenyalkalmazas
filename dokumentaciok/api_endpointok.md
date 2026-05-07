# API Endpoint dokumentáció

Alap URL: `http://localhost:5001`

Az `/api/*` útvonalak JWT-alapú hitelesítést igényelnek (`Authorization: Bearer <token>` fejléc).  
A `/public/*` útvonalak nyilvánosak, bejelentkezés nélkül elérhetők.

---

## Hitelesítés — `/api/auth`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| POST | `/api/auth/register` | Új felhasználó regisztrálása | Nem |
| POST | `/api/auth/login` | Bejelentkezés, JWT token visszaadása | Nem |
| GET | `/api/auth/me` | Bejelentkezett felhasználó adatai | Igen |
| PATCH | `/api/auth/password` | Jelszó módosítása | Igen |

---

## Versenyek — `/api/tournaments`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| POST | `/api/tournaments` | Új verseny létrehozása | Igen |
| GET | `/api/tournaments` | Saját versenyek listázása | Igen |
| GET | `/api/tournaments/:id` | Verseny részletei | Igen |
| PATCH | `/api/tournaments/:id` | Verseny alapadatainak módosítása | Igen |
| POST | `/api/tournaments/:id/start` | Verseny indítása (draft → running) | Igen |
| POST | `/api/tournaments/:id/finish` | Verseny lezárása (running → finished) | Igen |
| PATCH | `/api/tournaments/:id/finished-edit-lock` | Lezárt verseny eredményjavításának fel-/zárolása | Igen |
| POST | `/api/tournaments/configure` | Verseny konfigurációjának mentése (pályák, szabályok, stb.) | Igen |

---

## Kategóriák — `/api/categories`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| POST | `/api/categories` | Új kategória létrehozása | Igen |
| GET | `/api/categories` | Kategóriák listázása (szűrhető tournamentId alapján) | Igen |
| GET | `/api/categories/:id` | Kategória részletei | Igen |
| PATCH | `/api/categories/:id` | Kategória módosítása | Igen |
| DELETE | `/api/categories/:id` | Kategória törlése | Igen |

### Kategória műveletek

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| POST | `/api/categories/:id/players` | Játékos felvétele kategóriába | Igen |
| POST | `/api/categories/:id/players/bulk` | Tömeges játékosfelvétel szövegből | Igen |
| PATCH | `/api/categories/:id/checkin/grace` | Check-in türelmi idő felülírása | Igen |
| POST | `/api/categories/:id/finalize-draw` | Sorsolás lezárása, meccsek generálása | Igen |
| POST | `/api/categories/:id/playoff/advance` | Következő playoff kör generálása (playoff-only kategóriánál) | Igen |
| POST | `/api/categories/:id/close-grace` | Türelmi idő lezárása, nem megjelent játékosok kezelése | Igen |
| POST | `/api/categories/:id/friendly-match` | Barátságos meccs létrehozása | Igen |

---

## Játékosok — `/api/players`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| POST | `/api/players` | Új játékos felvétele | Igen |
| GET | `/api/players` | Játékosok listázása (szűrhető tournamentId, categoryId alapján) | Igen |
| PATCH | `/api/players/:playerId/checkin` | Jelenlét rögzítése vagy visszavonása | Igen |

---

## Csoportok — `/api/groups`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| POST | `/api/groups` | Csoport létrehozása | Igen |
| GET | `/api/groups` | Csoportok listázása | Igen |
| GET | `/api/groups/:groupId/standings` | Csoporttabella számítása | Igen |
| PATCH | `/api/groups/:groupId/withdraw` | Játékos visszalépésének rögzítése | Igen |
| POST | `/api/groups/:groupId/playoff` | Playoff generálása a csoport állása alapján | Igen |
| GET | `/api/groups/:groupId/playoff` | Csoport playoff meccseinek lekérése | Igen |
| POST | `/api/groups/:groupId/playoff/advance` | Következő playoff kör generálása | Igen |
| POST | `/api/groups/:groupId/playoff/final` | Döntő generálása (visszafelé kompatibilis) | Igen |
| GET | `/api/groups/:groupId/winner` | Csoport győztesének lekérése | Igen |

---

## Meccsek — `/api/matches`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| GET | `/api/matches` | Meccsek listázása (szűrhető) | Igen |
| GET | `/api/matches/group/:groupId` | Egy csoport összes meccse | Igen |
| POST | `/api/matches/group/:groupId` | Csoportkörös meccsek generálása | Igen |
| PATCH | `/api/matches/:matchId/status` | Meccs státuszának váltása (pending ↔ running) | Igen |
| PATCH | `/api/matches/:matchId/result` | Szett alapú eredmény rögzítése | Igen |
| PATCH | `/api/matches/:matchId/outcome` | Különleges kimenetel rögzítése (W.O., feladás, visszalépés) | Igen |
| PATCH | `/api/matches/:matchId/umpire` | Játékvezető hozzárendelése | Igen |
| POST | `/api/matches/group/:groupId/schedule` | Csoport meccseinek ütemezése pályákra | Igen |
| POST | `/api/matches/tournament/:tournamentId/schedule/global` | Verseny összes meccseinek globális ütemezése | Igen |
| POST | `/api/matches/tournament/:tournamentId/schedule/reestimate` | Dinamikus újraütemezés futó verseny közben | Igen |
| PATCH | `/api/matches/group/:groupId/schedule/reset` | Csoport ütemezésének törlése | Igen |

---

## Nevezések — `/api/entries`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| GET | `/api/entries` | Nevezések listázása (szűrhető) | Igen |
| PATCH | `/api/entries/:id` | Nevezés fizetési adatainak módosítása | Igen |
| POST | `/api/entries/sync-missing` | Hiányzó nevezési rekordok pótlása | Igen |

---

## Fizetési csoportok — `/api/payment-groups`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| GET | `/api/payment-groups` | Fizetési csoportok listázása | Igen |
| POST | `/api/payment-groups` | Új fizetési csoport létrehozása | Igen |
| PATCH | `/api/payment-groups/:id` | Fizetési csoport módosítása | Igen |

---

## CSV export — `/api/exports`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| GET | `/api/exports/tournaments/:tournamentId/matches.csv` | Meccsek exportálása CSV-be | Igen |
| GET | `/api/exports/tournaments/:tournamentId/players.csv` | Játékosok exportálása CSV-be | Igen |
| GET | `/api/exports/groups/:groupId/standings.csv` | Csoporttabella exportálása CSV-be | Igen |

---

## Műveleti napló — `/api/audit-logs`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| GET | `/api/audit-logs` | Műveleti napló lekérése (szűrhető tournamentId, categoryId, entityType alapján) | Igen |

---

## Nyilvános kijelző — `/public`

| Metódus | Útvonal | Leírás | Auth |
|---------|---------|--------|------|
| GET | `/public/tournaments/:tournamentId/board` | Verseny aktuális állása, futó meccsek, tabella — bejelentkezés nélkül | Nem |
