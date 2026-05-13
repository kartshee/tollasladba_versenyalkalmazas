# Tervezési döntések és architekturális indoklások

Ez a dokumentum a Tollaslabda Versenykezelő Rendszer (TVR) fejlesztése során hozott főbb tervezési döntéseket és azok szakmai indoklását rögzíti.

---

## 1. Csonka round robin a csoportkörös párosításhoz

### A döntés

A rendszer nem minden esetben alkalmaz teljes körmérkőzést (full round robin). Nagy mezőny esetén **részleges (csonka) round robin** kerül generálásra, ahol minden játékos előre meghatározott, fix számú csoportmeccset kap.

### Indoklás

A teljes round robin (`n*(n-1)/2` mérkőzés) garantálja a legpontosabb erősorrendet, azonban `n > 6` játékos felett az időigény amatőr versenykörnyezetben elfogadhatatlanná válik. A rendszer célközönsége — kisebb házi és amatőr versenyek szervezői — számára nem a mezőny végén lévő helyezések tökéletes sorrendje az elsődleges cél, hanem a továbbjutók megbízható azonosítása.

A csonka round robin ennek megfelelően tudatos kompromisszum:
- kevesebb mérkőzés, rövidebb lebonyolítási idő,
- a legjobb játékosok egyértelműen elkülöníthetők a mezőny többi részétől,
- a pontos erősorrend a továbbjutási határon alul nem garantált.

### Elhatárolás a svájci rendszertől

A megvalósított megoldás **nem svájci rendszer**. A svájci rendszerben a párosítások fordulóról fordulóra, az aktuális eredmények alapján készülnek. A TVR-ben ezzel szemben a párosítások **a sorsolás lezárásakor, egyszer generálódnak**, és rögzítve maradnak. Ez egyszerűbb implementációt, kiszámíthatóbb lebonyolítást és egyértelmű auditálhatóságot biztosít.

### Implementáció

Páros létszámnál az első `m` körmérkőzéses forduló kerül lejátszásra a klasszikus polygon-rotációs algoritmus alapján. Páratlan létszámnál a körrotáció BYE-eltérést okozna, ezért ilyenkor cirkuláns gráfalapú párosítás kerül alkalmazásra, amely garantálja, hogy minden játékos pontosan `m` mérkőzést kapjon.

A javasolt `m` értékeket a `recommendMatchesPerPlayer()` függvény határozza meg létszám szerint:

| Létszám | Javasolt mérkőzés/fő |
|---|---|
| ≤ 6 | `n − 1` (teljes RR) |
| 7–10 | 5 |
| 11–14 | 6 |
| 15–20 | 6 |

---

## 2. Támogatott versenyformátumok

A rendszer három lebonyolítási formátumot támogat kategóriánként:

| Formátum | Leírás |
|---|---|
| `group` | Csak csoportkör, egyenes kiesés nélkül |
| `group+playoff` | Csoportkör, majd kiemelés alapú egyenes kiesés |
| `playoff` | Eleve egyenes kieséses kategória, csoportkör nélkül |

A playoff-ágban a bronzmérkőzés minden esetben automatikusan generálódik az elődöntők vesztesei között.

---

## 3. Kategóriák közötti pályabeosztás

### A döntés

A rendszer **nem alkalmaz kategóriaprioritást**. A globális ütemező az összes kategória várakozó mérkőzését együtt kezeli, és egyenletesen osztja el a pályákon.

### Indoklás

Prioritásos elosztásnál az alacsonyabb prioritású kategóriák meccseit a rendszer tartósan háttérbe szoríthatja, ami egyes játékoscsoportokat aránytalanul hosszú várakozásra kényszerítene. Az egyenletes elosztás fairebb versenyélményt biztosít, és a valóságos amatőr versenyek szervezési logikájához jobban igazodik.

### Implementáció

A `scheduler.service.js` mohó algoritmusa minden mérkőzéshez azt a pályát és időpontot választja, ahol a legkorábbi kezdés garantálható. Azonos kezdési idő esetén az addig kevesebbet használt pályát részesíti előnyben. Az algoritmus nyilvántartja a játékosok pihenőidejét és a kategóriák eddigi mérkőzésszámát, és ezek alapján biztosítja az egyenletes terheléselosztást.

---

## 4. Holtversenyek feloldása a csoportkörben

### A döntés

A tie-break logika **háromszintű, konfigurálható** rendszer. A kategóriánkénti `multiTiePolicy` beállítás határozza meg, hogy többjátékos holtversenynél az egymás elleni szűkített tabella után az összesített statisztika is figyelembe vehető-e.

### Lépések sorrendben

