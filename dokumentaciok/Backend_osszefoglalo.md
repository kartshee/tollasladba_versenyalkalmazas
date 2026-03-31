# Összefoglaló a tollaslabda versenykezelő rendszer backendjéről

A rendszer jelenlegi állapotában a backend már működőképes, és az alapvető üzleti logikák automatizált tesztekkel is ellenőrizve lettek. A korábbi versenykezelési funkciók mellett bekerült célzott műveleti naplózás, többféle CSV export, konfigurálható tie-break logika, nevezési díj nyilvántartás, valamint a későbbi kijelzős nézet backend alapja is.

## Mit tud jelenleg a backend

A backend jelenleg az alábbi fő funkciókat támogatja:

- felhasználói regisztráció és bejelentkezés
- versenyek létrehozása és mentése a létrehozó felhasználó profiljához
- kategóriák létrehozása és konfigurálása
- játékosok egyenkénti vagy tömeges felvétele
- check-in kezelés, vagyis annak jelölése, hogy ki jelent meg ténylegesen
- csoportkörös meccsek generálása
- teljes és csonka round robin logika
- meccsek pályákra és időpontokra ütemezése
- több kategória egyidejű, fair pályaelosztásos globális ütemezése
- eredmények rögzítése és szükség esetén javítása
- visszalépések kezelése
- csoportállás számítása konfigurálható tie-break szabályokkal
- továbbjutók kiválasztása
- playoff ág generálása kategórián belül
- külön playoff-only, tehát eleve egyenes kieséses kategória kezelése
- bronzmeccs generálása a playoffban
- konfigurálható meccsszabályok kezelése
- hibás konfigurációk kiszűrése
- nevezési díj adminisztratív nyilvántartása
- döntnök / versenyszervező és meccsszintű játékvezető logika elkülönítése
- fontos műveletek naplózása műveleti napló formájában
- adatok exportálása CSV formátumban
- nyilvános board végpont a futó és következő meccsek megjelenítéséhez

A rendszerhez automatizált smoke tesztek is készültek, amelyek a fő folyamatokat végigellenőrzik.

## Felhasználói működés

A rendszerben már van regisztráció és bejelentkezés. A felhasználó e-mail címmel és jelszóval tud regisztrálni, a jelszó nem sima szövegként kerül tárolásra, hanem biztonságos módon hash-elve.

A bejelentkezés után minden verseny a létrehozó felhasználóhoz kapcsolódik. Ez azt jelenti, hogy:

- minden versenynek van tulajdonosa
- a felhasználó csak a saját versenyeit látja
- csak a saját versenyeit tudja módosítani
- a hozzá tartozó kategóriák, csoportok, meccsek és ütemezések is az adott tulajdonosi körhöz tartoznak

Ez azért fontos, mert így a rendszer már nem egy „közös tesztbackend”, hanem valódi felhasználói alkalmazásként működik.

## Csoportkör és round robin logika

A rendszer támogatja a csoportkörös lebonyolítást. Kisebb csoportoknál teljes round robin is alkalmazható, vagyis mindenki játszik mindenkivel. Nagyobb létszámnál viszont ez gyorsan túl sok meccset eredményez, ezért került be a csonka round robin logika.

### Mi az a csonka round robin

A klasszikus round robin rendszerben minden játékos minden másik játékossal játszik. Ez kis létszámnál jól működik, de nagyobb mezőnynél nagyon sok mérkőzést jelent.

Például:

- 8 játékos esetén 28 meccs
- 10 játékos esetén 45 meccs
- 12 játékos esetén 66 meccs

Ez egy valódi versenyen sokszor túl nagy terhelés időben és pályakapacitásban, különösen akkor, ha egyszerre több kategória is fut.

A csonka round robin lényege, hogy nem minden lehetséges párosítás kerül lejátszásra, hanem minden játékos egy előre meghatározott számú mérkőzést játszik. A cél nem a teljes körmérkőzés pontosságának lemásolása, hanem az, hogy ésszerű számú meccsből is kialakuljon egy használható sorrend.

Tehát a csonka round robin egy tudatos kompromisszum:

- kevesebb meccs
- gyorsabb lebonyolítás
- kisebb pálya- és időigény
- mégis elég jó alap a továbbjutás vagy rangsorolás meghatározásához

### Miért lehet ez reális megoldás a rendszer céljához

A rendszer célja nem az, hogy egy nagyobb amatőr mezőnyben teljes pontossággal megállapítsa például a 9., 10. vagy 11. helyezést. A cél inkább az, hogy:

