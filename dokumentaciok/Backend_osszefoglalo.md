# Összefoglaló a tollaslabda versenykezelő rendszer backendjéről

A rendszer jelenlegi állapotában a backend már működőképes, és az alapvető üzleti logikák automatizált tesztekkel is ellenőrizve lettek. A korábbi versenykezelési funkciók mellett bekerült egy célzott műveleti naplózás és többféle CSV export is.

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
- csoportállás számítása tie-break szabályokkal
- továbbjutók kiválasztása
- playoff ág generálása kategórián belül, a csoportkör folytatásaként
- konfigurálható meccsszabályok kezelése
- hibás konfigurációk kiszűrése
- fontos műveletek naplózása műveleti napló formájában
- adatok exportálása CSV formátumban

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

Ez egy valódi versenyen sokszor túl nagy terhelés időben és pályakapacitásban.

A csonka round robin lényege, hogy nem minden lehetséges párosítás kerül lejátszásra, hanem minden játékos egy előre meghatározott számú mérkőzést játszik. A cél nem a teljes körmérkőzés pontosságának lemásolása, hanem az, hogy ésszerű számú meccsből is kialakuljon egy használható rangsor.

Tehát a csonka round robin egy kompromisszum:

- kevesebb meccs
- gyorsabb lebonyolítás
- kisebb terhelés
- mégis elég jó alap a továbbjutás vagy rangsorolás meghatározásához

### Miért adhat reális képet kevesebb meccs is

A rendszer célja ilyenkor nem az, hogy minden pozíció abszolút pontossággal eldőljön, hanem az, hogy:

- kirajzolódjon az élmezőny
- kialakuljon a továbbjutók köre
- legyen egy fair alap a playoffhoz vagy a következő fordulóhoz

Ha minden játékos 4–5 meccset játszik, abból már általában látható:

- ki nyer stabilan
- ki tartozik a középmezőnyhöz
- ki marad el a többiektől
- milyen a szett- és pontkülönbsége

Ehhez a rendszer további rangsorolási szabályokat is alkalmaz, tehát nem csak a győzelmek száma számít.

### A csonka round robin a rendszerben

A backend úgy generál meccseket, hogy:

- ne legyen duplikált párosítás
- a játékosok közel azonos számú meccset kapjanak
- a megadott meccsszám-célhoz igazodjon
- páratlan létszám esetén se legyen igazságtalan eloszlás

Ez tehát nem véletlenszerű párosítgatás, hanem szabályozott meccsgenerálás.

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

A rendszer már képes több kategória group meccseit együtt nézni, és a pályákat fair módon elosztani közöttük.

Ez különösen fontos, mert egy valós versenyen gyakran egyszerre több kategória fut, miközben a pályák száma korlátozott. Magyarországi csarnokviszonyok alapján 9 pálya reális felső határként lett kezelve.

A globális scheduler jelenlegi első verziója:

- az összes ütemezhető group meccset együtt nézi
- nem engedi, hogy egy kategória tartósan lefoglalja az összes pályát
- közben nem hagyja feleslegesen állni a pályákat
- figyeli a játékospihenőt és a pályafoglaltságot
- fair módon próbálja elosztani a kapacitást

Ez még nem matematikailag optimális ütemező, hanem egy egyszerű, kiszámítható és megbízható heurisztika. A jelenlegi cél ennek megfelelően nem a tökéletes optimum, hanem a valós körülmények között is jól működő fair elosztás.

## Eredménykezelés

A rendszer képes normál, szettes eredmények rögzítésére, és kezeli a speciális kimeneteleket is, például:

- wo
- feladás
- egyéb speciális lezárási helyzetek

Fontos szempont volt, hogy az eredmények szükség esetén utólag javíthatók legyenek, mivel egy versenyen előfordulhat, hogy valaki rosszul mondja be az eredményt, vagy adminisztrációs hiba történik.

A rendszer ezt kontrolláltan engedi:

- a normál befejezett meccs javítható
- az érvénytelenített meccsek viszont nem írhatók át tetszőlegesen