1. **Győzelmi arány**, majd győzelmek száma.
2. **Kétjátékos holtverseny**: az egymás elleni mérkőzés eredménye dönt.
3. **Többjátékos holtverseny**: az érintett játékosok egymás elleni mérkőzéseiből épített szűkített (mini) tabella.
4. Ha a `multiTiePolicy = 'direct_then_overall'`: az összesített szett- és pontkülönbség is alkalmazható tiebreaker-ként.
5. Ha a holtverseny így sem oldható fel: a rendszer jelzőt helyez el, és a szervezőtől kéri a manuális döntést — nem kényszerít ki sportszakmailag indokolatlan sorrendet.

### A `unresolvedTiePolicy` beállítás

Ha a feloldatlan holtverseny nem érinti a továbbjutási határt, a szervező dönthet, hogy a játékosok közös helyezést kapjanak (`shared_place`), vagy a rendszer manuális bírói döntést várjon (`manual_override`).

---

## 5. Nevezési díj kezelése adminisztratív nyilvántartásként

### A döntés

A rendszer **nem valósít meg online fizetési modult**. A nevezési díj kezelése kizárólag adminisztratív nyilvántartás.

### Indoklás

Banki integrációk (fizetési átjárók, visszautalások, számviteli megfelelőség) megvalósítása szakdolgozati keretek között szükségtelenül növelte volna a projekt komplexitását, és nem illeszkedik az amatőr versenyközeg tényleges igényeihez. A versenyszervezők jellemzően helyszíni készpénzes vagy átutalásos fizetést alkalmaznak.

A rendszer ennek megfelelően az alábbi adatokat tartja nyilván:
- van-e és mennyi a nevezési díj,
- ki fizette be, mikor és milyen módon,
- fizetési csoportok (pl. egy egyesület egyszerre fizet több játékos nevezési díját).

---

## 6. Szerepkörök és jogosultságok

### Felhasználói szerepkörök

A rendszerben egyetlen jogosultsági szint létezik: az `admin` (versenyszervező / döntnök). Hierarchikus RBAC (Role-Based Access Control) — pl. önálló játékvezetői vagy pénztárosi fiókok — nem kerültek megvalósításra, mivel az amatőr versenyek szervezési modelljében ezek a feladatok jellemzően ugyanazon személy kezében összpontosulnak.

### Mérkőzésszintű játékvezető

A szerepkörök közötti különbségtétel a mérkőzések szintjén jelenik meg: minden mérkőzéshez opcionálisan rendelhető játékvezető (`umpireName`). Ez nem önálló felhasználói fiókot jelent, hanem a Tournament szintjén konfigurált bírói névlistáról (`referees`) rendelt névazonosítót.

### Tulajdonosi adatelkülönítés

Minden versenyadat a létrehozó felhasználó (`ownerId`) tulajdonához kötött. Az `ownership.service.js` minden adatbázis-műveletnél ellenőrzi ezt a kötést, kizárva az illetéktelen hozzáférés lehetőségét.

---

## 7. Nyilvános kijelzőnézet hitelesítés nélkül

### A döntés

A `/public` végpontcsoport **nem igényel JWT hitelesítést**, és a futó, illetve következő mérkőzések adatait bárki számára elérhető módon szolgálja ki.

### Indoklás

A helyszíni kijelzőkön (pl. TV, projektor) megjelenített versenyzői tájékoztatónak bejelentkezés nélkül kell működnie. Ezek az eszközök jellemzően nem rendelkeznek versenyszervezői fiókkal, és folyamatos, automatikus frissítésre van szükségük. A végpont kizárólag olvasható adatokat ad vissza — módosítást nem tesz lehetővé —, így a hitelesítés elhagyása biztonsági kockázatot nem jelent.

---

## 8. JWT és localStorage — biztonsági kompromisszum

### A döntés

A hitelesítési token a böngésző `localStorage` tárolójában kerül elhelyezésre.

### Kompromisszum

A `localStorage`-ban tárolt token XSS-támadások esetén kiolvasható. Ez az OWASP ajánlásai szerint ismert sebezhetőségi vektor. A döntést az indokolja, hogy:
- a React keretrendszer beépített DOM-kezelése magas szintű védelmet nyújt az XSS-támadások ellen,
- a HttpOnly cookie-alapú megközelítés CSRF-védelmet igényelne, ami a projekt komplexitását aránytalanul növelné,
- a rendszer referencia-alkalmazás jellegű, nem éles, publikus forgalmat kiszolgáló platform.

Ez a tradeoff tudatosan meghozott architekturális döntés, amelynek korlátai a szakdolgozat 2.3 fejezetében kerülnek tárgyalásra.