- kirajzolódjon az élmezőny
- kialakuljon a továbbjutók köre
- meg lehessen határozni a top 4, top 5 vagy top 6 játékost
- legyen egy fair alap a playoffhoz vagy a következő fordulóhoz

Tehát itt a hangsúly nem a teljes mezőny tökéletes sorrendjén, hanem a **továbbjutók megbízható kiválasztásán** van.

Egy iskolai, amatőr vagy házi verseny esetén sokszor fontosabb, hogy a lebonyolítás időben lemenjen, mint az, hogy mindenki mindenkivel játsszon. Ebben a környezetben a csonka round robin megfelelő kompromisszum, mert már néhány meccsből is láthatóvá válik:

- ki nyer stabilan
- ki teljesít a mezőny elején
- ki alkalmas továbbjutásra
- hogyan alakul a győzelmi arány, a szettkülönbség és a pontkülönbség

### Miben különbözik a svájci rendszertől

Fontos, hogy a csonka round robin **nem azonos a svájci rendszerrel**.

A svájci rendszerben a következő fordulók párosításai mindig az addigi eredmények alapján készülnek. Ezzel szemben ebben a rendszerben a párosítások **előre generálódnak**, tehát nem az egyes fordulók eredményeihez igazodva készülnek újra.

Ezért a jelenlegi megoldás nem Swiss rendszer, hanem egy előre kialakított, részleges round robin.

### Hogyan működik a rendszerben

A backend úgy generál meccseket, hogy:

- ne legyen duplikált párosítás
- a játékosok azonos vagy közel azonos számú meccset kapjanak
- a megadott meccsszám-célhoz igazodjon
- páratlan létszám esetén se legyen önkényes vagy széteső eloszlás

Ez tehát nem véletlenszerű párosítgatás, hanem szabályozott meccsgenerálás.

A rendszer ezzel együtt többféle versenylogikát is támogat:

- csak csoportkör
- csoportkör + playoff
- csak playoff

Ez azért fontos, mert a csonka round robin így nem önmagában áll, hanem egy olyan lebonyolítás része lehet, ahol a csoportkör csak a továbbjutók kiválasztását szolgálja, és a végső helyezéseket már a playoff dönti el.

## Check-in és tényleges indulók kezelése

A rendszer nem csak nevezettekkel dolgozik, hanem kezeli azt is, hogy ténylegesen ki jelent meg.

A check-in folyamat során külön jelölhető, hogy egy játékos valóban jelen van-e. Az ütemezés és a draw lezárása már ezek alapján történik. Ennek előnye, hogy a rendszer nem próbál olyan játékosokkal számolni, akik ugyan neveztek, de a versenyen végül nem jelennek meg.

Ez valós versenyhelyzetben fontos, mert gyakran előfordulnak:

- késések
- távolmaradások
- visszalépések

## Ütemezés és pályabeosztás

A backend kétféle ütemezési logikát kezel.

### 1. Csoportszintű ütemezés

A rendszer képes egy adott csoport vagy meccshalmaz meccseit pályákra és idősávokra elosztani úgy, hogy figyelembe veszi:

- a rendelkezésre álló pályákat
- a meccsek becsült hosszát
- a játékosok minimális pihenőidejét
- a pályaforgatási időt

### 2. Globális, több kategóriás fair ütemezés

A rendszer már képes több kategória meccseit együtt nézni, és a pályákat fair módon elosztani közöttük.

Ez különösen fontos, mert egy valós versenyen gyakran egyszerre több kategória fut, miközben a pályák száma korlátozott.

A globális scheduler jelenlegi első verziója:

- az összes ütemezhető meccset együtt nézi
- nem engedi, hogy egy kategória tartósan lefoglalja az összes pályát
- közben nem hagyja feleslegesen állni a pályákat
- figyeli a játékospihenőt és a pályafoglaltságot
- fair módon próbálja elosztani a kapacitást

Ez még nem matematikailag optimális ütemező, hanem egy egyszerű, kiszámítható és megbízható heurisztika. A jelenlegi cél ennek megfelelően nem a tökéletes optimum, hanem a valós körülmények között is jól működő fair elosztás.

## Eredménykezelés

A rendszer képes normál, szettes eredmények rögzítésére, és kezeli a speciális kimeneteleket is, például:

- walkover
- feladás
- egyéb speciális lezárási helyzetek

Fontos szempont volt, hogy az eredmények szükség esetén utólag javíthatók legyenek, mivel egy versenyen előfordulhat, hogy valaki rosszul mondja be az eredményt, vagy adminisztrációs hiba történik.

A rendszer ezt kontrolláltan engedi:

