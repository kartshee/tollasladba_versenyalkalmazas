# Szakdolgozat – írásos rész (manuscript) vázlat
**Dátum:** 2026-02-23  

---

## Tartalomjegyzék vázlat

### Előrészek
E1. Címoldal  
E2. Tartalomjegyzék  
E3. Tartalmi összefoglaló (HU, max. 1 oldal)  
E4. Nyilatkozat a saját munkáról  

---

## 1. Bevezetés
- problémafelvetés, motiváció
- célkitűzések
- scope / out-of-scope
- a dolgozat felépítésének rövid ismertetése

## 2. Szakmai háttér / irodalmi áttekintés (rövid, célzott)
- versenyrendszerek: round robin (csoportkör), single elimination (egyenes kiesés)
- alapfogalmak: meccs, szett, pontozás, tabella, tie-break, seeding, bracket
- rövid kitekintés: meglévő versenykezelő megoldások (milyen tipikus funkciók/hiányok)

## 3. Követelményspecifikáció
### 3.1 Funkcionális követelmények (FR)
- verseny/kategória létrehozás
- játékosok kezelése
- csoportkör generálás (páratlan létszám / bye)
- eredményrögzítés (szettek) + meccs státuszok (pending/running/finished)
- tabella számítás + holtverseny feloldás (tie-break szabályok)
- továbbjutók kiválasztása
- egyenes kieséses ág generálás + bracket megjelenítés
- PDF export (mit exportálunk és milyen formában)

### 3.2 Nem-funkcionális követelmények (NFR)
- konzisztencia, megbízhatóság
- használhatóság (admin/játékvezető flow)
- teljesítmény (ésszerű keretek)
- biztonság/validáció
- telepíthetőség, futtathatóság

### 3.3 Elfogadási kritériumok

## 4. Tervezés (rendszerterv)
### 4.1 Architektúra (frontend–backend–DB; REST API)
### 4.2 Adatmodell (fő entitások és kapcsolatok)
### 4.3 API terv (fő endpointok áttekintése)
### 4.4 Kulcslogikák / algoritmusok (külön alfejezetként, példákkal)
- round-robin párosítás (bye kezelés)
- tabella számítás és tie-break sorrend
- továbbjutás logika (top N)
- KO ág generálás (seeding alapelvek)
- PDF export pipeline (adat → nézet → export)

## 5. Megvalósítás
### 5.1 Backend modulok felelősségei (route/controller/service/model jelleggel)
### 5.2 Frontend fő nézetek és állapotkezelés (fő user flow-k)
### 5.3 Integráció: adatáramlás, hibakezelés, validáció

## 6. Tesztelés és validáció
### 6.1 Tesztstratégia (unit / integráció / manuális E2E)
### 6.2 Tesztesetek (követelményekhez kötve)
### 6.3 Edge case-ek
- páratlan létszám (bye)
- holtversenyek különböző esetei
- utólagos eredménymódosítás → tabella frissülés
- újragenerálás / duplikáció elkerülése (ha releváns)

## 7. Összegzés, eredmények, korlátok, továbbfejlesztés
- mi készült el (FR checklist)
- korlátok (mi maradt ki és miért)
- jövőbeli ötletek (pl. több pályás ütemezés, role-based hozzáférés, élő kijelző, import/export)

---

## Záró részek
Z1. Irodalomjegyzék  
Z2. Mellékletek (ábrák, képernyőképek, teszteset táblázat, API kivonat, stb.)

---

## Következő lépések (ha a struktúra jóváhagyott)
K1. A 3. fejezet (Követelményspecifikáció) teljes kidolgozása FR/NFR + elfogadási kritériumokkal.  
K2. A 4. fejezet (Tervezés) ábráinak elkészítése (architektúra + adatmodell).  
K3. Kulcsalgoritmusok formalizálása (szabályok + példabemenet/kimenet + edge case).  
K4. Tesztelési fejezethez teszteset táblázat összeállítása FR-ek alapján.  
