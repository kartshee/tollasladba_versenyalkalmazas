# Verseny- és Mérkőzésütemező Algoritmus — Működési Leírás (Frissített)

Ez a dokumentum összefoglalja a tollaslabda versenykezelő rendszer ütemezési algoritmusát.  
A rendszer csoportkörös (round robin) és egyenes kieséses (knockout) struktúrákat kezel,  
és több kategória egyszerre, közös pályákat használva tud futni.

---

# 1. Áttekintés

Egy verseny több **kategóriára** bontható (pl. Fiú 2004, Lány U13, Vegyes Páros stb.).  
Minden kategória önálló játékoslistával, csoportokkal és meccsekkel rendelkezik.

**Fontos:**  
- A pályák *globális erőforrások*.  
- Minden kategória és minden csoport **ugyanazokon a pályákon** játszik.  
- Ha kevés pálya van és sok a csoport, akkor természetes sorban állás lesz — ez a rendszer része, nem hiba.

---

# 2. Bírókezelés

A bíró kezelésének két módja van:

- **Ha a verseny rendelkezik bírókkal** → *minden meccshez kötelező a bíró*.  
- **Ha nincs bíró a versenyen** → *a bírófeltétel teljesen inaktív*.

Nincs „opcionális” mód — ez leegyszerűsíti a logikát és a konfigurációt.

---

# 3. Csoportkör (Round Robin)

A csoportkör NEM ellenfélkeresés, hanem előre generált, determinisztikus round robin.

A csoport meccsei például 4 játékos esetén:

- A vs B  
- A vs C  
- A vs D  
- B vs C  
- B vs D  
- C vs D  

**Minden párosítás egyszer történik meg — nincs duplikált meccs.**

A feladat: **csak az ütemezés**, nem a párok újrakészítése.

---

# 4. Csoportok Újrasorsolása

Az újrasorsolás azt jelenti, hogy:
- a játékosokat újrarandomizáljuk a csoportokba,
- generáljuk az új round robin meccslistákat,
- a meccsek státusza visszaáll `pending` állapotba.

Újrasorsolás csak addig végezhető, amíg egy meccs sem indult el.

---

# 5. Globális Greedy Ütemező (legfontosabb rész)

Az ütemező **verseny szintjén fut**, nem kategória szinten.

Ez azt jelenti:

👉 **Minden kategória meccsei egy közös meccslistába kerülnek,  
és az ütemező abból választ, hogy melyik indítható.**

### A meccs indíthatóságának feltételei:

#### Kötelező:
- van szabad pálya  
- a két játékos pihent legalább X percet  
- ha van bíró: van szabad, pihent bíró  
- a meccs még `pending` állapotú  

#### Nincs:
- dedikált pálya csoporthoz vagy kategóriához  
- „csoporton belüli pálya” logika  
- maximális várakozási korlát (ez opcionálisan bevezethető)

### Gyenge (opcionális) feltételek:
- klubütközés kerülése  
- sokat váró játékos előnyben részesítése  
- kiegyenlített terhelés a bírók közt  
- kiegyenlített terhelés a pályák közt  

Ha a kötelező feltételek teljesülnek, a meccs indítható.  
Ha nincs indítható meccs, az ütemező vár.

### Több csoport, kevés pálya:
Ez NEM hiba, hanem normális működés:
- a meccsek sorra kerülnek, amikor pálya felszabadul.

---

# 6. Prioritási rendszer

A rendszer a következő sorrendben próbál meccset indítani:

1. **Erős**: pihenőidő és kötelező erőforrások (pálya/bíró)  
2. **Erős**: pending státusz, round robin követelmények  
3. **Gyenge**: klubütközés elkerülése  
4. **Gyenge**: kiegyenlítő logika (ki vár hosszabb ideje)

Ez a sorrend ipari standardnak tekinthető.

---

# 7. Körbeverés (Tie-breaker)

Ha 3 vagy több játékos azonos pontszámot ér el:

1. mini-tabella az érintett játékosok közt  
2. pontarány (nyert-vesztett pontok aránya)  
3. összesített pontarány  
4. sorsolás (utolsó lehetőség)

---

# 8. Egyenes kiesés (Knockout)

A knockout bracket automatikusan generálódik:

- top 4  
- top 8  
- top 16  
- top 32  
… a kategóriában lévő játékosok számától függően.

Az ütemezés **ugyanazzal a greedy algoritmussal történik**, mint a csoportkörben.

A különbség:
- a párok a bracket alapján adottak,
- csak az indítás ütemezése változik.

---

# 9. Ütemező Pszeudokód

```pseudo
function schedule():
    while true:
        freeCourts = getFreeCourts()

        if freeCourts is empty:
            wait
            continue

        pendingMatches = getPendingMatchesAcrossAllCategories()

        candidate = findMatchWhereAllStrongConstraintsPass(pendingMatches)

        if none found:
            candidate = findMatchIgnoringWeakConstraints(pendingMatches)

        if candidate still none:
            wait
            continue

        assign match to freeCourt
        assign referee if required
        set start time = now