- a normál befejezett meccs javítható
- az érvénytelenített vagy policy alapján kezelt meccsek nem írhatók át tetszőlegesen

## Csoportállás és tie-break logika

A rendszer automatikusan számolja a csoportállást a meccseredmények alapján.

A tie-break logika már konfigurálható, így kategóriánként beállítható, hogyan kezelje a többfős holtversenyeket.

A jelenlegi logika támogatja például azt, hogy:

- kétfős holtversenynél egymás elleni eredmény számítson
- többfős holtversenynél mini-tabella készüljön
- a mini-tabella után szükség esetén az összes csoportmeccs statisztikái döntsenek

A rendszerben a következő elvek is megjelentek:

- a név szerinti döntés teljesen kikerült
- végső döntetlennél adható közös helyezés
- vagy kézi döntés válhat szükségessé

Ez azért fontos, mert csonka round robin vagy szoros csoportkör esetén könnyen kialakulhatnak bonyolult holtversenyhelyzetek, amelyeket a rendszernek következetesen kell kezelnie.

## Továbbjutás és playoff

A rendszer képes a csoportállás alapján továbbjutókat kijelölni, majd playoff meccseket generálni.

A korábbi egyszerűbb megoldásnál szélesebb támogatás került be:

- csoportból induló playoff
- playoff-only kategória
- döntő
- bronzmeccs

A playoff minden esetben az adott kategórián belül értelmezett. Külön kategóriák között közös playoff ág nem készül.

A rendszer nem feltételezi, hogy minden versenyen lesz playoff. Olyan lebonyolításra is alkalmas, ahol a csoportkör végeredménye alapján hirdetnek helyezést, vagy a legjobb játékosok továbblépnek a következő fordulóba.

## Konfigurálható meccsszabályok

A rendszerben a meccsszabályok nem fixen vannak beégetve, hanem konfigurálhatók.

Beállítható például:

- hány nyert szettig menjen a meccs
- hány pontig tartson egy szett
- mekkora pontkülönbség kelljen a győzelemhez
- hol legyen a pontplafon

Ez azért hasznos, mert különböző korosztályokban, versenyformátumokban vagy gyorsított lebonyolításnál eltérő szabályok lehetnek életszerűek.

A rendszer ezeket nem csak eltárolja, hanem ténylegesen ezek alapján validálja az eredményeket.

## Konfiguráció-ellenőrzés

A backend nem enged be tetszőleges hibás konfigurációt.

Például ellenőrzi:

- a tournament konfigurációját
- a category konfigurációját
- a meccsszabályokat
- a támogatott playoff paramétereket
- a tie-break policy értékeket

A konfigurációs létrehozási folyamat tranzakciós alapon működik, így ha egy összetettebb create/configure művelet során hiba történik, a rendszer rollbacket végez, és nem hagy maga után félkész állapotot.

## Nevezési díj nyilvántartása

A backend már támogatja a nevezési díj adminisztratív nyilvántartását is.

Ez nem online fizetési rendszer, tehát nem banki tranzakciókat kezel, hanem az alábbiakat tudja nyilvántartani:

- van-e nevezési díj
- mennyi az összeg
- ki fizette be
- befizette-e vagy sem
- mi a számlázási név
- mi a számlázási cím
- történt-e csoportos befizetés

A rendszer azt az esetet is kezeli, amikor például egy egyesület egy összegben fizeti be több játékos nevezését.

Ez a funkció kifejezetten adminisztratív célú, nem tényleges pénzkezelési modul.

## Szerepkörök és hivatalos személyek kezelése

A rendszer technikai oldalán továbbra is admin felhasználó van, de a versenylogikában ez a szerep döntnökként vagy versenyszervezőként értelmezhető.

Emellett a mérkőzésekhez külön játékvezető is hozzárendelhető. Ez azt jelenti, hogy a rendszer már kezeli:

- a verseny adminisztrátori / döntnöki működtetését
- a meccsszintű játékvezető hozzárendelést

Adogatásbírót és vonalbírót a rendszer jelenleg nem kezel külön, mert amatőr környezetben ezek jellemzően nem jelennek meg.

## Műveleti naplózás

A rendszer kiegészült célzott műveleti naplózással is. Ez nem teljes körű, minden lekérést rögzítő auditmechanizmus, hanem egy olyan karcsú eseménynapló, amely a fontos versenyállapot-változásokat tárolja.

A naplózás célja elsősorban nem a többadminos elszámoltathatóság, hanem az, hogy egy verseny közben vagy utólag visszakövethető legyen, milyen lényeges műveletek történtek a rendszerben.