## Csoportállás és tie-break logika

A rendszer automatikusan számolja a csoportállást a meccseredmények alapján.

Holtverseny esetén több szintű logikát használ:

- kétfős holtversenynél egymás elleni eredmény
- többfős holtversenynél mini-tabella
- ezen belül szükség esetén:
  - szettkülönbség
  - pontkülönbség
  - determinisztikus fallback

Ez azért fontos, mert csonka round robin vagy szoros csoportkör esetén könnyen kialakulhatnak bonyolult holtversenyhelyzetek, amelyeket a rendszernek következetesen kell kezelnie.

A determinisztikus fallback lényege, hogy ha a korábbi tie-break szintek sem döntenek, akkor a rendszer mindig ugyanabból az állapotból ugyanazt a sorrendet állítja elő. Ez azért fontos, mert így nincs véletlenszerű vagy adminisztrátori megérzésen alapuló sorrendalkotás, hanem a rendezés reprodukálható és következetes marad.

## Továbbjutás és playoff

A rendszer képes a csoportállás alapján továbbjutókat kijelölni, majd playoff meccseket generálni.

Jelenleg például támogatott:

- 2 továbbjutó esetén közvetlen döntő
- 4 továbbjutó esetén elődöntők és döntő

A párosítások a helyezések alapján jönnek létre, például:

- 1. helyezett a 4. helyezett ellen
- 2. helyezett a 3. helyezett ellen

A playoff minden esetben az adott kategórián belül értelmezett, a kategória csoportkörének folytatása. Külön kategóriák között közös playoff ág nem készül.

Ugyanakkor a rendszer nem feltételezi, hogy minden versenyen lesz playoff. Olyan lebonyolításra is alkalmas, ahol a csoportkör végeredménye alapján hirdetnek helyezést, vagy a legjobb játékosok továbblépnek a következő fordulóba.

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

A konfigurációs létrehozási folyamat tranzakciós alapon működik, így ha egy összetettebb create/configure művelet során hiba történik, a rendszer rollbacket végez, és nem hagy maga után félkész állapotot.

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

Ez a funkció elsősorban gyakorlati adminisztrációs célokat szolgál, nem új lebonyolítási logikát vezet be, hanem a rendszer használhatóságát növeli.

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
- globális scheduler
- match rules
- konfigurációvalidáció
- műveleti naplózás
- CSV export

A teljes tesztcsomag jelenleg hibamentesen lefut, beleértve az audit és a CSV export funkciók külön smoke tesztjeit is.

## Jelenlegi állapot röviden

A backend jelenlegi állapotában már nem prototípus-szintű váz, hanem működő, felhasználóhoz kötött versenykezelő mag.

Rendelkezik:

- felhasználói azonosítással
- tulajdonolt versenyekkel
- csoportkörös és csonka round robin logikával
- fair globális pályaelosztással
- eredmény- és standings kezeléssel
- továbbjutás- és playoff logikával
- konfigurálható meccsszabályokkal
- célzott műveleti naplózással
- CSV exporttal
- automatizált tesztekkel

## Amiben kérném a véleményt

A technikai megvalósítás jelenleg jó állapotban van, ezért most elsősorban szakmai és gyakorlati visszajelzés lenne hasznos az alábbi kérdésekben:

1. A csonka round robin ebben a formában mennyire reális és vállalható versenyhelyzetben?
2. A csoportállás és tie-break logika mennyire tekinthető fairnek sportszakmai szempontból?
3. A több kategóriás, fair pályaelosztás ilyen egyszerűbb verziója mennyire lenne használható a gyakorlatban?
4. A jelenlegi műveleti naplózás és CSV export mennyire tekinthető hasznos, valós szervezési támogatásnak?
5. Kellene-e még olyan backend funkció, amely versenyszervezési szempontból alapvető, de jelenleg hiányzik?
6. Inkább a jelenlegi működés finomítása lenne hasznosabb, vagy van még olyan lebonyolítási logika, amit érdemes lenne beépíteni?