A naplózott események közé tartozhat például:

- verseny létrehozása
- kategória létrehozása vagy módosítása
- játékosok tömeges felvétele
- check-in állapot változása
- draw finalizálása
- ütemezés futtatása
- meccseredmény rögzítése vagy javítása
- visszalépés kezelése
- playoff generálása

A rendszer tehát nemcsak végrehajtja a fontos műveleteket, hanem azok történetét is visszakövethetővé teszi.

## CSV export

A backend több fontos adatállomány exportját is támogatja CSV formátumban. Ez azért hasznos, mert az adatok könnyen megnyithatók táblázatkezelőben, archiválhatók, továbbküldhetők, vagy más adminisztratív feldolgozásra is használhatók.

Jelenleg támogatott például:

- meccslista export
- játékos- és check-in lista export
- csoportállás export

A meccslista export tartalmazhatja többek között a kategóriát, a csoportot, a játékosokat, a státuszt, a pályát, az időpontot és az eredményt. A játékoslista export alkalmas a jelenléti és check-in információk áttekintésére. A standings export pedig a csoporton belüli sorrendet és a számolt mutatókat is ki tudja adni.

Ez a funkció elsősorban gyakorlati adminisztratív célokat szolgál, nem új lebonyolítási logikát vezet be, hanem a rendszer használhatóságát növeli.

## Kijelzős / TV-s nézet backend alapja

A backend már tartalmaz egy olyan végpontot is, amely egy későbbi kijelzős vagy TV-s nézetet tud kiszolgálni.

Ez lehetővé teszi, hogy egy külön felületen megjelenjenek:

- az éppen futó mérkőzések
- a következőként tervezett mérkőzések

Ez a funkció elsősorban azt a gyakorlati problémát kezeli, hogy a játékosok folyamatosan érdeklődnek, mikor és hol játszanak.

## Tesztelés

A backend működésének ellenőrzésére automatizált smoke tesztek készültek, amelyek a fő üzleti folyamatokat végigfuttatják.

Jelenleg lefedett területek:

- round robin invariánsok
- regisztráció, login és ownership
- meccsgenerálás és alap ütemezés
- check-in és draw lezárás
- withdrawal kezelés
- standings és tie-break
- playoff generálás
- playoff-only kategória
- nagyobb playoff méretek
- bronzmeccs generálás
- globális scheduler
- match rules
- konfigurációvalidáció
- nevezési díj nyilvántartás
- játékvezető hozzárendelés
- board endpoint
- műveleti naplózás
- CSV export

A teljes tesztcsomag jelenleg hibamentesen lefut.

## Jelenlegi állapot röviden

A backend jelenlegi állapotában már nem prototípus-szintű váz, hanem működő, felhasználóhoz kötött versenykezelő mag.

Rendelkezik:

- felhasználói azonosítással
- tulajdonolt versenyekkel
- csoportkörös és csonka round robin logikával
- fair globális pályaelosztással
- eredmény- és standings kezeléssel
- konfigurálható tie-break logikával
- továbbjutás- és playoff logikával
- bronzmeccs kezeléssel
- konfigurálható meccsszabályokkal
- nevezési díj nyilvántartással
- döntnök / játékvezető logikával
- célzott műveleti naplózással
- CSV exporttal
- board backend alappal
- automatizált tesztekkel

## Amiben kérném a véleményt

A technikai megvalósítás jelenleg jó állapotban van, ezért most elsősorban szakmai és gyakorlati visszajelzés lenne hasznos az alábbi kérdésekben:

1. A csonka round robin ebben a formában mennyire reális és vállalható versenyhelyzetben?
2. A csoportállás és a konfigurálható tie-break logika mennyire tekinthető fairnek sportszakmai szempontból?
3. A több kategóriás, fair pályaelosztás ilyen egyszerűbb verziója mennyire lenne használható a gyakorlatban?
4. A nevezési díj adminisztratív nyilvántartása mennyire lenne hasznos valós szervezési helyzetben?
5. A döntnök / játékvezető szerepkör ilyen egyszerűsített kezelése megfelelő-e amatőr versenyhelyzetben?
6. A kijelzős nézet backend alapja mennyire tűnik hasznos iránynak a gyakorlati lebonyolítás támogatására?
7. Kellene-e még olyan backend funkció, amely versenyszervezési szempontból alapvető, de jelenleg hiányzik?
8. Inkább a jelenlegi működés finomítása lenne hasznosabb, vagy van még olyan lebonyolítási logika, amit érdemes lenne beépíteni?
