# 0. Formai és szerkezeti illesztési jegyzetek

Ez a fájl a szakdolgozat **3–7. fejezetének munkavázlata**. A végleges beadandó dokumentumban a teljes dolgozatot az SZTE Informatikai Intézet formai követelményei szerint kell összeállítani. A hivatalos előírások alapján a végleges dokumentumnak kötelezően tartalmaznia kell a címoldalt, a feladatkiírást, a tartalmi összefoglalót, a tartalomjegyzéket, az érdemi részt, az irodalomjegyzéket és a nyilatkozatot; az alapszakos dolgozat ajánlott terjedelme mellékletek nélkül 25–50 oldal, a címsorok legnagyobb mélysége 3 lehet, a fő szöveg pedig Times New Roman betűtípussal, 12 pt méretben, 1,5 sortávolsággal és sorkizárt igazítással készítendő. Az ábrákat fejezetenként kell számozni, a szövegben minden ábrára hivatkozni kell, a hivatkozásokat pedig szögletes zárójelben sorszámozott irodalomjegyzékre kell visszavezetni.

## 0.1 Beépítési javaslat a végleges dolgozatba

A végleges dokumentumban a jelen fájl anyaga a következő szerkezetben használható fel:

- **Címoldal** – külön oldal, az egyetemi mintának megfelelően.
- **Feladatkiírás** – külön oldal, a témavezető hivatalos szövegével.
- **Tartalmi összefoglaló** – legfeljebb egy oldal, külön részben.
- **Tartalomjegyzék** – a végleges Word dokumentumból generálva.
- **Érdemi rész** – a jelen fájl 3–7. fejezeteinek átdolgozott változata.
- **Irodalomjegyzék** – sorszámozott, visszakereshető formában.
- **Nyilatkozat** – az egyetemi mintaszöveg alapján.
- **Mellékletek / elektronikus melléklet** – forráskód, nagyobb ábrák, tesztlogok, képernyőképek.

## 0.2 Szerkesztési megjegyzések ehhez a vázlathoz

- A jelen frissített változat már legfeljebb 3 címszintet használ.
- A szöveg a **jelenlegi kódbázis** állapotához igazodik: külön backend és frontend projekt, saját kliensoldali router, központi API-réteg, auditnaplózás, CSV export, demo seed, fizetési csoport szinkron, lezárt verseny eredményjavítási feloldása, valamint meccsindítási ütközésvédelmek.
- A végleges Word-változatban az itt szereplő „Javasolt ábrahely” megjegyzéseket tényleges ábrákkal és hivatkozásokkal kell kiváltani.

# 1. A probléma és a szakmai háttér

A tollaslabda versenyek szervezése első ránézésre egyszerű feladatnak tűnhet: össze kell gyűjteni a résztvevőket, meccseket kell lejátszani, és ki kell hirdetni az eredményeket. A gyakorlatban azonban egy közepes méretű verseny is – néhány kategóriával, párhuzamos pályákkal és több tucat játékossal – meglehetősen összetett adminisztrációs feladatot jelent. Ez a fejezet bemutatja, hogy a tollaslabda versenyek lebonyolítása milyen sajátos kihívásokat támaszt, és ezek hogyan indokolják egy szoftveres megoldás fejlesztését.

## 1.1 A tollaslabda versenyek lebonyolításának sajátosságai

A tollaslabda mint versenyrendszer számos olyan jellegzetességgel rendelkezik, amelyek az informatikai megoldás tervezése szempontjából is lényegesek.

Egy verseny jellemzően több **kategóriára** tagolódik. A kategóriák nemek, korosztályok vagy tudásszint szerint különülhetnek el – például felnőtt férfi egyes, vegyes páros, serdülő leány egyes. Minden kategória önálló lebonyolítással rendelkezik: saját játékoslistával, saját sorsolással, saját mérkőzésekkel és saját eredménytáblával.

A mérkőzések lebonyolítása **szettekre bontott** eredményrendszer alapján történik. A győzelmet pontok és szetteredmények együttesen határozzák meg, amelyek érvényességéhez a tollaslabda szabályai szerint meghatározott feltételeknek kell teljesülni. Ez azt jelenti, hogy nem elegendő pusztán a nyers számokat rögzíteni – az eredmény rögzítéséhez szükség van a sportági szabályrendszer ismeretére is.

Az **ütemezés** szintén sajátos kihívást jelent. Több kategória mérkőzéseit párhuzamosan, korlátozott számú pályán kell lejátszani. Egy-egy játékos egyszerre csak egy meccsen vehet részt, és a meccsek között minimális pihenőidőre is szükség van. A szervező feladata ezeket a feltételeket manuálisan összehangolni, ami nagyobb versenyeken komoly adminisztrációs terhet jelent.

Végül a **helyszíni és operatív tényezők** is szerepet játszanak: késő megérkezés, visszalépés, sérülés közben, gyógyulás utáni újraindulás – ezek mind előfordulnak valós versenyen, és mindegyik kezelhető szituáció kell hogy legyen egy versenymenedzsment rendszerben.

## 1.2 Csoportkörös és egyenes kieséses rendszerek

A tollaslabda versenyeken a leggyakrabban alkalmazott két lebonyolítási forma a **csoportkörös** (round robin) és az **egyenes kieséses** (playoff, bracket) rendszer, amelyeket sok versenyen kombinálva alkalmaznak.

A csoportkörös szakaszban a játékosokat kisebb csoportokba osztják, és minden játékos mindenki mással meccsezik a csoporton belül. Az eredmény alapján tabella készül: a győzelmek száma, szett- és pontkülönbség alapján rangsort állítanak fel. A csoportok legjobbjait – jellemzően az első kettőt vagy négyest – továbbjuttatják a playoff szakaszba.

Ha a mezőny nagy, a teljes körmérkőzés helyett **részleges round robin** alkalmazható: ebben az esetben mindenki csak meghatározott számú meccset játszik, nem pedig az összeset. Ez csökkenti a meccsszámot, de egyúttal bonyolultabb párosítási logikát igényel, mivel gondoskodni kell arról, hogy a terhelés közel egyenletes maradjon.

Az egyenes kieséses szakaszban a továbbjutók egymás ellen mérkőznek, és a vesztes kiesik. A hagyományos bracket struktúra elődöntőkből, döntőből és bronzmérkőzésből áll. A párosítások általában **seedelt** alapon történnek, hogy a legerősebb játékosok a lehető legkésőbb találkozzanak egymással.

A lebonyolítási forma megválasztása befolyásolja az adminisztrációt is: a csoportkörös szak sokkal több mérkőzést és pontosabb tabellaszámítást igényel, míg az egyenes kiesés egyszerűbb struktúrát, de szigorúbb progressziókezelést követel meg.

A holtversenyek kérdése mindkét esetben megjelenik. Ha a csoportkör végén több játékosnak azonos a pontszáma, a rendszernek egyértelmű szabályok szerint kell sorba rendezni őket. A tollaslabdában ehhez általában az egymás elleni eredményt, majd a szett- és pontkülönbséget veszik figyelembe. Ezek az **tie-break** szabályok bonyolult döntési logikát igényelnek, amelyet szoftveresen szükséges megvalósítani.

## 1.3 A versenyszervezés gyakorlati problémái

A kisebb, amatőr szintű versenyek szervezői – egyesületek, helyi sportszövetségek, lelkes önkéntesek – jellemzően nem rendelkeznek dedikált versenymenedzsment szoftverrel. A szervezés tipikusan papíralapú nyilvántartással vagy táblázatkezelő alkalmazásokkal történik.

Ezek a megoldások több szempontból is korlátozottak. A **táblázatkezelők** – például Microsoft Excel vagy Google Sheets – jók adatok tárolására, de a párosítások automatikus generálása, a standings kiszámítása és a meccsállapotok kezelése sok manuális munkát igényel. Könnyen keletkeznek hibák, és az adatok konzisztenciájának megőrzése nehézkes.

A **manuális szervezés** hátránya főként nagy mezőny esetén szembetűnő. Ha egyszerre több pályán játszanak, és több kategória párhuzamosan zajlik, a szervező könnyen elveszíti az áttekintést: melyik pályán van valaki, mikor játszik legközelebb, ki jutott tovább a csoportból. Ezek az információk kézi rendszerben szétszórtan vannak jelen, és egybegyűjtésük rengeteg időt vesz el.

Az **eredmények visszakereshetősége** is problémás lehet utólag: papíralapú nyilvántartásnál nehéz például megállapítani, hogy egy hétre korábbi döntő pontszáma mi volt, vagy hogy ki kapta a második helyezést egy adott kategóriában.

A fentiek alapján indokolt egy olyan webalapú alkalmazás fejlesztése, amely egységes felületen kezeli a verseny teljes adminisztrációját: a nevezésektől a végeredményig. Az ilyen rendszer nem váltja ki a szervező döntési szerepét, de elvégzi helyette a monoton, hibalehetőségekkel teli számítási és nyilvántartási feladatokat.

---

# 2. Technológiai háttér és választott eszközök

A rendszer fejlesztéséhez szükséges technológiai döntések nem önkényesen születtek. Ez a fejezet bemutatja a webalapú alkalmazások általános felépítésének szempontjait, a MERN-stack mint választott technológiai megközelítés indokait, és az egyes komponensek szerepét a végső rendszerben.

## 2.1 Webalkalmazások általános felépítése

A modern webalkalmazások túlnyomó többsége **kliens–szerver architektúrára** épül. A szerver az adatokat tárolja és az üzleti logikát futtatja, a kliens (böngésző) a felhasználói felületet jeleníti meg. A két rész kommunikációja hálózaton keresztül zajlik, leggyakrabban HTTP protokollon.

A szerver oldal hagyományosan tartalmaz egy **alkalmazáslogikai réteget** (backend), amely feldolgozza a kéréseket, és egy **adatbázist**, amely az adatokat tartósan tárolja. A kliens oldal **frontend** rétege felelős a megjelenítésért és a felhasználói interakciók kezeléséért.

A kommunikáció szabványosítására ma a **REST** (Representational State Transfer) szemléletű API-tervezés terjedt el. Ebben a megközelítésben az erőforrások (például verseny, kategória, mérkőzés) egyedi URL-ekkel azonosíthatók, a műveletek (létrehozás, lekérdezés, módosítás, törlés) a HTTP metódusokhoz (POST, GET, PATCH, DELETE) rendelhetők, az adatok pedig jellemzően JSON formátumban cserélnek gazdát.

A webalkalmazások **egyoldalas alkalmazás** (SPA – Single Page Application) megközelítése esetén a böngésző egyszer tölt le egy teljes JavaScript alkalmazást, amely aztán dinamikusan frissíti a megjelenített tartalmat anélkül, hogy az egész oldalt újra kellene tölteni. Ez gyorsabb és gördülékenyebb felhasználói élményt biztosít, különösen adminisztratív jellegű rendszereknél.

## 2.2 A MERN-alapú megközelítés

A MERN-stack négy technológia betűszavát takarja: **MongoDB**, **Express**, **React**, **Node.js**. Ezek együttesen teljes JavaScript-alapú fejlesztési közeget alkotnak, amelyben a frontend és a backend is egyazon programozási nyelven írható.

A **Node.js** egy JavaScript futtatókörnyezet, amely lehetővé teszi, hogy JavaScript kódot ne csak a böngészőben, hanem szerveroldalon is futtassunk. Ez egységesíti a fejlesztési környezetet, és lehetővé teszi, hogy a frontend és a backend közötti kódrészletek – például validációs logikák vagy típusdefiníciók – újrafelhasználhatók legyenek.

Az **Express** egy minimalistam, Node.js-alapú webalkalmazás-keretrendszer. Segítségével gyorsan felépíthetők REST-szemléletű API-végpontok, definiálható a middleware-lánc, és jól strukturálható a backend kódbázis. Az Express szándékosan nem írja elő a teljes alkalmazásstruktúrát, így a fejlesztőnek lehetősége van saját logikai szétválasztást alkalmazni.

A **MongoDB** egy dokumentumorientált, NoSQL adatbázis. Az adatokat rugalmas, JSON-szerű dokumentumokban tárolja, amelyek sémája nem rögzített előre. Ez különösen előnyös olyan domain esetén, ahol az egyes objektumok – mint például egy verseny konfigurációja vagy egy mérkőzés szettjei – rugalmasabb, beágyazott struktúrát igényelnek, mint amit egy hagyományos relációs adatbázistábla kényelmesen kezelne. A MongoDB-hez való hozzáférés a **Mongoose** könyvtáron keresztül történik, amely sémadefiníciókat, validációt és kényelmes lekérdezési módszereket biztosít.

A **React** egy deklaratív, komponensalapú JavaScript könyvtár a felhasználói felületek felépítésére. A fejlesztőnek nem az egyes DOM-műveletek sorrendját kell megadnia, hanem azt írja le, hogy az aktuális adatok alapján hogyan nézzen ki a felület – a React gondoskodik az optimális frissítésekről. A komponensalapú megközelítés elősegíti az újrafelhasználhatóságot és az egységes megjelenést.

A jelen projekthez a React-alkalmazás fejlesztői szervere és buildeszköze a **Vite**, amely gyors indítási időjével és hatékony hot module replacement megoldásával javítja a fejlesztési élményt.

## 2.3 A választott technológiák szerepe a rendszerben

A technológiai stack megválasztásánál több szempont is érvényesült.

Az **egységes programozási nyelv** (JavaScript, illetve TypeScript-kompatibilis kód mindkét oldalon) csökkentette a kontextusváltás kognitív terhelését a fejlesztés során, és lehetővé tette, hogy bizonyos adatstruktúrák és szabályok könnyen átvihetők legyenek frontend és backend között.

A **MongoDB** választása a domain sajátosságaiból fakad. A versenykezelés során számos olyan adatstruktúra fordul elő, amelynek rugalmas belső felépítése van: ilyen például a verseny konfigurációs blokkja, a kategória check-in beállításai, vagy a mérkőzések szetteredményeit tartalmazó tömb. Ezek dokumentumorientált tárolása természetesebb annál, mint amit egy szigorú relációs sémával lehetne elérni.

Az **Express** és a **Node.js** kombinációja jól bevált megközelítés REST API-k fejlesztéséhez. A middleware-alapú architektúra egyszerűen kezelhetővé teszi az autentikáció, a validáció és a logging egységesítését, a moduláris routerstruktúra pedig jól illeszkedik a versenykezelő rendszer erőforrás-alapú felosztásához.

A **React** és a **Vite** kombinációja gyors, komponensalapú frontendfejlesztést tesz lehetővé. Az adminisztrációs felület jellegéből adódóan sok az állapotfüggő nézet, amelyeket a React-komponensek jól kezelnek, a Vite pedig gyors fejlesztési ciklust biztosít.

A **JWT** (JSON Web Token) alapú hitelesítés választása a rendszer egyszerűbb telepíthetőségét és a session-kezelés állapotmentességét biztosítja. A kliens a tokent a böngésző helyi tárolójában őrzi, és minden védett kérésnél elküldi azt a szervernek. Ez a megoldás jól illeszkedik egy API-alapú, kliens–szerver szétválasztott rendszerhez.

Az irodalomjegyzékben hivatkozott technológiák hivatalos dokumentációi [1–7] részletes technikai leírást tartalmaznak. A jelen fejezet célja csupán az volt, hogy megindokolja a technológiai döntéseket a rendszer kontextusában.

# 3. Követelményspecifikáció

A fejlesztett rendszer célja egy olyan webalapú tollaslabda versenykezelő alkalmazás létrehozása, amely támogatja a versenyek adminisztratív előkészítését, a lebonyolítás során szükséges operatív feladatokat, valamint az eredmények és állapotok követését. A rendszer elsődleges felhasználója a versenyszervező vagy döntnök, aki egyetlen felületen keresztül tudja kezelni a versenyhez tartozó kategóriákat, játékosokat, mérkőzéseket, állásokat és kiegészítő adminisztratív adatokat.

A követelmények meghatározásakor fontos szempont volt, hogy a rendszer ne általános sportmenedzsment eszköz legyen, hanem kifejezetten tollaslabda versenyek lebonyolítását támogassa. Ennek megfelelően a specifikáció hangsúlyosan kezeli a csoportkörös és egyenes kieséses lebonyolítást, a szettekre bontott eredményrögzítést, a holtversenyek feloldását, a továbbjutás logikáját, valamint a gyakorlati versenyszervezésben előforduló állapotokat, például a check-int, a visszalépést vagy az utólagos eredménykorrekciót.

## 3.1 Funkcionális követelmények

### FR-01 Felhasználói azonosítás és hozzáférés-kezelés

A rendszernek biztosítania kell a felhasználók regisztrációját, bejelentkezését és hitelesített munkamenet-kezelését. A versenyadatok tulajdonoshoz kötöttek, ezért minden felhasználó kizárólag a saját versenyeit és a hozzájuk tartozó adatokat érheti el.

A rendszernek támogatnia kell:
- új felhasználó regisztrációját e-mail címmel és jelszóval,
- bejelentkezést meglévő fiókkal,
- kijelentkezést,
- profilhoz kapcsolódó alapműveleteket, beleértve a jelszó módosítását,
- jogosultsági ellenőrzést minden olyan műveletnél, amely verseny-, kategória- vagy mérkőzésadatot érint.

A követelmény célja, hogy a rendszer több felhasználó számára is alkalmas legyen, miközben az egyes versenyek adatai elkülönülnek egymástól.

### FR-02 Verseny létrehozása és kezelése

A rendszernek lehetővé kell tennie új versenyek létrehozását, meglévő versenyek listázását, megtekintését és módosítását. Egy verseny a teljes lebonyolítás legfelső szervezési egysége, ezért a hozzá kapcsolódó globális erőforrásokat és alapbeállításokat ezen a szinten kell rögzíteni.

A versenyhez legalább az alábbi adatoknak megadhatóknak kell lenniük:
- verseny neve,
- dátuma,
- helyszíne,
- állapota,
- pályák száma,
- becsült mérkőzésidő,
- minimális játékospihenő,
- minimális bírói pihenő,
- pályaforgatási idő,
- alapértelmezett check-in időablak,
- nevezési díj használata és összege,
- mérkőzésszabályok,
- a versenyhez tartozó hivatalos személyek vagy játékvezetők listája.

A rendszernek biztosítania kell, hogy a versenyek külön-külön konfigurálhatók legyenek, mivel a különböző események eltérő lebonyolítási körülményeket igényelhetnek.

### FR-03 Kategóriák létrehozása és konfigurálása

A rendszernek támogatnia kell, hogy egy versenyen belül több kategória is létrehozható legyen. Egy kategória önálló lebonyolítási logikával és állapotkezeléssel rendelkezik.

A kategóriákhoz megadhatónak kell lennie legalább:
- a kategória nevének,
- a nemnek vagy nemi besorolásnak,
- a korosztálynak,
- a lebonyolítás formátumának,
- a csoportok számának,
- a csoportlétszám-célértéknek,
- a továbbjutók számának,
- a playoff méretének,
- a csoportkörös mérkőzésszám paramétereinek,
- a tie-break szabályoknak,
- a kategória állapotának.

A rendszernek támogatnia kell legalább az alábbi formátumokat:
- csak csoportkör,
- csoportkör + playoff,
- kizárólag playoff.

A kategóriák állapotkezelése azért szükséges, mert a lebonyolítás nem egyszeri művelet, hanem több, egymásra épülő fázisból áll.

### FR-04 Játékosok és nevezések kezelése

A rendszernek biztosítania kell a játékosok rögzítését és adminisztratív kezelését. A játékoskezelésnek nem csupán névlista-szinten kell működnie, hanem támogatnia kell a nevezéshez kapcsolódó kiegészítő adatokat is.

A rendszernek lehetővé kell tennie:
- játékos egyenkénti felvételét,
- több játékos tömeges felvételét,
- játékos adatainak módosítását,
- játékos törlését,
- klubnév, megjegyzés és egyéb adminisztratív mezők rögzítését,
- a játékos kategóriához rendelését,
- nevezési információk tárolását.

A nevezésekhez kapcsolódóan kezelhetőnek kell lennie:
- nevezési díj összege,
- fizetett vagy nem fizetett állapot,
- fizetési mód,
- számlázási név,
- számlázási cím,
- payment group hozzárendelés.
  
A jelenlegi megvalósításban a fizetési mód külön adminisztratív mezőként jelenik meg. A rendszer képes megkülönböztetni például a készpénzes, átutalásos, bankkártyás, egyéb vagy még nem ismert fizetési módot. Ez nem számlázóprogram-funkciót jelent, hanem a helyszíni versenyszervezés pénzügyi nyilvántartását segíti.
Ez a követelmény azért fontos, mert a valós versenyszervezésben a játékoslista és a nevezési adminisztráció szorosan összekapcsolódik.

A jelenlegi megvalósítás alapján a nevezési adminisztráció része a fizetési csoportok kezelése is. A rendszernek támogatnia kell, hogy több nevezés egy közös fizetési csoporthoz tartozzon, és a fizetési csoport befizetettre állítása a kapcsolódó nevezések fizetési állapotát is szinkronban frissítse. Ez különösen klubos vagy egyesületi befizetések esetén hasznos.

### FR-05 Check-in és sorsoláslezárás

A rendszernek támogatnia kell a check-in folyamatot, vagyis annak adminisztrálását, hogy a benevezett játékosok közül kik jelentek meg ténylegesen a versenyen. A check-in a sorsolás szempontjából kritikus lépés, mivel a tényleges indulói létszám csak ennek lezárása után tekinthető véglegesnek.

A rendszernek biztosítania kell:
- a megjelent játékosok megjelölését,
- a nem megjelent játékosok elkülönítését,
- a check-in állapot nyilvántartását,
- a draw lezárásának lehetőségét,
- annak biztosítását, hogy a lebonyolítás a ténylegesen részt vevő mezőny alapján történjen.

A rendszernek úgy kell működnie, hogy a sorsolás csak addig legyen újragenerálható, amíg a lebonyolítás nem kezdődött meg.

### FR-06 Csoportkörös mérkőzések generálása

A rendszernek támogatnia kell a csoportkörös lebonyolítást. Kisebb létszám esetén teljes round robin, nagyobb mezőny esetén csonka round robin is alkalmazható.

A rendszernek képesnek kell lennie:
- csoportok létrehozására,
- a csoportokhoz tartozó játékosok kezelésére,
- round robin párosítás generálására,
- szükség esetén nem teljes körmérkőzéses, hanem korlátozott mérkőzésszámú csoportkör kezelésére,
- duplikált párosítások elkerülésére,
- saját maga ellen játszó játékos kizárására,
- arányos mérkőzésszám biztosítására a mezőnyön belül.

A követelmény célja, hogy a rendszer ne csak elméleti, hanem gyakorlati versenyhelyzetben is használható legyen, ahol az idő és a pályakapacitás korlátozott.

### FR-07 Mérkőzések ütemezése

A rendszernek biztosítania kell, hogy a generált mérkőzések pályákhoz és időpontokhoz rendelhetők legyenek. Az ütemezésnek figyelembe kell vennie a versenyszintű erőforrásokat és a pihenőidőket.

A rendszernek támogatnia kell:
- mérkőzések időponthoz rendelését,
- pályaszám hozzárendelését,
- becsült kezdési és befejezési idő kiszámítását,
- játékospihenő figyelembevételét,
- pályaforgatási idő figyelembevételét,
- több kategória közös pályahasználatának kezelését,
- a pending mérkőzések ütemezését,
- játékvezetők automatikus rotációját,
- a még le nem játszott mérkőzések becsült kezdési idejének újraszámítását a tényleges mérkőzésállapotok alapján.

A rendszer ütemezési logikájának célja nem matematikailag optimális globális optimum keresése, hanem olyan gyakorlati megoldás biztosítása, amely életszerű környezetben stabilan használható.

A jelenlegi rendszerben az ütemezés kiegészült játékvezetői rotációval is. Ha a versenyhez meg vannak adva játékvezetők, akkor a globális ütemezés képes a mérkőzésekhez automatikusan játékvezetőt rendelni. A kiválasztás figyelembe veszi a minimális játékvezetői pihenőidőt és az egyenletes terhelés elvét.
A rendszer ezen felül támogatja a hátralévő mérkőzések becsült kezdési idejének dinamikus újraszámítását. Ez nem folyamatos háttérfolyamatként működik, hanem adminisztrátori műveletként indítható. A cél az, hogy a futó és már befejezett mérkőzések tényleges időadatai alapján a szervező frissíteni tudja a még várakozó mérkőzések becsült kezdését.

### FR-08 Mérkőzések állapotkezelése és eredményrögzítése

A rendszernek támogatnia kell a mérkőzések teljes életciklusának kezelését a létrehozástól a lezárásig.

A mérkőzésekhez legalább az alábbi állapotoknak kell kezelhetőknek lenniük:
- pending,
- running,
- finished.

A rendszernek lehetővé kell tennie:
- mérkőzés indítását,
- mérkőzés lezárását,
- szettekre bontott eredmény rögzítését,
- győztes meghatározását,
- időbélyegek tárolását,
- szükség esetén eredményjavítást,
- speciális kimenetek, például visszalépés vagy érvénytelenítés kezelését.

A követelmény azért kiemelten fontos, mert a teljes további logika – állásszámítás, továbbjutás, playoff – a mérkőzéseredményekre épül.

A jelenlegi rendszerben a mérkőzésindításnak további védelmi feltételei is vannak. Csak olyan mérkőzés indítható el, amely már kapott pályát és becsült időablakot, továbbá a backend megakadályozza, hogy ugyanazon a pályán egyszerre két futó mérkőzés legyen, illetve hogy ugyanaz a játékos egyszerre több futó mérkőzésben szerepeljen. Lezárt verseny esetén az eredményjavítás alapértelmezésben zárolt, és csak adminisztratív feloldás után engedélyezett.

### FR-09 Állásszámítás és holtversenykezelés

A rendszernek képesnek kell lennie a csoportok állásának automatikus kiszámítására. Az állás meghatározásának nem kizárólag a győzelmek számán kell alapulnia, hanem kezelnie kell a holtversenyeket is.

A rendszernek támogatnia kell:
- győzelmek és lejátszott mérkőzések alapú rangsorolást,
- egymás elleni eredmény figyelembevételét,
- több szereplős holtverseny esetén mini-tabella alkalmazását,
- szettkülönbség figyelembevételét,
- pontkülönbség figyelembevételét,
- konfigurálható tie-break policy alkalmazását,
- a feloldhatatlan holtversenyek kezelését.

Ez a követelmény szakmailag azért lényeges, mert a továbbjutás és a végeredmény szempontjából az állásszámítás a rendszer egyik legfontosabb üzleti logikája.

### FR-10 Továbbjutók kiválasztása és playoff generálása

A rendszernek támogatnia kell, hogy a csoportkörből automatikusan kiválaszthatók legyenek a továbbjutók, és a kategória konfigurációja alapján létrejöjjön az egyenes kieséses ág.

A rendszernek képesnek kell lennie:
- a top N továbbjutó automatikus kiválasztására,
- a playoff nyitókörének meghatározására,
- seedelt párosítások létrehozására,
- elődöntő, döntő és releváns esetben bronzmérkőzés generálására,
- playoff-only kategória kezelésére.

A rendszer célja itt az, hogy az adminisztrátor minimális kézi munkával tudja elindítani az egyenes kieséses szakaszt.

### FR-11 Nyilvános board és állapotvizualizáció

A rendszernek biztosítania kell olyan nézetet, amely a futó és a következő mérkőzések gyors áttekintését nyújtja. Ez a funkció különösen hasznos helyszíni kijelzőn vagy versenyirodai tájékoztatás során.

A rendszernek támogatnia kell:
- futó mérkőzések megjelenítését,
- következő mérkőzések megjelenítését,
- pályaszámok kijelzését,
- játékosnevek és kategória-információk megjelenítését,
- játékvezetői információ megjelenítését, ha rendelkezésre áll,
- becsült kezdési idők kijelzését,
- nyilvános, egyszerű nézet biztosítását.

A board funkció célja az operatív tájékoztatás, nem az adminisztráció kiváltása.

### FR-12 Audit naplózás

A rendszernek naplóznia kell a fontosabb adminisztratív műveleteket. A naplózás célja a követhetőség és az utólagos visszaellenőrizhetőség.

A rendszernek legalább az alábbi típusú eseményeket kell tudnia rögzíteni:
- verseny létrehozása,
- kategória létrehozása és módosítása,
- sorsoláslezárás,
- játékosok tömeges importja vagy felvétele,
- ütemezés generálása,
- eredményrögzítés,
- check-inhez kapcsolódó műveletek.

A naplózás különösen hasznos hibakeresésnél és bemutatási helyzetekben is.

### FR-13 Adatexport

A rendszernek lehetővé kell tennie a versenyhez kapcsolódó adatok exportálását strukturált, külsőleg feldolgozható formátumban. A jelenlegi megvalósításban ez CSV exportot jelent.

A rendszernek biztosítania kell legalább:
- mérkőzések exportját,
- játékosok exportját,
- csoportállások exportját.

Az export célja, hogy a versenyadatok később archiválhatók, ellenőrizhetők vagy más eszközökben tovább feldolgozhatók legyenek.

### FR-14 Hibaellenálló működés a felhasználói folyamatokban

A rendszernek képesnek kell lennie arra, hogy a nem megengedett vagy hiányos folyamatok esetén is kontrollált módon reagáljon. Ennek megfelelően a felületnek és a backendnek is kezelnie kell az olyan eseteket, amikor egy adott objektum még nem létezik, egy azonosító hibás, vagy a felhasználó rossz sorrendben próbál műveleteket végrehajtani.

A rendszernek tehát:
- érvényesítenie kell a bemeneti adatokat,
- vissza kell utasítania a hibás azonosítókat,
- meg kell akadályoznia a nem létező versenyekre vagy kategóriákra történő műveleteket,
- egyértelmű hibaüzeneteket kell adnia,
- el kell kerülni a szerveroldali összeomlást hibás kliensoldali kérés esetén.

Ez a követelmény a stabil használhatóság alapfeltétele.

A jelenlegi implementációban ez kiegészül több konkrét üzleti védőkorláttal is: a rendszer tiltja az ütemezetlen mérkőzés elindítását, a pályaütközéseket, a játékosütközéseket, valamint a lezárt verseny jogosulatlan eredménymódosítását. Ezek a korlátok nem csak felületi, hanem backend oldali ellenőrzésekkel is érvényesülnek.

### FR-15 Lezárt verseny kontrollált eredményjavítása

A rendszernek támogatnia kell, hogy lezárt verseny esetén az eredmények alapértelmezésben zároltak maradjanak, ugyanakkor adminisztratív döntéssel ideiglenesen feloldhatók legyenek, ha utólagos korrekció szükséges.

A rendszernek biztosítania kell:
- a lezárt verseny eredményzárolt állapotának nyilvántartását,
- a feloldás és visszazárás adminisztratív műveletét,
- annak biztosítását, hogy feloldás nélkül ne legyen mód pontszám- vagy állapotmódosításra,
- a javítás utáni kontrollált visszazárást.

Ez a követelmény azért fontos, mert valós versenyhelyzetben előfordulhat, hogy rosszul bemondott eredményt kell korrigálni, ugyanakkor a lezárt verseny adatainak általános módosíthatósága nem kívánatos.

## 3.2 Nem-funkcionális követelmények

### NFR-01 Megbízhatóság és konzisztencia

A rendszernek megbízhatóan kell kezelnie a versenyhez kapcsolódó adatokat. Egy művelet végrehajtása után a kapcsolódó állapotoknak konzisztensnek kell maradniuk. Például egy mérkőzés eredményének módosítása után az állásnak és a továbbjutási logikának az új állapothoz kell igazodnia.

### NFR-02 Használhatóság

A rendszer elsődleges felhasználója nem fejlesztő, hanem versenyszervező vagy adminisztrátor. Ennek megfelelően a felületnek egyszerűnek, áttekinthetőnek és gyorsan kezelhetőnek kell lennie. A felhasználónak mindig egyértelműen látnia kell, hogy melyik versenyben és melyik kategóriában dolgozik, illetve mi a következő logikus művelet.

### NFR-03 Alacsony kognitív terhelésű adminisztráció

Mivel a rendszer versenyhelyzetben is használható, a felület nem lehet túlterhelt vagy feleslegesen bonyolult. A legfontosabb műveleteknek kevés lépésből végrehajthatóknak kell lenniük, a veszélyes műveleteket pedig jól elkülönítve kell megjeleníteni.

### NFR-04 Teljesítmény

A rendszernek tipikus amatőr vagy félprofesszionális versenyméret mellett elfogadható időn belül kell működnie. Az általános adminisztratív műveleteknek, listázásoknak és állásszámításoknak rövid válaszidővel kell lefutniuk. Az ütemezési és generálási műveletek sem igényelhetnek olyan futási időt, amely a gyakorlati használatot akadályozza.

### NFR-05 Biztonság

A rendszernek védenie kell a felhasználói fiókokat és a versenyadatokat. Ennek érdekében:
- a jelszavakat nem szabad olvasható formában tárolni,
- hitelesítés nélküli felhasználó nem férhet hozzá a védett végpontokhoz,
- a felhasználó nem érheti el más felhasználó versenyeit,
- a bemeneteket validálni kell,
- a hibás vagy rosszindulatú kérések nem okozhatnak rendszerösszeomlást.

### NFR-06 Karbantarthatóság

A rendszernek jól tagolt, bővíthető szerkezetben kell felépülnie. A backendben célszerű elválasztani a route, service és model rétegeket, a frontendben pedig az oldalak, komponensek és szolgáltatások felelősségi körét. Ez elősegíti az új funkciók hozzáadását és a hibajavítást.

### NFR-07 Tesztelhetőség

A rendszer üzleti logikáját úgy kell kialakítani, hogy az automatizált és manuális tesztelésre egyaránt alkalmas legyen. A kritikus folyamatokhoz reprodukálható teszteseteknek kell készíthetőknek lenniük, különösen a sorsolás, az állásszámítás, a továbbjutás és az ütemezés területén.

### NFR-08 Futtathatóság és telepíthetőség

A rendszernek fejlesztői környezetben egyszerűen indíthatónak kell lennie. A backendnek és a frontendnek külön-külön is futtathatónak kell lennie, környezeti változókkal konfigurálható módon. A rendszernek alkalmasnak kell lennie helyi futtatásra és bemutatási célú használatra.

### NFR-09 Auditálhatóság és visszakövethetőség

A rendszerben végzett fontosabb műveleteknek utólag is visszakövethetőknek kell lenniük. Ez nem csupán fejlesztési szempontból hasznos, hanem valós versenyszervezési helyzetben is segíti a hibák és vitás esetek tisztázását.

### NFR-10 Bővíthetőség

A rendszernek olyan architektúrában kell készülnie, amely lehetővé teszi további funkciók későbbi hozzáadását. Ilyen lehet például új exportformátumok bevezetése, fejlettebb jogosultságkezelés, fejlettebb ütemezési logika, importfunkciók vagy nyilvánosabb megjelenítési módok.

### NFR-11 Lokalizált és egységes felhasználói kommunikáció

A rendszer felhasználói felületének és hibaüzeneteinek a dolgozat nyelvéhez igazodóan egységesen magyar nyelvűnek kell lennie. A hibák megfogalmazásának rövidnek, egyértelműnek és lehetőség szerint a végrehajtandó teendőre is utalónak kell lennie.

## 3.3 Elfogadási kritériumok

A rendszer akkor tekinthető a követelmények szempontjából elfogadhatónak, ha az alábbi feltételek teljesülnek.

### AC-01 Felhasználói hozzáférés

- A felhasználó képes regisztrálni és bejelentkezni.
- Sikeres bejelentkezés után kizárólag a saját versenyeit látja.
- A jelszó módosítása sikeres hitelesítés után végrehajtható.

### AC-02 Verseny és kategória kezelés

- A felhasználó képes új versenyt létrehozni és annak alapadatait menteni.
- Egy versenyhez legalább egy kategória létrehozható.
- A kategóriák konfigurációja módosítható és menthető.

### AC-03 Játékos- és nevezéskezelés

- Egy kategóriához játékosok adhatók hozzá egyenként és tömegesen is.
- A rendszer nyilvántartja a nevezési adatok, a fizetési állapot és a fizetési mód alapvető mezőit.
- Fizetési csoport használatakor a csoportszintű befizetés a kapcsolódó nevezések állapotát is konzisztensen frissíti.
- A játékosok check-in állapota külön kezelhető.

### AC-04 Csoportkör és mérkőzésgenerálás

- A rendszer képes csoportkörös mérkőzések létrehozására.
- A generált mérkőzések között nincs önmagával játszó játékos és nincs duplikált párosítás.
- Nagyobb mezőny esetén a rendszer képes részleges round robin logika alkalmazására.

### AC-05 Ütemezés

- A pending mérkőzésekhez kezdési időpont és pályaszám rendelhető.
- Az ütemezés figyelembe veszi a megadott alapvető pihenőidő-paramétereket.
- A rendszer több kategória esetén is képes használható beosztást előállítani.
- A rendszer képes a versenyhez megadott játékvezetők automatikus rotációjára.
- A rendszer képes a még várakozó mérkőzések becsült kezdési idejének újraszámítására a tényleges mérkőzésállapotok alapján.
- A már futó mérkőzések és az ütemezési adatok alapján nem engedhető meg pályaütközés vagy játékosütközés a meccsindítás során.

### AC-06 Eredményrögzítés és állásfrissítés

- A mérkőzés eredménye szettekre bontva rögzíthető.
- A mérkőzés állapota megfelelően változik.
- A rögzített eredmény hatására a csoportállás automatikusan frissül.
- Lezárt versenyben az eredmény módosítása csak akkor engedélyezett, ha az adminisztrátor előbb feloldotta az eredményjavítási zárolást.

### AC-07 Holtverseny és továbbjutás

- Holtverseny esetén a rendszer a konfigurált tie-break logikát alkalmazza.
- A továbbjutók automatikusan meghatározhatók.
- A playoff ág a továbbjutási adatokból felépíthető.

### AC-08 Playoff kezelés

- A rendszer képes playoff-only és group+playoff kategória kezelésére.
- A playoff szakaszban legalább elődöntő, döntő és releváns esetben bronzmérkőzés generálható.
- A playoff mérkőzések a rendszerben nyomon követhetők és eredményezhetők.

### AC-09 Export és naplózás

- A rendszerből exportálhatók a mérkőzések, a játékosok és a csoportállások.
- A fontosabb adminisztratív események audit naplóban rögzülnek.

### AC-10 Hibatűrés és stabilitás

- Hibás vagy nem létező azonosító megadása esetén a rendszer nem omlik össze.
- A backend kontrollált hibaválaszt ad.
- A frontend nem tesz lehetővé értelmetlen vagy nem kontextusos műveleteket.
- A backend pálya-, játékos- és lezárt állapothoz kapcsolódó üzleti védelmei akkor is érvényesülnek, ha a kliens hibás kérést küld.

### AC-11 Bemutathatóság

- A rendszer demo adatokkal feltölthető.
- Ismert tesztfelhasználóval belépve a fő folyamatok végigmutathatók.
- Egyetlen felhasználói fiók alatt több, eltérő állapotú verseny is megjeleníthető.

### AC-12 Kontrollált eredményjavítás

- Lezárt versenyben a mérkőzések eredménye alapállapotban nem módosítható.
- Az adminisztrátor képes a lezárt verseny eredményjavítási zárolását feloldani és visszazárni.
- Feloldás után a szükséges korrekció elvégezhető, majd a verseny újra zárolható.

### AC-13 Játékvezetői rotáció és dinamikus időbecslés

- Ha a versenyhez játékvezetők vannak megadva, a globális ütemezés képes automatikusan játékvezetőt rendelni a mérkőzésekhez.
- A játékvezetői hozzárendelés figyelembe veszi a minimális játékvezetői pihenőidőt.
- A rendszer nem osztja be indokolatlanul mindig ugyanazt a játékvezetőt, hanem törekszik az egyenletes terhelésre.
- A hátralévő pending mérkőzések becsült kezdési ideje adminisztratív művelettel újraszámítható.
- Az újraszámítás figyelembe veszi a futó mérkőzéseket, a már befejezett mérkőzések tényleges idejét, a pályák elérhetőségét és a játékospihenőt.

## 3.4 A jelen verzió határai

A követelményspecifikáció összeállításánál fontos figyelembe venni, hogy a dolgozatban szereplő rendszer nem egy teljes körű országos szövetségi versenyplatform, hanem egy szakdolgozati keretek között elkészített, működő és bemutatható alkalmazás.

Ennek megfelelően a jelen verzióban nem elsődleges cél:
- összetett szerepköralapú jogosultságkezelés,
- több adminisztrátor közötti együttműködés,
- teljes offline-first működés,
- PDF alapú hivatalos dokumentumgenerálás,
- külső rendszerekkel történő integráció.

Ezek a funkciók lehetséges továbbfejlesztési irányt jelentenek, de a jelen dolgozatban nem képezik az elfogadás alapfeltételeit.

# 4. Tervezés

## 4.1 Architektúra

A rendszer tervezése során az volt a cél, hogy az alkalmazás funkcionálisan jól elkülönülő rétegekből épüljön fel, és a versenykezeléshez tartozó üzleti logika ne keveredjen közvetlenül sem a felhasználói felülettel, sem az adatbázis-hozzáféréssel. Ennek megfelelően a megoldás egy klasszikus, háromrétegű webalkalmazás-architektúrát követ, amely frontend, backend és adatbázis rétegből áll.

A választott technológiai stack a MERN megközelítéshez illeszkedik. A kliensoldali felület React alapú, a szerveroldali logika Node.js környezetben futó Express alkalmazás, az adatok pedig MongoDB adatbázisban kerülnek tárolásra. A komponensek közötti kommunikáció REST API-n keresztül valósul meg, JSON formátumú kérésekkel és válaszokkal.

### 4.1.1 Réteges felépítés

A rendszer három fő rétegre bontható:

- **prezentációs réteg**, amely a felhasználói felületet valósítja meg;
- **alkalmazási logikai réteg**, amely a kérések feldolgozását, az üzleti szabályok végrehajtását és a jogosultságellenőrzést kezeli;
- **perzisztencia réteg**, amely az adatok tartós tárolását biztosítja.

A prezentációs réteg feladata, hogy a felhasználó számára áttekinthető kezelőfelületet biztosítson a versenyek, kategóriák, nevezések, mérkőzések és állások kezelésére. A backend réteg biztosítja az összes üzleti művelet végrehajtását, például a csoportkör-generálást, az állásszámítást vagy a playoff létrehozását. Az adatbázis réteg a tartós adatkezelésért felelős, beleértve a felhasználói adatokat, a versenystruktúrát, a mérkőzéseket és az auditnaplókat.

A réteges szétválasztás legfontosabb előnye, hogy a rendszer könnyebben karbantartható és bővíthető. Egy üzleti szabály módosítása jellemzően a backend szolgáltatási rétegében elvégezhető anélkül, hogy a frontend nézetlogikáját vagy az adatbázis-struktúrát jelentősen át kellene alakítani.

### 4.1.2 Frontend architektúra

A frontend egy React-alapú egyoldalas alkalmazásként készült. A felület fő szerepe az adminisztrációs folyamatok támogatása, tehát nem egy nyilvános marketingoldal vagy statikus információs portál, hanem operatív használatra tervezett kezelőfelület.

A kliensoldali architektúra több, egymástól jól elkülönülő elemre bontható:

- **oldalszintű nézetek**, amelyek egy-egy fő funkcionális területet jelenítenek meg;
- **újrafelhasználható komponensek**, amelyek egységes megjelenítést és viselkedést biztosítanak;
- **layout réteg**, amely a közös oldalvázat, az oldalsávot és a felső navigációs elemeket biztosítja;
- **router réteg**, amely az URL-ekhez tartozó nézeteket illeszti össze;
- **szolgáltatási réteg**, amely a backend API-hívásokat absztrahálja;
- **auth kontextus**, amely a bejelentkezett felhasználó állapotát kezeli.

A frontend oldalstruktúrája a tényleges munkafolyamatot követi. Ennek megfelelően külön nézet készült például:
- dashboardhoz,
- verseny létrehozásához,
- versenyáttekintéshez,
- kategóriakezeléshez,
- kategóriarészletekhez,
- check-inhez,
- nevezésekhez,
- befizetésekhez,
- mérkőzésekhez,
- ütemezéshez,
- standings nézethez,
- playoff nézethez,
- board nézethez,
- adminisztratív export- és naplóoldalhoz,
- profilkezeléshez.

A frontend útvonalkezelése kliensoldalon történik. A router csak olyan dinamikus útvonalakat tekint érvényesnek, amelyekben a verseny- és kategóriaazonosítók ObjectId formátumúnak megfelelőek. Ez azért fontos tervezési döntés, mert így bizonyos hibás navigációs helyzetek már kliensoldalon kiszűrhetők, és nem vezetnek felesleges backend hibákhoz.

A frontend és backend közötti kommunikáció egy külön API-szolgáltatási rétegen keresztül történik. Ez a réteg egységesíti a HTTP-hívásokat, kezeli a JSON kéréseket és válaszokat, valamint egységes hibakezelési modellt biztosít. Ennek eredményeként az oldalak és komponensek nem közvetlenül a `fetch` hívásokat használják, hanem egy központi API interfészen keresztül kommunikálnak a szerverrel.

A jelenlegi frontend szerkezetben a megjelenítéshez külön formázó segédfüggvények (`formatters.jsx`), az API-válaszok felhasználóbarát, magyar nyelvű kezeléséhez pedig központi hibaüzenet-fordító modul (`errorMessages.js`) is tartozik. Ez segít abban, hogy a felületen ne nyers backend üzenetek vagy belső enumértékek jelenjenek meg.

### 4.1.3 Backend architektúra

A backend Express keretrendszerre épülő REST API. A szerver feladata nem pusztán adatok kiszolgálása, hanem a versenykezelés üzleti szabályainak végrehajtása és a jogosultságok kikényszerítése.

A backend felépítése funkcionálisan négy fő szerkezeti elemre bontható:

- **route réteg**, amely a HTTP végpontokat definiálja;
- **middleware réteg**, amely például hitelesítést végez;
- **service réteg**, amely az üzleti logikát valósítja meg;
- **model réteg**, amely a MongoDB-ben tárolt entitások sémáit írja le.

A route réteg erőforrás-orientált szerkezetet követ. Külön végpontcsoportok tartoznak többek között az alábbi területekhez:
- hitelesítés,
- versenyek,
- kategóriák,
- kategória-specifikus műveletek,
- játékosok,
- csoportok,
- mérkőzések,
- nevezések,
- befizetési csoportok,
- auditnaplók,
- exportok,
- nyilvános board funkciók.

A route réteg felett fontos szerepet kap az autentikációs middleware. A védett végpontok csak hitelesített felhasználó számára érhetők el, míg az autentikációs és bizonyos nyilvános board jellegű végpontok ettől elkülönítve működnek. A jogosultsági modell alapelve, hogy minden versenyhez tartozik egy tulajdonos, és egy felhasználó kizárólag a saját versenyeihez tartozó adatokat érheti el.

A backend üzleti logikájának legfontosabb része a service rétegben található. Itt valósulnak meg többek között:
- a hitelesítéshez tartozó segédfüggvények,
- a konfigurációvalidáció,
- a badminton szabályrendszer szerinti eredményellenőrzés,
- a round robin és csonka round robin párosításgenerálás,
- az ütemezési logika,
- az állásszámítás és tie-break kezelés,
- a playoff generálás,
- a CSV export,
- az auditnaplózás,
- a tulajdonosi ellenőrzés.

Ez a szétválasztás azt eredményezi, hogy a route fájlok elsősorban kérésfeldolgozási és validációs szerepet töltenek be, míg a nem triviális üzleti döntések külön szolgáltatási modulokba kerülnek.

### 4.1.4 Adatbázis és perzisztencia

A rendszer MongoDB adatbázist használ, amely dokumentum-orientált megközelítést biztosít. A választás indoka az volt, hogy a versenykezelés során számos olyan adatstruktúra fordul elő, amely jól modellezhető beágyazott vagy részben rugalmas dokumentumokkal. Ilyenek például:
- a verseny konfigurációs paraméterei,
- a kategória check-in beállításai,
- a mérkőzések szettjei,
- az auditnapló metadata mezői,
- a visszalépésekhez tartozó csoportszintű rekordok.

A MongoDB-hez való hozzáférés Mongoose rétegen keresztül történik. A Mongoose sémák biztosítják:
- a mezők típusainak meghatározását,
- az alapértelmezett értékek kezelését,
- az enum alapú korlátozásokat,
- az indexelést,
- az egyedi kulcsok kikényszerítését.

A perzisztencia réteg tervezésénél fontos szempont volt, hogy a lekérdezések túlnyomó többsége versenyhez vagy kategóriához kötődik, ezért az entitások jelentős részében szerepel a `tournamentId`, és több helyen a `categoryId` is. Ez elősegíti a gyors szűrést és az adatok tulajdonosi szintű szétválasztását.

### 4.1.5 Kommunikációs modell

A frontend és backend közötti kommunikáció HTTP-alapú REST interfészen keresztül történik. A kliens JSON formátumú kéréseket küld, a szerver pedig jellemzően JSON válaszokat ad vissza. Az architektúra fontos jellemzője, hogy a frontend nem közvetlenül adatbázissal dolgozik, hanem kizárólag a backend által biztosított végpontokon keresztül.

A kommunikáció során két nagy végponttípus különíthető el:

- **védett API végpontok**, amelyek hitelesítést igényelnek;
- **nyilvános végpontok**, amelyek például a board megjelenítését szolgálják.

A hitelesített kommunikáció alapja Bearer token használata. A kliens a bejelentkezést követően eltárolja a tokent, majd ezt minden védett kérésnél elküldi az Authorization fejlécben. A backend middleware szinten ellenőrzi ezt az információt, és csak sikeres hitelesítés esetén engedi tovább a kérést.

### 4.1.6 Tervezési döntések indoklása

A rendszer architektúrája tudatosan nem monolitikus nézetkódra vagy egyetlen nagy backend fájlra épül, mert a versenykezelési logika összetettsége ezt hosszabb távon nehezen karbantarthatóvá tenné. A round robin generálás, a tie-break logika, az ütemezés és a playoff felépítése önmagukban is különálló felelősségi területek, ezért indokolt ezek moduláris elkülönítése.

A frontend oldalon az adminisztrációs folyamatokat követő nézetstruktúra azért előnyös, mert a versenykezelés tipikusan nem egyszeri lineáris varázslóként zajlik. A szervező gyakran visszalép korábbi lépésekhez, módosít adatokat, majd újra megnyitja a mérkőzés- vagy standings nézetet. Emiatt a nézetek közötti gyors navigáció és az aktuális versenykontextus megőrzése fontos tervezési követelmény volt.

A backend oldalon az ownership ellenőrzés és az ID-validáció beépítése szintén lényeges tervezési döntés. Egy ilyen rendszerben nem elegendő pusztán működő CRUD műveleteket biztosítani; garantálni kell, hogy egy hibás vagy rosszindulatú kérés ne tudjon más felhasználó adataihoz hozzáférni, illetve ne vezessen szerveroldali összeomláshoz.

### 4.1.7 Az architektúra összefoglalása

Az alkalmazás architektúrája tehát egy React alapú kliensből, egy Express alapú REST backendből és egy MongoDB adatbázisból áll. A rendszer rétegesen szervezett, a fő üzleti logikák külön szolgáltatási modulokba vannak kiemelve, a felhasználói adatok tulajdonosi alapon elválasztottak, a kommunikáció pedig hitelesített API-hívásokon keresztül valósul meg. Ez a struktúra megfelelő alapot biztosít a jelenlegi funkciók működtetéséhez, valamint a későbbi bővítésekhez is.

**Javasolt ábrahely:**  
*4.1. ábra – A rendszer magas szintű architektúrája (React frontend – Express REST API – MongoDB adatbázis)*

---

## 4.2 Adatmodell

A rendszer adatmodelljének tervezése során az elsődleges cél az volt, hogy a versenykezelés fő objektumai jól elkülönülő, mégis egymással kapcsolatban álló entitásokként jelenjenek meg. Az adatmodellnek egyszerre kellett támogatnia a verseny szerkezeti leírását, a lebonyolítás operatív lépéseit, a nevezési és fizetési adminisztrációt, valamint az utólagos ellenőrizhetőséget.

A jelenlegi modell dokumentumorientált szemléletet követ, ugyanakkor az entitások közötti kapcsolatok világosan kirajzolhatók, ezért a rendszer jól leírható kvázi entitás-kapcsolat szemléletben is.

### 4.2.1 Az adatmodell fő entitásai

A rendszer fő entitásai a következők:

- **User**
- **Tournament**
- **Category**
- **Player**
- **Entry**
- **PaymentGroup**
- **Group**
- **Match**
- **AuditLog**

Ezek az entitások együtt fedik le a rendszer teljes működését a hitelesítéstől a lebonyolításon át az exportig és a naplózásig.

### 4.2.2 User entitás

A `User` entitás a rendszer hitelesített felhasználóit reprezentálja. Egy felhasználóhoz név, e-mail cím, jelszóhash és szerepkör tartozik. A jelenlegi rendszerben a szerepkör egyszerűsített, gyakorlatilag adminisztrátori jogosultságot jelent, mivel a szakdolgozat fókusza nem a komplex szerepköralapú hozzáféréskezelés.

A `User` entitás és a `Tournament` entitás között egy-a-többhöz kapcsolat áll fenn:
- egy felhasználó több versenyt is létrehozhat;
- egy verseny pontosan egy tulajdonoshoz tartozik.

Az e-mail cím egyedi, ez biztosítja, hogy ugyanazzal az azonosítóval ne jöhessen létre több fiók.

### 4.2.3 Tournament entitás

A `Tournament` entitás a rendszer legfelső szervezési egysége. Egy versenyhez tartozik:
- név,
- tulajdonos,
- dátum,
- helyszín,
- állapot,
- globális konfiguráció,
- a versenyhez kapcsolódó játékvezetői névlista.

A konfiguráció beágyazott alstruktúraként jelenik meg, amely többek között az alábbi paramétereket foglalja magában:
- mérkőzésszabályok,
- becsült mérkőzéshossz,
- minimális játékospihenő,
- minimális bírói pihenő,
- pályaforgatási idő,
- pályák száma,
- check-in grace idő,
- nevezési díj használata,
- nevezési díj összege.

A jelenlegi modellben a versenyhez tartozik egy külön `finishedResultEditUnlocked` logikai mező is, amely azt jelzi, hogy lezárt állapotban a mérkőzéseredmények javítása ideiglenesen engedélyezett-e. Ez a mező a lezárt versenyek kontrollált korrekcióját támogatja.

A `Tournament` központi szerepe miatt gyakorlatilag minden operatív entitás kapcsolódik hozzá. Ennek következtében a `Tournament` entitás és a következő entitások között egy-a-többhöz kapcsolat áll fenn:
- `Category`
- `Player`
- `Entry`
- `PaymentGroup`
- `Match`
- `AuditLog`

Ez a döntés egyszerűsíti az ownership alapú szűrést és a verseny szerinti lekérdezéseket.

### 4.2.4 Category entitás

A `Category` entitás egy versenyen belüli önálló versenyszámot vagy lebonyolítási egységet reprezentál. Egy kategória megadja azt a kontextust, amelyben a játékosok indulnak, a csoportok létrejönnek, a mérkőzések keletkeznek, és a standings vagy playoff logika lefut.

A kategória legfontosabb mezői:
- név,
- státusz,
- draw verzió,
- draw lezárási idő,
- check-in konfiguráció,
- csoportkörös mérkőzésszám paraméter,
- csoportcélméret,
- továbbjutók száma,
- playoff méret,
- nemi besorolás,
- korosztály,
- lebonyolítási forma,
- tie-break policyk,
- walkover és incomplete policy.

A `Category` és a `Tournament` között sok-egy kapcsolat áll fenn: minden kategória pontosan egy versenyhez tartozik.

A `Category` és a `Group`, `Player`, `Entry`, valamint `Match` entitások között szintén szoros kapcsolat van. Egy kategóriához több csoport, több játékos, több nevezés és több mérkőzés tartozhat.

A kategóriaállapotok (`setup`, `checkin_open`, `draw_locked`, `in_progress`, `completed`) azt a folyamatelvet támogatják, hogy a kategória nem pusztán statikus adat, hanem több fázison átmenő objektum.

### 4.2.5 Player entitás

A `Player` entitás a versenyben szereplő játékosokat reprezentálja. Egy játékos rekord tartalmazza:
- a verseny azonosítóját,
- opcionálisan a kategória azonosítóját,
- a játékos nevét,
- a klubját,
- megjegyzést,
- a check-in időpontját,
- az indulási jogosultság típusát.

A `mainEligibility` mező lehetővé teszi, hogy a rendszer megkülönböztesse a normál indulót, a csak barátságos mérkőzésre használható játékost, illetve a visszalépett résztvevőt.

A jelenlegi implementációban a `Player` entitás már önmagában is tartalmaz kategóriakapcsolatot, ugyanakkor a nevezési adminisztráció külön `Entry` entitásban is megjelenik. Ez részben abból fakad, hogy a rendszer fejlődése során a kezdeti egyszerűbb játékoskezelés kibővült részletesebb nevezési és fizetési logikával. A jelenlegi modell így egyfajta gyakorlati kompromisszumként értelmezhető: a játékos gyorsan elérhető kategóriaszinten, miközben a nevezéshez kapcsolódó adminisztratív adatok külön struktúrában is rendelkezésre állnak.

### 4.2.6 Entry entitás

Az `Entry` entitás a nevezési adminisztráció elsődleges rekordja. Ez kapcsolja össze a versenyt, a kategóriát és a játékost, valamint itt tárolhatók a nevezési díjhoz kapcsolódó információk.

Egy nevezés tartalmazza:
- a verseny azonosítóját,
- a kategória azonosítóját,
- a játékos azonosítóját,
- a nevezési díj összegét,
- a befizetési állapotot,
- a fizetési módot,
- a számlázási nevet,
- a számlázási címet,
- opcionálisan egy payment group azonosítót.

A modell egyedi indexet használ a `categoryId` és `playerId` mezőpáron, így egy játékos ugyanabba a kategóriába nem nevezhető be többször.

Az `Entry` entitás fontos szerepe, hogy elválasztja a sporttechnikai játékosadatot a pénzügyi-adminisztratív nevezési adattól.

A jelenlegi implementációban a nevezések fizetési állapota a fizetési csoportokhoz is kapcsolódik. Ha egy nevezés fizetési csoporthoz tartozik, akkor a csoport befizetett állapotának módosítása a kapcsolódó nevezések `paid` mezőit is konzisztensen frissíti.

### 4.2.7 PaymentGroup entitás

A `PaymentGroup` entitás több nevezés közös pénzügyi kezelésére szolgál. Ez akkor hasznos, ha például egy klub vagy csapat egyszerre több játékos nevezési díját rendezi.

A payment group főbb mezői:
- versenyazonosító,
- fizető neve,
- számlázási név,
- számlázási cím,
- befizetési állapot,
- fizetési mód,
- megjegyzés.

A `PaymentGroup` és az `Entry` között egy-a-többhöz kapcsolat áll fenn:
- egy payment group több nevezéshez kapcsolódhat;
- egy nevezés legfeljebb egy payment grouphoz tartozhat.

A megvalósítás fontos részlete, hogy a payment group nem csupán leíró vagy számlázási csoportosító szerepet tölt be, hanem a befizetettség konzisztenciáját is kezeli. A csoport szintű befizetés ezért a felületen és backend oldalon is tényleges tömeges adminisztratív műveletként jelenik meg.
A fizetési mód mező adminisztratív célú enumként jelenik meg. A jelenlegi rendszerben lehetséges értékei például az ismeretlen, készpénz, átutalás, bankkártya és egyéb fizetési mód. Ez a mező nem pénzügyi tranzakciót hajt végre, hanem a szervező helyszíni nyilvántartását pontosítja.

### 4.2.8 Group entitás

A `Group` entitás a csoportkör lebonyolítási egysége. Egy csoport egy adott kategórián belül jön létre, és tartalmazza a hozzá tartozó játékosokat.

A csoport főbb mezői:
- versenyazonosító,
- kategóriaazonosító,
- csoportnév,
- játékoslista,
- visszalépési rekordok.

A játékosok a csoporton belül tömbként jelennek meg, amely referenciaazonosítókat tárol. Ez a struktúra jól illeszkedik ahhoz, hogy a csoportban részt vevő mezőny mérete tipikusan korlátozott.

A `withdrawals` mező azért került be a modellbe, hogy a rendszer képes legyen dokumentálni a csoportkör során bekövetkező visszalépéseket. Egy visszalépési rekord tartalmazza:
- az érintett játékost,
- a visszalépés okát,
- az alkalmazott policy-t,
- opcionális megjegyzést,
- időbélyeget.

Ez lehetővé teszi, hogy a rendszer ne pusztán aktuális állapotot tároljon, hanem a visszalépések történetét is.

### 4.2.9 Match entitás

A `Match` entitás a rendszer egyik legfontosabb objektuma, mivel gyakorlatilag minden versenylogikai művelet erre épül. Egy mérkőzés tartalmazza a sporttechnikai, időzítési és adminisztratív adatokat egyaránt.

A mérkőzés legfontosabb mezői:
- versenyazonosító,
- kategóriaazonosító,
- opcionálisan csoportazonosító,
- két játékosazonosító,
- párosítást azonosító kulcs,
- kör vagy szakasz megnevezése,
- státusz,
- fordulószám,
- draw verzió,
- eredménytípus,
- void státusz és kapcsolódó mezők,
- pályaszám,
- tervezett kezdési és befejezési idő,
- tényleges kezdési és befejezési idő,
- eredményfrissítés ideje,
- játékvezető neve vagy automatikusan kiosztott játékvezető,
- szettek listája,
- győztes.

A `Match` entitás ütemezési adatai a dinamikus becsléshez is felhasználhatók. A tervezett kezdési és befejezési idő nem csak az első ütemezés eredménye lehet, hanem később a tényleges mérkőzésállapotok alapján újraszámított becslésként is frissülhet. Ez a modell lehetővé teszi, hogy a rendszer a lebonyolítás során bekövetkező csúszásokhoz is alkalmazkodjon.

A `Match` modell tervezése során fontos szempont volt, hogy egyetlen objektumban lehessen kezelni:
- a csoportkörös mérkőzéseket,
- a playoff mérkőzéseket,
- a normál lejátszott eredményeket,
- a speciális kimeneteleket,
- az ütemezési információkat.

A `groupId` mező opcionális, mert playoff-only vagy csoporttól független mérkőzések esetén nincs szükség csoportkapcsolatra.

A `pairKey` és a hozzá kapcsolódó egyedi indexelési logika biztosítja, hogy ugyanazon draw verzión belül ne keletkezhessenek duplikált párosítások. Ez különösen redraw vagy újragenerálási helyzetekben fontos.

A `drawVersion` mező lehetővé teszi, hogy a rendszer elméletileg több sorsolási állapotot is meg tudjon különböztetni. Ez tervezési szempontból azért előnyös, mert a sorsolás módosítása vagy újragenerálása nem feltétlenül igényel teljesen új entitásrendszert.

### 4.2.10 AuditLog entitás

Az `AuditLog` entitás a rendszer műveleti naplózását valósítja meg. Célja, hogy az adminisztratív műveletek visszakövethetők legyenek.

A naplórekord kapcsolódhat:
- felhasználóhoz,
- versenyhez,
- kategóriához,
- csoporthoz,
- mérkőzéshez,
- játékoshoz.

A rekord főbb mezői:
- érintett entitástípus,
- entitásazonosító,
- művelet neve,
- összefoglaló szöveg,
- állapot előtte,
- állapot utána,
- kiegészítő metadata,
- időbélyeg.

Ez a modell rugalmasan használható különféle eseménytípusok naplózására, és különösen hasznos hibakeresési, auditálási és demonstrációs célokra.

### 4.2.11 Kapcsolatok összefoglalása

Az adatmodell legfontosabb kapcsolatai az alábbiak szerint foglalhatók össze:

- egy `User` több `Tournament` rekordot birtokolhat;
- egy `Tournament` több `Category`, `Player`, `Entry`, `PaymentGroup`, `Match` és `AuditLog` rekordot tartalmazhat;
- egy `Category` több `Group`, `Player`, `Entry` és `Match` rekordhoz kapcsolódhat;
- egy `Group` több `Player` rekordot fog össze, és több `Match` rekord kiindulópontja lehet;
- egy `Player` több `Match` rekordban szerepelhet résztvevőként;
- egy `Entry` egy `Player` adott kategóriás nevezését reprezentálja;
- egy `PaymentGroup` több `Entry` rekordhoz tartozhat;
- egy `AuditLog` rekord többféle entitáshoz is hivatkozást tárolhat.

Az adatmodell központi szervezőelve tehát a versenyazonosító köré épülő hierarchia, amelyet kategória- és mérkőzésszintű kapcsolatok finomítanak.

### 4.2.12 Tervezési kompromisszumok

Az adatmodell több ponton tudatos kompromisszumot tartalmaz. Az egyik ilyen a `Player` és `Entry` közötti részleges átfedés. Elméletileg teljesen normalizált modellben elegendő lenne, ha a játékos kizárólag személyes vagy sporttechnikai adatokat tárolna, és minden kategóriakapcsolat az `Entry` entitáson keresztül valósulna meg. A jelenlegi modell azonban gyakorlati egyszerűsítésként megtartja a `Player` kategóriakötését is, mert ez számos lekérdezést és műveletet egyszerűbbé tesz.

Hasonló kompromisszum a `Match` entitás összetettsége. Ahelyett, hogy a tervezett és a tényleges eredményadatok külön objektumokban jelennének meg, ezek egyetlen dokumentumban kaptak helyet. Ez ugyan növeli az entitás méretét, de csökkenti a kapcsolatok számát és egyszerűsíti a tipikus lekérdezéseket.

A dokumentumorientált adatbázis választása miatt a modell nem klasszikus relációs normalizáltságot követ, hanem a gyakori használati esetekre optimalizált kompromisszumot.

### 4.2.13 Az adatmodell összefoglalása

A rendszer adatmodellje a versenykezelés fő fogalmait jól elkülöníthető entitásokba szervezi, miközben megőrzi a gyakorlati használhatóságot és a fejlesztői egyszerűséget. A modell alkalmas a verseny struktúrájának leírására, a lebonyolítás közbeni állapotváltozások kezelésére, a nevezési és befizetési adminisztráció támogatására, valamint az események naplózására.

**Javasolt ábrahely:**  
*4.2. ábra – A rendszer fő entitásai és kapcsolatai (User, Tournament, Category, Player, Entry, Group, Match, PaymentGroup, AuditLog)*

## 4.3 API terv

A rendszer backendje REST szemléletű API-ként került megtervezésre. Az API elsődleges célja, hogy a frontend számára jól elkülöníthető erőforrásokon keresztül biztosítsa a versenykezeléshez szükséges műveleteket. Az API nem egy általános célú adatszolgáltató réteg, hanem kifejezetten a versenyszervezési folyamatokat kiszolgáló interfész, ezért az egyes végpontok több helyen üzleti műveletekhez is kapcsolódnak, nem kizárólag tiszta CRUD műveletekhez.

A jelenlegi megvalósításban az API két nagy részre bontható:
- hitelesítést igénylő, védett végpontokra az `/api` prefix alatt,
- hitelesítés nélkül is elérhető nyilvános végpontokra a `/public` prefix alatt.

A védett végpontok minden esetben a bejelentkezett felhasználóhoz tartozó erőforrásokra korlátozódnak. Ez azt jelenti, hogy a backend nem pusztán az erőforrás létezését ellenőrzi, hanem azt is, hogy az adott verseny vagy kapcsolódó objektum valóban a hitelesített felhasználó tulajdonában van.

### 4.3.1 API-tervezési alapelvek

Az API kialakításakor az alábbi tervezési alapelvek érvényesültek:

- az erőforrások nevei a domain fogalmait követik, például tournament, category, group, match vagy entry;
- a műveletek lehetőség szerint HTTP metódusokkal különülnek el;
- az API JSON formátumú kéréseket és válaszokat használ;
- a szerveroldali validáció minden író műveletnél kötelező;
- a hibás vagy nem megengedett műveletekhez megfelelő státuszkód és hibaüzenet tartozik;
- a védett végpontokhoz minden esetben hitelesítés szükséges;
- az erőforrás-specifikus üzleti műveletek külön végpontként jelennek meg, például `finalize-draw`, `playoff/advance` vagy `schedule/global`.

A tervezés egyik fontos sajátossága, hogy az API nem kizárólag adatelérési, hanem folyamatvezérlési rétegként is működik. Ennek megfelelően a rendszerben több olyan végpont is található, amely egy komplexebb üzleti lépést valósít meg egyetlen kérésen keresztül.

### 4.3.2 Hitelesítéshez kapcsolódó végpontok

A hitelesítési funkciók az `/api/auth` végpontcsoportba kerültek. Ezek biztosítják a felhasználói fiókok létrehozását, a bejelentkezést, az aktuális felhasználói állapot lekérdezését és a jelszó módosítását.

A fő végpontok:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/password`

A regisztráció és bejelentkezés válaszában a backend hitelesítési tokent ad vissza, amelyet a kliens a későbbi védett kérések során Authorization fejlécben küld vissza. A `GET /me` végpont célja, hogy a frontend ellenőrizni tudja a munkamenet érvényességét, és betöltse a felhasználó alapadatait.

A `PATCH /password` végpont különösen fontos a profilkezelés szempontjából, mivel ez teszi lehetővé a jelenlegi jelszó ellenőrzése melletti biztonságos jelszómódosítást.

### 4.3.3 Versenykezelési végpontok

A versenyekhez kapcsolódó fő végpontok az `/api/tournaments` útvonal alatt érhetők el. Ezek egyszerre támogatják az alapvető CRUD jellegű műveleteket és a verseny életciklusának vezérlését.

A főbb végpontok:

- `POST /api/tournaments`
- `GET /api/tournaments`
- `GET /api/tournaments/:id`
- `PATCH /api/tournaments/:id`
- `POST /api/tournaments/:id/start`
- `POST /api/tournaments/:id/finish`
- `PATCH /api/tournaments/:id/finished-edit-lock`
- `POST /api/tournaments/configure`

A `POST /configure` végpont speciális szerepet tölt be, mert egyetlen tranzakciós műveletként képes létrehozni a versenyt és a hozzá tartozó kategóriákat. Ez a megoldás különösen hasznos akkor, amikor a felhasználó nem lépésenként akarja felépíteni a versenyt, hanem egy konfigurációs képernyőről szeretné elindítani a teljes alapstruktúrát.

A `start` és `finish` végpontok a verseny állapotát vezérlik, így a rendszer életciklus-szemléletet követ, nem pusztán statikus adatrekordokkal dolgozik. A `finished-edit-lock` végpont ennek kiegészítéseként kontrollált adminisztratív feloldást biztosít a lezárt versenyek utólagos eredménykorrekciójához.

### 4.3.4 Kategóriakezelési végpontok

A kategóriák két logikai csoportra bontható végpontkészlettel rendelkeznek. Az egyik a kategória mint erőforrás kezelésére szolgál, a másik a kategóriához tartozó operatív műveleteket valósítja meg.

Az alap kategóriavégpontok:

- `POST /api/categories`
- `GET /api/categories`
- `GET /api/categories/:id`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

Az operatív kategóriavégpontok:

- `POST /api/categories/:id/players`
- `POST /api/categories/:id/players/bulk`
- `PATCH /api/categories/:id/checkin/grace`
- `POST /api/categories/:id/finalize-draw`
- `POST /api/categories/:id/playoff/advance`
- `POST /api/categories/:id/close-grace`
- `POST /api/categories/:id/friendly-match`

Ez a szétválasztás tervezési szempontból indokolt, mert a kategória mint adatobjektum kezelése és a kategóriahoz kapcsolódó versenyüzemi műveletek eltérő felelősségi kört képviselnek. A `finalize-draw` például nem egyszerű mezőmódosítás, hanem csoportok és mérkőzések tömeges létrehozásával járó üzleti folyamat.

### 4.3.5 Játékos-, nevezés- és fizetési végpontok

A játékosok, nevezések és payment group rekordok külön végpontcsoportokban kezelhetők.

A játékosok főbb végpontjai:

- `POST /api/players`
- `GET /api/players`
- `PATCH /api/players/:playerId/checkin`

A nevezésekhez tartozó főbb végpontok:

- `GET /api/entries`
- `PATCH /api/entries/:id`
- `POST /api/entries/sync-missing`

A payment group műveletek főbb végpontjai:

- `GET /api/payment-groups`
- `POST /api/payment-groups`
- `PATCH /api/payment-groups/:id`

A játékos és nevezés szétválasztása azért előnyös, mert a sporttechnikai és adminisztratív adatok külön életciklust követnek. Egy játékos rekord elsősorban a versenyző személyét reprezentálja, míg a nevezési rekord a díjfizetéshez, számlázáshoz és nevezési adminisztrációhoz tartozó információkat tárolja.

A `sync-missing` végpont azt a gyakorlati problémát kezeli, hogy a rendszerben már létező játékosokhoz szükség esetén automatikusan létrehozhatók a hiányzó nevezési rekordok. A fizetési csoportokat kezelő végpontok ezen felül a csoportszintű befizetés és a kapcsolt nevezések fizetési állapota közötti szinkront is biztosítják.

A nevezési és fizetési végpontok a fizetési mód kezelését is támogatják. Ez azt jelenti, hogy a nevezések és a fizetési csoportok módosításakor nemcsak a befizetési állapot, hanem a fizetés típusa is rögzíthető. A fizetési mód enum jellegű mezőként jelenik meg, így a frontend egységes magyar nyelvű címkékkel tudja megjeleníteni.

### 4.3.6 Csoportokhoz és állásokhoz kapcsolódó végpontok

A csoportkezelés a versenylogika egyik központi eleme, ezért külön végpontcsoportot kapott. A csoportok nem csupán tárolt objektumok, hanem a standings, withdrawal és playoff műveletek belépési pontjai is.

A főbb csoportvégpontok:

- `POST /api/groups`
- `GET /api/groups`
- `GET /api/groups/:groupId/standings`
- `PATCH /api/groups/:groupId/withdraw`
- `GET /api/groups/:groupId/playoff`
- `POST /api/groups/:groupId/playoff`
- `POST /api/groups/:groupId/playoff/advance`
- `POST /api/groups/:groupId/playoff/final`
- `GET /api/groups/:groupId/winner`

A standings végpont a csoportkör befejezett mérkőzéseiből számolja ki az állást. A withdraw végpont külön üzleti jelentőséggel bír, mert képes a visszalépések különböző policy szerinti kezelésére. A csoportból generált playoff végpontok pedig a továbbjutók kiválasztásán alapuló egyenes kieséses szakasz felépítését és továbbvitelét biztosítják.

### 4.3.7 Mérkőzésekhez és ütemezéshez kapcsolódó végpontok

A mérkőzéskezelés az API egyik legsűrűbben használt területe. A rendszer itt nemcsak lekérdezést és módosítást támogat, hanem a teljes mérkőzés-életciklus kezelését is.

A főbb végpontok:

- `GET /api/matches`
- `GET /api/matches/group/:groupId`
- `POST /api/matches/group/:groupId`
- `PATCH /api/matches/:matchId/umpire`
- `PATCH /api/matches/:matchId/status`
- `PATCH /api/matches/:matchId/result`
- `PATCH /api/matches/:matchId/outcome`
- `POST /api/matches/group/:groupId/schedule`
- `POST /api/matches/tournament/:tournamentId/schedule/global`
- `POST /api/matches/tournament/:tournamentId/schedule/reestimate`
- `PATCH /api/matches/group/:groupId/schedule/reset`

A mérkőzések generálása csoportszinten történik. A státuszfrissítés és eredményrögzítés külön végpontokban valósul meg, mert ezek eltérő validációs logikát követnek. Az `outcome` végpont speciális kimenetelek, például walkover vagy void kezelésére szolgál. A mérkőzésindításnál a backend külön ellenőrzi a pálya- és játékosütközéseket, valamint azt is, hogy a meccs rendelkezik-e ütemezési adatokkal.

Az ütemezés két szinten jelenik meg:
- csoportszintű schedule generálás,
- teljes versenyszintű globális schedule generálás.

Ez a kettős felosztás azért indokolt, mert más problémát old meg egyetlen csoport belső meccseinek kiosztása, mint több kategória közös pályahasználatának összehangolása.

### 4.3.8 Audit- és exportvégpontok

A rendszer támogatja a műveleti naplózás lekérdezését és többféle CSV exportot.

A fő audit és export végpontok:

- `GET /api/audit-logs`
- `GET /api/exports/tournaments/:tournamentId/matches.csv`
- `GET /api/exports/tournaments/:tournamentId/players.csv`
- `GET /api/exports/groups/:groupId/standings.csv`

Az exportvégpontok célja nem a frontend képernyőinek közvetlen kiszolgálása, hanem a strukturált adatkinyerés biztosítása. Ez a gyakorlatban archiválási, dokumentációs és külső elemzési célokra is hasznos.

### 4.3.9 Nyilvános board végpont

A rendszer tartalmaz egy olyan nyilvános végpontot is, amely nem igényel hitelesítést, és a versenyhelyszíni tájékoztatást támogatja.

A fő végpont:

- `GET /public/tournaments/:tournamentId/board`

Ez a végpont a futó és a közelgő mérkőzéseket szolgáltatja, minimalizált adatstruktúrában. A funkció tervezési célja az volt, hogy a versenyirodai vagy kijelzőn történő megjelenítés elkülönüljön az adminisztrációs felülettől.
A board végpont a dinamikusan frissített becsült kezdési időket és a mérkőzéshez rendelt játékvezető nevét is meg tudja jeleníteni, amennyiben ezek az adatok rendelkezésre állnak. Ez a helyszíni tájékoztatást javítja, mert a játékosok nemcsak a pályaszámot és ellenfelet látják, hanem a várható kezdésről is pontosabb képet kaphatnak.

### 4.3.10 Tipikus API-folyamatok

Az API tervezése során a hangsúly nem egyes végpontok izolált működésén, hanem a teljes folyamatok támogatásán volt.

Egy tipikus csoportkörös kategóriafolyamat az alábbi lépésekből áll:
- verseny és kategóriák létrehozása,
- játékosok rögzítése,
- check-in állapotok beállítása,
- sorsolás lezárása,
- csoportok és mérkőzések automatikus generálása,
- ütemezés,
- eredményrögzítés,
- standings lekérdezés,
- playoff generálása,
- playoff továbbvitele.

Egy playoff-only kategória esetén a folyamat rövidebb:
- kategória és játékosok létrehozása,
- draw lezárása,
- kezdeti playoff ág generálása,
- eredményrögzítés,
- következő kör generálása,
- döntő és győztes lekérdezése.

A tervezés egyik erőssége éppen az, hogy ezek a folyamatok az API-n keresztül egyértelműen leképezhetők, és a frontend oldali nézetek logikusan felépíthetők rájuk.

### 4.3.11 Hibakezelés az API-szinten

A backend végpontok minden lényeges műveletnél végeznek:
- ObjectId validációt,
- tulajdonosi ellenőrzést,
- állapotellenőrzést,
- bemeneti adattípus-validációt,
- üzleti szabály szerinti konzisztenciavizsgálatot.

Ez azért fontos, mert a rendszerben számos olyan művelet létezik, amely csak bizonyos állapotokban hajtható végre. Például:
- draft állapoton kívül egyes objektumok már nem módosíthatók,
- finished versenyben új adminisztratív művelet nem indítható,
- nem lezárt csoportkörből nem generálható playoff,
- hibás azonosító esetén a rendszer nem végezhet adatbázis-hozzáférést értelmetlen módon.

Az API-terv tehát tudatosan nem csupán funkcionalitás-, hanem stabilitásorientált.

**Javasolt ábrahely:**  
*4.3. ábra – A backend API fő végpontcsoportjai és azok kapcsolata a fő domainobjektumokkal*

---

## 4.4 Kulcslogikák és algoritmusok

A rendszer legfontosabb értékét nem pusztán a felhasználói felület vagy az adatkezelés adja, hanem azok az üzleti logikák, amelyek a verseny lebonyolítását ténylegesen automatizálják. Ezek a logikák több, egymással szorosan összefüggő szolgáltatási modulban valósulnak meg. A jelen alfejezet ezek közül a legfontosabbakat mutatja be.

### 4.4.1 Csoportkör-generálás: teljes és csonka round robin

A csoportkör-generálás célja, hogy a rendszer a játékosok listájából olyan párosításokat hozzon létre, amelyek a kategória paramétereihez és a mezőny méretéhez illeszkednek.

A megvalósítás két fő esetet különböztet meg:

- **teljes round robin**, amikor minden játékos minden másik játékossal játszik;
- **csonka round robin**, amikor minden játékos csak meghatározott számú mérkőzést játszik.

Kis létszámú csoport esetén a rendszer a teljes round robin logikát alkalmazza. Ennek alapja a klasszikus körforgásos párosítási módszer, amely páros játékosszám esetén minden fordulóban teljes párosítást ad, páratlan játékosszám esetén pedig egy virtuális BYE helyet vezet be. A BYE párosításból nem keletkezik tényleges mérkőzés, így a generált lista csak valós párosításokat tartalmaz.

Nagyobb mezőny esetén a teljes körmérkőzés túl sok mérkőzést eredményezne, ezért a rendszer részleges round robin logikát használ. Páros létszám esetén a teljes round robin körforgásos fordulóiból csak az első `m` forduló kerül kiválasztásra, ahol `m` a játékosonként kívánt mérkőzésszám. Páratlan létszámnál ez a megoldás BYE torzuláshoz vezetne, ezért a rendszer egy külön, szabályos fokszámú gráfra épülő párosítási logikát alkalmaz. Ebben az esetben minden játékos pontosan azonos számú ellenfelet kap, és az `m` értéknek párosnak kell lennie.

A round robin szolgáltatás legfontosabb céljai tehát:
- önmagával játszó játékos kizárása,
- duplikált párosítások elkerülése,
- a terhelés közel egyenletes elosztása,
- a mérkőzésszám kontrollálása nagy mezőnyben.

A megközelítés nem törekszik formális optimumra, viszont gyakorlati körülmények között jól használható kompromisszumot ad.

### 4.4.2 Sorsoláslezárás és check-in alapú mezőnyképzés

A rendszer nem abból indul ki, hogy minden benevezett játékos biztosan elindul. Ezért a tényleges mezőny kialakítása a check-in és a sorsoláslezárás után történik meg.

A draw lezárás logikája az alábbi fő lépésekből áll:

1. a rendszer összegyűjti az adott kategória ténylegesen induló, `main` jogosultságú játékosait;
2. playoff-only kategória esetén ellenőrzi, hogy a játékosszám pontosan megfelel-e a megadott playoff méretnek;
3. csoportos kategória esetén a játékosokat csoportokba osztja;
4. a csoportokhoz legenerálja a csoportkörös mérkőzéseket;
5. a kategória állapotát `draw_locked` értékre állítja;
6. eltárolja a draw verziót és a lezárás időpontját.

A csoportképzés jelenlegi megvalósítása egyszerű, soronként szétosztó elvet követ. Ez nem klasszikus seedelés, hanem olyan kiegyensúlyozó mechanizmus, amely a létrejövő csoportok létszámát igyekszik egyenletesen elosztani.

A check-inhez kapcsolódó grace idő lezárása külön logika. A határidő letelte után a meg nem jelent játékosok `friendly_only` státuszba kerülhetnek, és az őket érintő, még le nem játszott mérkőzések voidolhatók. Ez a megoldás lehetővé teszi, hogy a rendszer alkalmazkodjon a valós versenyhelyzetekhez anélkül, hogy a teljes struktúrát újra kellene építeni.

### 4.4.3 Mérkőzéseredmények validációja

A mérkőzéseredmény-rögzítés nem korlátozódik arra, hogy a rendszer eltároljon néhány számot. A backend ellenőrzi, hogy a megadott szettek valóban megfelelnek-e a konfigurált tollaslabda szabályoknak.

A validációs logika paraméterezhető, a fő paraméterek:
- `bestOf`,
- `pointsToWin`,
- `winBy`,
- `cap`.

A rendszer ezekből számítja ki, hogy hány nyert szett szükséges a mérkőzés megnyeréséhez. Ezután minden szett esetén ellenőrzi:
- a pontszámok egész számok-e,
- nincs-e döntetlen szett,
- a győztes elérte-e a minimális pontszámot,
- teljesül-e a minimális különbség,
- a cap szabály helyesen érvényesül-e,
- nem szerepel-e a szükségesnél több szett a végeredményben.

Ha a validáció sikeres, a rendszer meg tudja határozni a mérkőzés győztesét, majd a mérkőzés állapotát `finished` értékre állítja. A tényleges kezdési és befejezési idő, valamint az eredményfrissítés időpontja szintén rögzítésre kerül.

Ez a logika azért lényeges, mert a standings, a továbbjutás és a playoff összes későbbi lépése a korrektül validált eredményekre épül.

### 4.4.4 Állásszámítás és tie-break feloldás

A standings logika a rendszer egyik legfontosabb szakmai komponense. A cél nem pusztán a győzelmek összeszámlálása, hanem a holtversenyek szabályozott, reprodukálható feloldása.

Az egyes játékosokhoz a rendszer az alábbi statisztikákat számolja:
- győzelmek száma,
- lejátszott mérkőzések száma,
- szettkülönbség,
- pontkülönbség.

Az elsődleges rangsorolás alapja a győzelmi arány, majd a győzelmek száma. Erre azért van szükség, mert speciális helyzetekben – például visszalépések vagy voidolt mérkőzések miatt – a lejátszott mérkőzések száma eltérhet.

Ha két játékos kerül holtversenybe, a rendszer először az egymás elleni eredményt vizsgálja. Ha ez nem dönt, a konfiguráció függvényében összesített szett- és pontkülönbséget is figyelembe vehet.

Ha három vagy több játékos áll holtversenyben, a rendszer mini-táblát épít kizárólag az érintett játékosok egymás elleni mérkőzéseiből. Ezen a mini-táblán ugyanazokat a statisztikai mutatókat számolja ki, mint a teljes csoporton. A konfigurációtól függően ezt követően vagy:
- közvetlen mini-tábla alapú döntést hoz,
- vagy mini-tábla után visszalép az összesített szett- és pontkülönbséghez.

Ha a holtverseny még ezután sem oldható fel, a rendszer kétféle policy szerint járhat el:
- közös helyezést rendel az érintettekhez,
- vagy manuális feloldást igénylő állapotot jelez.

Ez a megoldás azért előnyös, mert a rendszer nem kényszerít ki mesterséges és szakmailag nehezen indokolható sorrendet ott, ahol a rendelkezésre álló adatok nem teszik lehetővé az egyértelmű döntést.

### 4.4.5 Továbbjutók kiválasztása és playoff ág generálása

A playoff generálás logikája az állásszámításra épül. A rendszer először meghatározza a továbbjutás alapját képező top N játékost. Ha a továbbjutási határon holtverseny áll fenn, és azt a tie-break logika sem oldja fel teljesen, a rendszer manuális feloldást vagy explicit felülbírálatot kérhet.

A továbbjutók kiválasztása után a rendszer a playoff méretből meghatározza a kezdőkört:
- 4 játékos esetén elődöntő,
- 8 játékos esetén negyeddöntő,
- 16 játékos esetén nyolcaddöntő,
- 32 játékos esetén harmincketted-döntő,
- 2 játékos esetén közvetlen döntő.

A párosítások seedelt alapelv szerint jönnek létre. A jelenlegi implementációban ez azt jelenti, hogy a rendszer az elejéről és a végéről párosít:
- 1. helyezett – utolsó továbbjutó,
- 2. helyezett – utolsó előtti továbbjutó,
- és így tovább.

A csoportból generált playoff és a playoff-only kategória logikája azonos elvre épül, csak a bemenet eltér:
- group+playoff esetén a standings adja a bemenetet,
- playoff-only esetén a kategória indulómezőnye közvetlenül szolgál alapul.

A következő playoff kör generálása már a kész mérkőzések győzteseiből történik. Két-két győztes összevezetésével új mérkőzések jönnek létre a következő körben. Elődöntő után a rendszer automatikusan bronzmérkőzést is tud generálni a két vesztesből.

Ez a logika lehetővé teszi, hogy a playoff ne egyszerre, teljes mélységében legyen előállítva, hanem fokozatosan, az előző kör tényleges eredményei alapján épüljön fel.

### 4.4.6 Visszalépés és speciális meccskimenetelek kezelése

A valós versenyekben gyakori, hogy egy játékos sérülés, önkéntes visszalépés vagy meg nem jelenés miatt nem tudja folytatni a szereplést. A rendszer ezért külön logikát tartalmaz a visszalépések kezelésére.

A csoportszintű withdrawal két fő policy mentén működik:
- `delete_results`,
- `keep_results`.

A `delete_results` esetben az érintett játékos meccsei void státuszba kerülnek, és a standings ezeket figyelmen kívül hagyja. Ez akkor indokolt, ha az adott eredmények torzítanák a teljes csoportot.

A `keep_results` esetben a már lejátszott meccsek eredménye megmarad, a még nem lejátszott mérkőzések pedig walkover jellegű lezárást kaphatnak. A rendszer ezekhez `wo` típusú eredményt rendel.

A speciális meccskimenetelek külön végponttal kezelhetők, így a mérkőzéséletciklus nem csak normál lejátszott eredményekre épül.

A rendszer jelenlegi állapotában ehhez kapcsolódik a lezárt versenyek kontrollált eredményjavítási mechanizmusa is. A lezárás után a meccsek módosítása alapértelmezésben tiltott, de adminisztratív feloldással ideiglenesen engedélyezhető, majd a korrekció után újra visszazárható. Ez a megközelítés jobban illeszkedik a valós versenyhelyzetekhez, mint a korlátlan utólagos szerkeszthetőség.

### 4.4.7 Ütemezési algoritmus

A rendszer kétféle ütemezési logikát valósít meg:
- csoportszintű ütemezést,
- globális, több kategóriát összehangoló ütemezést.

A csoportszintű ütemezés egy greedy algoritmusra épül. Az alapötlet az, hogy minden mérkőzéshez meg kell keresni azt a pályát, ahol a lehető legkorábbi kezdési idő adódik, figyelembe véve:
- a verseny kezdeti időpontját,
- az adott pálya legkorábbi szabaddá válását,
- a két játékos legkorábbi rendelkezésre állását.

A játékos rendelkezésre állási idejét a rendszer a legutóbbi meccs vége és a minimális pihenőidő alapján számolja. A pálya elérhetősége a korábbi meccs vége és a pályaforgatási idő alapján módosul.

Formálisan a kezdési idő az alábbi maximumként fogható fel:

`candidateStart = max(baseStart, courtAvailableAt, playerAvailableAt(p1), playerAvailableAt(p2))`

A globális ütemezés ugyanerre az alapelvre épül, de kategóriák közötti fairness szempontot is figyelembe vesz. A mérkőzések kategóriánként sorokba rendeződnek, és a rendszer mindig a sorok elején álló mérkőzések közül választ. A választásnál figyelembe veszi:
- az adott kategóriában eddig kiosztott mérkőzések számát,
- az elérhető legkorábbi kezdési időt,
- a kategóriák közötti kiegyensúlyozottságot,
- a roundNumber és createdAt sorrendet.

Ennek eredményeként egyetlen kategória nem tudja teljesen kiszorítani a többit a pályahasználatból, miközben a rendszer továbbra is törekszik a korai és sűrű ütemezésre.

Ez a megoldás nem globális optimumot keres, hanem gyorsan futó, gyakorlati heurisztikát alkalmaz.

### 4.4.8 Játékvezetői rotáció és dinamikus időbecslés

Az ütemezési logika kiegészült automatikus játékvezetői rotációval. A megoldás alapja az, hogy a versenyhez megadott játékvezetői névlistából a rendszer minden ütemezett mérkőzéshez megpróbál alkalmas játékvezetőt választani.

A kiválasztás során két fő szempont érvényesül:
- a játékvezető legkorábbi rendelkezésre állási ideje,
- a játékvezető eddigi terhelése.

A rendszer a minimális játékvezetői pihenőidőt is figyelembe veszi. Ez azt jelenti, hogy egy játékvezető nem osztható be közvetlenül egymás után több mérkőzésre, ha a konfigurált pihenőidő ezt nem engedi. Ha több játékvezető is alkalmas, a rendszer előnyben részesíti azt, aki eddig kevesebb mérkőzést kapott. Ez egyszerű, de gyakorlatban jól értelmezhető fairness-elvet biztosít.

A dinamikus időbecslés célja, hogy a lebonyolítás közbeni csúszások vagy gyorsabb mérkőzések után a szervező frissíteni tudja a még várakozó mérkőzések becsült kezdési idejét. A rendszer ilyenkor nem generál új sorsolást, hanem a meglévő mérkőzésekhez rendelt pálya- és állapotadatok alapján újraszámolja a pending mérkőzések várható kezdését.

Az újraszámítás figyelembe veszi:
- a már futó mérkőzések pályafoglalását,
- a befejezett mérkőzések tényleges befejezési idejét,
- a pályák következő elérhető időpontját,
- a játékosok minimális pihenőidejét,
- a pályaforgatási időt,
- opcionálisan a játékvezetői rotációt.

Ez a megközelítés azért előnyös, mert nem változtatja meg önkényesen a teljes lebonyolítási struktúrát, mégis lehetőséget ad a menetrend életszerű frissítésére.

### 4.4.9 Exportfolyamat

A jelenlegi rendszerben az export logika CSV alapú. Az exportfolyamat három fő lépésből áll:

1. a backend a megfelelő erőforráskörből lekéri az adatokat;
2. az adatokat exportbarát, lapos rekordstruktúrává alakítja;
3. a rekordokat CSV-formátumban küldi vissza letölthető válaszként.

A jelenlegi implementáció külön exportot biztosít:
- mérkőzésekhez,
- játékosokhoz,
- csoportállásokhoz.

Ez a logika egyszerűbb, mint egy PDF-generáló pipeline, ugyanakkor a versenyadatok archiválására és további feldolgozására már jelen formájában is alkalmas.

### 4.4.10 Tulajdonosi ellenőrzés és hibaellenálló működés

Bár ez nem klasszikus algoritmus a szűk matematikai értelemben, a rendszer stabil működése szempontjából mégis kulcslogikának tekinthető.

A backend több szolgáltatási ponton külön ellenőrzi:
- az ObjectId-k formailag helyes voltát,
- az erőforrás felhasználóhoz tartozását,
- az állapotgépek szerinti megengedett műveleteket.

Ennek jelentősége abban áll, hogy a rendszer nem csak helyes bemenetre működik, hanem hibás, hiányos vagy rossz sorrendben végrehajtott kérések esetén is kontrollált választ ad. Ez különösen fontos egy olyan adminisztratív rendszerben, ahol a felhasználó sok, egymásra épülő lépést hajt végre.

### 4.4.11 A kulcslogikák összegzése

A rendszer legfontosabb üzleti értéke abból fakad, hogy a versenyszervezés legnehezebb részeit automatizálja. Ide tartozik:
- a csoportkör létrehozása,
- a részleges round robin kezelése,
- az eredmények validálása,
- az állás és holtversenyek kiszámítása,
- a továbbjutók meghatározása,
- a playoff fokozatos felépítése,
- az ütemezés pálya- és pihenőidő-korlátok mellett.
- - a játékvezetői rotációt,
- a dinamikus becsült időfrissítést.

Ezek a logikák együtt teszik lehetővé, hogy a rendszer ne csupán adatnyilvántartó alkalmazás legyen, hanem ténylegesen támogassa a tollaslabda versenyek lebonyolítását.

**Javasolt ábrahelyek:**  
*4.4. ábra – Round robin és csonka round robin párosítás logikája*  
*4.5. ábra – Standings és tie-break döntési folyamat*  
*4.6. ábra – Playoff generálás és következő kör felépítése*  
*4.7. ábra – Greedy ütemezési logika több pályára*

# 5. Megvalósítás

A tervezett architektúra megvalósítása során az volt a cél, hogy a rendszer ne pusztán funkcionálisan működő prototípus legyen, hanem olyan szerkezetet kapjon, amelyben a domainlogika, a felhasználói felület és az adatkezelés jól elkülönül. Ennek megfelelően a megvalósítás során a backend és a frontend is moduláris felépítést kapott, és a rendszer legfontosabb üzleti szabályai különálló szolgáltatási rétegben kerültek megvalósításra.

A fejezet a jelenlegi implementáció fő szerkezeti elemeit és azok felelősségi köreit mutatja be.

## 5.1 Backend modulok felelősségei

A backend Node.js környezetben futó Express alkalmazásként valósult meg. A belépési pontot az `index.js` fájl adja, míg az alkalmazás összeállítása a `src/app.js` fájlban történik. A rendszer ezen a ponton regisztrálja a middleware-eket, az útvonalakat és az adatbázis-kapcsolatot.

A backend szerkezete négy fő részre bontható:
- middleware réteg,
- model réteg,
- route réteg,
- service réteg.

Ezt egészítik ki a segédjellegű scriptfájlok, amelyek seedelési, önellenőrzési és automatizált végponttesztelési feladatokat látnak el.

### 5.1.1 Middleware és alkalmazásindítás

Az alkalmazásindítás első lépése a környezeti változók betöltése és a MongoDB kapcsolat felépítése. A `src/app.js` fájl tartalmazza az Express példány létrehozását, a JSON és URL-encoded parser middleware-ek bekapcsolását, valamint az útvonalcsoportok regisztrációját.

A backendben fontos szerepet játszik az autentikációs middleware (`src/middleware/auth.middleware.js`). Ennek feladata:
- az Authorization fejléc ellenőrzése,
- a Bearer token kinyerése,
- a JWT token érvényesítése,
- a hitelesített felhasználó azonosítójának továbbadása a kéréshez.

A megvalósítás egyik tudatos döntése az volt, hogy a védett végpontok előtt egy közös `requireAuth` middleware kerül alkalmazásra. Ennek eredményeként az `/api/auth` és a `/public` kivételével minden `/api` útvonal csak hitelesített felhasználó számára érhető el. Ez egyszerűsíti a hozzáférésvédelmet, mert nem kell minden egyes route-ban külön újra definiálni a hitelesítési ellenőrzést.

### 5.1.2 A modellréteg megvalósítása

Az adatbázis-hozzáférés Mongoose modelleken keresztül történik. A jelenlegi implementáció külön modellt használ a rendszer fő domainobjektumaihoz:

- `User`
- `Tournament`
- `Category`
- `Player`
- `Entry`
- `PaymentGroup`
- `Group`
- `Match`
- `AuditLog`

A modellek feladata nem csupán a mezők leírása, hanem a domain szintű alapkorlátozások kikényszerítése is. Ilyen például:
- enum alapú mezők használata,
- alapértelmezett értékek beállítása,
- indexelés,
- bizonyos esetekben egyedi kulcsok használata.

A `Tournament` modell például nem pusztán néhány alapadatot tárol, hanem beágyazott konfigurációs objektumot is, amely a verseny globális paramétereit tartalmazza. A `Category` modellben szintén számos olyan mező található, amely nem pusztán leíró adat, hanem a lebonyolítás működését is meghatározza. A `Match` modell különösen összetett, mivel egyetlen entitáson belül kezeli:
- a résztvevőket,
- a szakaszt vagy kört,
- az állapotot,
- az ütemezési adatokat,
- a speciális meccskimeneteleket,
- a szettekre bontott eredményt,
- a győzteset.

A `Group` és `AuditLog` modellek szintén túlmutatnak az egyszerű adattároláson. A `Group` a csoporttagságon túl withdrawal információkat is képes tárolni, míg az `AuditLog` a rendszer fontosabb adminisztratív lépéseinek visszakövethetőségét biztosítja.

### 5.1.3 Route réteg és végpontcsoportok

A route réteg erőforrásalapú szerkezetben készült. Az egyes végpontcsoportok külön fájlokba szervezve jelennek meg, így a rendszerben jól elkülönülnek az eltérő felelősségi körök.

A főbb route fájlok:
- `auth.routes.js`
- `tournaments.routes.js`
- `tournaments.configure.routes.js`
- `categories.routes.js`
- `categories.ops.routes.js`
- `players.routes.js`
- `entries.routes.js`
- `payments.routes.js`
- `groups.routes.js`
- `matches.routes.js`
- `audit.routes.js`
- `exports.routes.js`
- `public.routes.js`

Ez a szerkezet két szempontból előnyös. Egyrészt az erőforrás-specifikus CRUD műveletek jól elkülönülnek az operatív üzleti műveletektől. Másrészt a rendszerben sok olyan folyamat van, amely egy adott domainobjektumhoz kötődik, de nem egyszerű létrehozás-módosítás-törlés típusú művelet. Ilyen például:
- a sorsolás lezárása,
- a playoff generálása,
- a globális ütemezés,
- a visszalépés kezelése,
- a check-in grace lezárása.

A `categories.ops.routes.js`, `groups.routes.js` és `matches.routes.js` ennek megfelelően a rendszer legösszetettebb üzleti végpontjait tartalmazzák.

A route fájlok jellemzően az alábbi feladatokat látják el:
- a kérés paramétereinek kinyerése,
- alapvető validáció,
- ownership ellenőrzés indítása,
- megfelelő szolgáltatási függvény meghívása,
- HTTP válasz formázása.

A nem triviális üzleti döntések tudatosan nem a route fájlokban kaptak helyet, hanem külön szolgáltatási modulokban.

### 5.1.4 Service réteg és üzleti logika

A backend érdemi szakmai része a service rétegben valósult meg. A rendszer több különálló szolgáltatási fájlt használ, amelyek egymástól jól elkülönülő felelősségi kört fednek le.

A főbb szolgáltatások:
- `auth.service.js`
- `audit.service.js`
- `badmintonRules.service.js`
- `configValidation.service.js`
- `csv.service.js`
- `entry.service.js`
- `ownership.service.js`
- `playoff.service.js`
- `roundRobin.service.js`
- `scheduler.service.js`
- `standings.service.js`

Az `auth.service.js` a jelszókezeléshez és tokenkibocsátáshoz kapcsolódó segédfüggvényeket tartalmazza. A `configValidation.service.js` feladata a verseny- és kategóriakonfigurációk szerkezeti és tartalmi ellenőrzése. Ez különösen fontos, mert a lebonyolítás számos későbbi eleme a kezdeti konfiguráció helyességére épül.

A `badmintonRules.service.js` felel a szettekre bontott eredmények validációjáért. A szolgáltatás paraméterezhető szabályrendszert használ, így a mérkőzések értelmezése nem fixen beégetett logikán, hanem konfigurálható alapelveken nyugszik.

A `roundRobin.service.js`, `standings.service.js`, `playoff.service.js` és `scheduler.service.js` alkotják a rendszer fő versenylogikai magját. Ezek valósítják meg:
- a csoportkörös párosításokat,
- a holtversenykezelést,
- a továbbjutók meghatározását,
- a playoff ág generálását,
- a mérkőzések idő- és pályabeosztását,
- a játékvezetők automatikus rotációját,
- a hátralévő mérkőzések becsült idejének újraszámítását.

Az `ownership.service.js` külön figyelmet érdemel. A rendszer egyik fontos biztonsági és konzisztenciaelvét ez biztosítja, mivel segíti annak ellenőrzését, hogy egy adott verseny vagy kapcsolódó objektum valóban a bejelentkezett felhasználóhoz tartozik-e. Ez a megoldás csökkenti annak esélyét, hogy egy route tévesen olyan erőforráshoz adjon hozzáférést, amely nem az aktuális felhasználó tulajdona.

A `csv.service.js` és az `audit.service.js` a támogató funkciók közé tartoznak. Előbbi az exportálható rekordok formázásáért, utóbbi a fontos adminisztratív események naplózásáért felel.

### 5.1.5 Script réteg: seed, önellenőrzés és smoke tesztek

A backend egyik fontos gyakorlati erőssége, hogy nem kizárólag az alkalmazáskód készült el, hanem hozzá kapcsolódó scriptkészlet is. A `src/scripts` mappában több olyan segédprogram található, amely a fejlesztést, a demonstrációt és a validálást támogatja.

Ezek közül kiemelendő:
- a `seed_demo.js`,
- a `selftest.js`,
- az `e2e_*` és `smoke:*` jellegű scriptfájlok.

A demo seed feladata egy ismert tesztfelhasználó és több, eltérő állapotú verseny létrehozása. Ez különösen hasznos a rendszer bemutatásakor, mert nem szükséges minden alkalommal manuálisan felépíteni a teljes demoállapotot.

Az önellenőrző és smoke jellegű scriptek többek között az alábbi területeket fedik le:
- authentikáció és ownership,
- check-in és sorsoláslezárás,
- standings és tie-break,
- playoff működés,
- globális ütemezés,
- eredményvalidáció,
- auditnaplózás,
- CSV export,
- nyilvános board,
- nevezési díj logika.

Ez a scriptkészlet a megvalósítás szempontjából azért fontos, mert a rendszer nem kizárólag manuális kipróbálásra támaszkodik, hanem több kulcsfolyamat reprodukálható módon is ellenőrizhető.

## 5.2 Frontend fő nézetek és állapotkezelés

A frontend React és Vite alapokra épülő egyoldalas alkalmazásként készült. A megvalósítás során a cél az volt, hogy az adminisztratív használat szempontjából legfontosabb munkafolyamatok jól elkülönülő, de egymás között gyorsan átjárható nézetekben jelenjenek meg.

A frontend szerkezete a következő fő elemekre bontható:
- alkalmazásbelépési réteg,
- hitelesítési állapotkezelés,
- kliensoldali útvonalkezelés,
- közös layout elemek,
- oldalszintű nézetek,
- kisebb újrafelhasználható komponensek,
- API-kommunikációs réteg.

### 5.2.1 Alkalmazásbelépés és auth állapotkezelés

A frontend belépési pontját a `src/main.jsx` és `src/App.jsx` fájlok adják. Az alkalmazás központi állapotkezelésének legfontosabb eleme az `AuthContext.jsx`, amely a bejelentkezett felhasználó állapotát, tokenjét és az ehhez tartozó műveleteket kezeli.

Az auth kontextus feladatai:
- a token és felhasználói adatok tárolása,
- a token visszaállítása böngészőfrissítés után,
- a `GET /api/auth/me` végponttal végzett munkamenet-ellenőrzés,
- bejelentkezési és regisztrációs műveletek biztosítása,
- kijelentkezés kezelése.

A token a böngésző `localStorage` területén kerül tárolásra. Ez egyszerű és jól használható megoldás a jelenlegi projektméret mellett, mivel a rendszer elsődleges célja nem vállalati szintű sessionmenedzsment, hanem stabil helyi és bemutatási használat biztosítása.

### 5.2.2 Kliensoldali router megvalósítása

A rendszer egyik technikailag érdekes sajátossága, hogy a frontend nem külső routerkönyvtárat használ, hanem saját, könnyített kliensoldali útvonalkezelést valósít meg a `src/router/router.jsx` fájlban.

A router:
- figyeli a böngésző aktuális útvonalát,
- kezeli az előre- és visszalépést,
- dinamikus útvonalminták alapján kiválasztja a megjelenítendő oldalt,
- route paramétereket biztosít az oldalak számára,
- kliensoldali ObjectId formátumellenőrzést végez az olyan paramétereken, mint az `id` és `categoryId`.

Ez a saját routermegoldás a projekt méretéhez illeszkedő, tudatos egyszerűsítés. Mivel az alkalmazás útvonalstruktúrája viszonylag jól körülhatárolható, nem volt szükség egy nagyobb routing könyvtár teljes funkcionalitására.

A későbbi hibajavítások során különösen hasznosnak bizonyult az a döntés, hogy a router már kliensoldalon kiszűri a nyilvánvalóan hibás azonosítókat. Ez hozzájárul ahhoz, hogy a felhasználó ne tudjon például a `/tournaments/new` útvonalról tévesen olyan route-okra navigálni, amelyek már létező versenyazonosítót várnak.

### 5.2.3 Layout és navigáció

A megjelenítés szerkezeti keretét az `AuthLayout.jsx` és `AppLayout.jsx` fájlok adják. Az `AuthLayout` a bejelentkezési és regisztrációs oldalakhoz tartozó egyszerűbb környezetet biztosítja, míg az `AppLayout` a fő adminfelület teljes vázát adja.

Az `AppLayout` fő felelősségei:
- bal oldali navigációs sáv megjelenítése,
- felső sáv és státuszinformációk kezelése,
- aktuális verseny- és kategóriakontextus felismerése az útvonal alapján,
- a megfelelő navigációs blokkok feltételes megjelenítése.

A megvalósítás fontos eleme, hogy a sidebar csak akkor jelenít meg verseny- és kategóriaszintű menüpontokat, ha a jelenlegi URL valóban létező formátumú azonosítót tartalmaz. Ez közvetlenül javította a rendszer stabilitását, mert megakadályozza azokat a navigációs helyzeteket, amikor a felhasználó még nem létező objektumra próbálna további műveleteket indítani.

### 5.2.4 Fő oldalak és funkcionális csoportok

A frontend funkcionálisan több fő oldalcsoportból áll.

**Hitelesítési oldalak:**
- `LoginPage.jsx`
- `RegisterPage.jsx`

Ezek a felhasználói belépéshez és új fiók létrehozásához szükséges űrlapokat tartalmazzák.

**Alap adminisztratív oldalak:**
- `DashboardPage.jsx`
- `ProfilePage.jsx`
- `TournamentCreatePage.jsx`
- `TournamentOverviewPage.jsx`

A dashboard a felhasználó versenyeinek áttekintését adja, a profiloldal a felhasználói adatok és jelszó kezelésére szolgál. A versenylétrehozó oldal a kezdeti konfigurációs folyamat belépési pontja, míg a versenyáttekintő oldal az adott verseny összefoglaló nézete.

**Versenyhez kötött operatív oldalak:**
- `CategoriesPage.jsx`
- `CategoryFormPage.jsx`
- `CategoryDetailPage.jsx`
- `CheckinPage.jsx`
- `EntriesPage.jsx`
- `PaymentsPage.jsx`
- `MatchesPage.jsx`
- `SchedulePage.jsx`
- `BoardPage.jsx`
- `AdminPage.jsx`

Ezek az oldalak a verseny lebonyolításának adminisztratív és operatív rétegeit fedik le. A kategóriaoldalak a versenyszámok létrehozására és módosítására szolgálnak, a check-in oldal a tényleges megjelenések rögzítését támogatja, az entries és payments oldalak pedig a nevezési, fizetési állapotbeli és fizetési mód szerinti adminisztrációt kezelik. A meccsek, ütemezés és board oldalak a lebonyolítás valós idejű szakaszaihoz kapcsolódnak. Az ütemezés oldalon indítható a globális menetrendkészítés, a játékvezetői rotáció és a dinamikus becsült időfrissítés is, míg az adminoldal export- és naplózási funkciókat jelenít meg.

**Kategóriaszintű speciális oldalak:**
- `StandingsPage.jsx`
- `PlayoffPage.jsx`

Ezek a nézetek közvetlenül a kategórián belüli versenylogikai állapotokhoz kapcsolódnak, és elsősorban az állás, továbbjutás és playoff szakasz követését szolgálják.

### 5.2.5 Újrafelhasználható komponensek

A frontendben több kisebb, újrafelhasználható komponens segíti a megjelenítési konzisztenciát. Ezek közé tartoznak például:
- `AppLink`
- `EmptyState`
- `FormField`
- `InfoHint`
- `PageHeader`
- `SectionCard`
- `StatCard`
- `StatusBadge`

A komponensek célja nem egy komplex design system kialakítása, hanem az, hogy a gyakran előforduló felületi minták egységesen jelenjenek meg. Ez javítja a használhatóságot és csökkenti a duplikált JSX kód mennyiségét.

A nézetek munkáját több kisebb szolgáltatási segédmodul is támogatja, például a formátum- és státuszmegjelenítést végző formatterek, valamint az API-hibák magyar nyelvű visszaadását végző hibaüzenet-fordító réteg. Ezek hozzájárulnak a felület konzisztens, végfelhasználóbarát működéséhez.

### 5.2.6 Állapotkezelési stratégia

A frontend nem használ különálló globális állapotkezelő könyvtárat, például Reduxot. Ehelyett a megvalósítás az alábbi kombinációra épül:
- globális auth állapot kontextuson keresztül,
- oldalszintű `useState` alapú lokális állapot,
- `useEffect` alapú adatbetöltés,
- route paraméterekből származtatott kontextus.

Ez a stratégia tudatos egyszerűsítés. A rendszer jelenlegi mérete és a képernyők felelősségi köre mellett a lokális állapotkezelés jól átlátható marad. Az auth állapot kivételével a legtöbb adat csak egy-egy konkrét oldal számára releváns, ezért nem indokolt teljes alkalmazásszintű globális tároló használata.

## 5.3 Integráció: adatáramlás, hibakezelés és validáció

A rendszer frontend és backend része szoros, de jól elkülönített együttműködésben működik. A frontend minden adatot a backend API-n keresztül kér le vagy módosít, így az üzleti szabályok tényleges érvényesítése minden kritikus műveletnél szerveroldalon történik.

### 5.3.1 API-kommunikáció a frontendben

A frontend API-hívásai a `src/services/api.js` fájlban koncentrálódnak. Ez a réteg egységes wrapperként működik a `fetch` fölött.

Fő feladatai:
- a backend alap URL-jének kezelése,
- az útvonalak összeillesztése,
- a JSON kérésküldés egységesítése,
- az Authorization fejléc automatikus hozzáadása,
- a válaszok feldolgozása,
- a hibás státuszkódok egységes hibává alakítása.

A megvalósítás előnye, hogy az oldalak nem közvetlenül alacsony szintű hálózati kóddal dolgoznak, hanem egy kompakt, újrafelhasználható API interfészen keresztül. Ez csökkenti a duplikációt, és könnyebbé teszi az egységes hibakezelést is.

### 5.3.2 Adatáramlás tipikus felhasználói folyamatokban

A rendszerben több visszatérő adatáramlási minta figyelhető meg.

**Példa: bejelentkezés**
1. a felhasználó kitölti a bejelentkezési űrlapot;
2. a frontend `POST /api/auth/login` kérést küld;
3. a backend hitelesíti a felhasználót és tokent ad vissza;
4. a frontend eltárolja a tokent és a felhasználói adatokat;
5. az auth kontextus frissül, az alkalmazás privát nézetre vált.

**Példa: verseny létrehozása**
1. a felhasználó kitölti a verseny konfigurációját;
2. a frontend elküldi a konfigurációs payloadot;
3. a backend validálja a beállításokat;
4. létrejön a verseny és szükség esetén a kategóriák is;
5. a frontend az új verseny nézetére navigál.

**Példa: eredményrögzítés**
1. a felhasználó megadja a szetteket egy mérkőzéshez;
2. a frontend `PATCH /api/matches/:matchId/result` kérést küld;
3. a backend ellenőrzi a szettek érvényességét;
4. a mérkőzés állapota és győztese frissül;
5. a kapcsolódó standings nézet újratöltve már az új állást mutatja.

Ez az adatáramlási modell jól mutatja, hogy a frontend elsődlegesen prezentációs és vezérlési szerepet tölt be, míg a domainlogika döntő része a backendben található.

### 5.3.3 Validáció: kliensoldali és szerveroldali szerepek

A validáció két szinten valósul meg.

**Kliensoldali validáció** főként a felhasználói élmény javítását szolgálja. Ide tartozik:
- kötelező mezők ellenőrzése,
- alapvető űrlapkonszisztenica,
- ObjectId formátumellenőrzés útvonalparaméterekben,
- értelmetlen navigációs műveletek megelőzése.

**Szerveroldali validáció** ezzel szemben tényleges védelmi és üzleti szerepet tölt be. A backend ellenőrzi:
- a request body szerkezetét,
- a route és query paraméterek helyességét,
- az ObjectId-k validitását,
- az ownership viszonyt,
- az adott művelet állapot szerinti megengedhetőségét,
- a versenyszabályoknak megfelelő eredményformátumot.

A két szint együttműködése azért lényeges, mert a frontendből érkező adatok soha nem tekinthetők teljesen megbízhatónak.

### 5.3.4 Hibakezelés

A hibakezelés a rendszer mindkét oldalán fontos megvalósítási szempont volt.

A frontend API-rétege igyekszik minden hibás választ értelmezhető JavaScript hibává alakítani. Ha a backend JSON hibaválaszt ad, a felhasználó számára megjeleníthető hibaüzenet a válaszból kerül kiolvasásra. Ha a szerver nem megfelelő formátumú választ küld, a kliens külön hibát generál erre is.

A frontend oldalon a központi API-réteg a backendtől érkező hibákat egy fordító modulon keresztül magyar nyelvű, konzisztens üzenetekké alakítja. Ez különösen fontos olyan műveleteknél, mint a meccsindítás, az eredményrögzítés vagy a lezárt versenyek állapotkezelése.

A backend oldalon a route-ok több helyen explicit védelmet tartalmaznak:
- hibás azonosítók esetén kontrollált hiba,
- nem létező erőforrás esetén megfelelő státuszkód,
- jogosulatlan hozzáférés esetén tiltás,
- nem megengedett állapotváltás esetén üzleti hiba.

A fejlesztés során különösen fontossá vált, hogy egy hibás kliensoldali navigáció vagy egy rossz paraméterű kérés ne okozzon szerveroldali összeomlást. Ennek megfelelően a későbbi javítások során megerősítésre került a route-paraméterek validációja és az invalid azonosítók kezelése.

### 5.3.5 Ownership és adatizoláció

Az integráció egyik kritikus eleme az ownership alapú adatizoláció. A rendszerben gyakorlatilag minden versenyhez kötött végpont azon az elven működik, hogy a hitelesített felhasználó csak a saját versenyeihez tartozó rekordokat láthatja és módosíthatja.

Ez több rétegben valósul meg:
- a token alapján azonosított felhasználó bekerül a kérésbe,
- a route az ownership szerviz vagy közvetlen lekérdezés segítségével ellenőrzi a tulajdonjogot,
- a kapcsolódó entitások műveletei is a versenyen keresztül szűrve történnek.

Ez a megoldás egyszerű, de a projekt céljaihoz jól illeszkedik, és egyértelműen támogatja a többfelhasználós használatot anélkül, hogy komplex szerepkörmodellt kellene bevezetni.

### 5.3.6 Bemutatási és fejlesztési integráció

A megvalósítás részeként létrejött egy olyan demo seed mechanizmus is, amely lehetővé teszi egy előre ismert tesztfelhasználó és több feltöltött verseny automatikus létrehozását. Ez nem csupán kényelmi funkció, hanem a rendszer bemutathatóságának fontos eleme.

Ennek köszönhetően:
- a fejlesztés reprodukálható adatkészlettel végezhető,
- a fő nézetek és üzleti folyamatok azonnal kipróbálhatók,
- a konzulensi vagy bizottsági bemutató előtt nem szükséges manuálisan felépíteni a demoállapotot.

Ez a megoldás jól illeszkedik a rendszer teljes implementációs szemléletéhez, amely a manuális adminisztráció csökkentésére törekszik.

## 5.4 A megvalósítás összegzése

A rendszer megvalósítása során a tervezett architektúra lényegében érvényesült. A backendben a route–service–model felosztás világosan elkülöníti a kéréskezelést, az üzleti logikát és a perzisztenciát. A frontend oldalon a saját routerre, auth kontextusra és oldalanként elkülönített nézetekre épülő szerkezet támogatja az adminisztratív használatot.

A megvalósítás erőssége, hogy a rendszer nem pusztán adatrekordok kezelésére alkalmas, hanem a verseny lebonyolításának több kulcsfontosságú lépését is ténylegesen automatizálja. Ide tartozik a sorsolás, az állásszámítás, a továbbjutás, a playoff és az ütemezés támogatása. Ezt egészíti ki a naplózás, az export és a demo seedelés, amelyek a rendszer gyakorlati használhatóságát tovább erősítik.

**Javasolt ábrahelyek:**  
*5.1. ábra – A backend route–service–model szerkezete*  
*5.2. ábra – A frontend fő nézetei és navigációs kapcsolataik*  
*5.3. ábra – Példa adatáramlás: eredményrögzítés és standings frissítés*

# 6. Tesztelés és validáció

A rendszer fejlesztése során a tesztelés célja nem pusztán az volt, hogy az egyes képernyők megjelennek-e, hanem az is, hogy a versenykezeléshez kapcsolódó üzleti logikák helyesen és reprodukálható módon működnek-e. Mivel a projekt több, egymásra épülő funkcionális területből áll – például hitelesítés, sorsolás, állásszámítás, playoff generálás, ütemezés, export és audit –, ezért a validáció több szinten történt.

A tesztelés során három fő megközelítés jelent meg:
- automatizált logikai és smoke jellegű ellenőrzések,
- integrációs szemléletű végponttesztek,
- manuális, felhasználói folyamatokra épülő végponttól végpontig történő kipróbálás.

A fejezet célja annak bemutatása, hogy a rendszer fő követelményei milyen módon kerültek ellenőrzésre, milyen tipikus és szélsőséges eseteket kellett kezelni, illetve milyen következtetések vonhatók le a jelenlegi implementáció megbízhatóságáról.

## 6.1 Tesztstratégia

### 6.1.1 A tesztelés célja

A tesztelési stratégia kialakításakor az elsődleges szempont az volt, hogy a rendszer legfontosabb üzleti folyamatai ellenőrizhetők legyenek. Egy ilyen alkalmazás esetében nem elegendő pusztán az egyes CRUD műveletek kipróbálása, mert a fő értéket azok a logikák adják, amelyek:
- a mérkőzéseket generálják,
- az eredményeket validálják,
- a csoportállást kiszámítják,
- a továbbjutókat meghatározzák,
- a playoff ágat felépítik,
- a mérkőzéseket ütemezik.

A tesztelés tehát erősen követelményvezérelt módon történt: minden lényeges funkcióhoz olyan ellenőrzés készült, amelyből megállapítható, hogy az adott követelmény teljesül-e.

### 6.1.2 Tesztszintek

A megvalósított tesztelési megközelítés három egymást kiegészítő szintből áll.

**1. Logikai és szolgáltatási szintű ellenőrzések**

Ezen a szinten a fókusz a kulcsalgoritmusokon volt. Ide tartozott például:
- round robin párosítási logika,
- standings és tie-break számítás,
- playoff párosítási logika,
- ütemezési szabályok ellenőrzése,
- badminton eredményvalidáció.

Ezek az ellenőrzések különösen fontosak, mert a rendszer szakmai helyessége döntően ezeken múlik.

**2. Integrációs és smoke tesztek**

A második szint a backend végpontok és az egymásra épülő üzleti lépések ellenőrzésére szolgált. Ezek a tesztek tipikusan nem egyetlen függvény helyességét vizsgálják, hanem teljes folyamatokat, például:
- felhasználó létrehozása és hitelesítés,
- verseny és kategóriák létrehozása,
- játékosok felvitele,
- sorsolásgenerálás,
- eredményrögzítés,
- standings lekérdezés,
- playoff felépítése,
- globális schedule generálása.

A smoke tesztek célja annak ellenőrzése volt, hogy a rendszer fő működési útvonalai nem törtek el egy-egy módosítás után.

**3. Manuális végponttól végpontig tesztelés**

A harmadik szintet a frontendből végzett kézi tesztelés jelentette. Ennek során a tényleges felhasználói munkafolyamatok kerültek kipróbálásra:
- regisztráció,
- bejelentkezés,
- új verseny létrehozása,
- kategóriák konfigurálása,
- játékosok rögzítése,
- check-in,
- meccsek generálása,
- eredményfelvitel,
- állások megtekintése,
- playoff szakasz ellenőrzése,
- export és board nézet használata.

Ez a szint azért volt különösen fontos, mert egy adminisztratív rendszer használhatósága nem pusztán a backend logika helyességén múlik, hanem azon is, hogy a felhasználó értelmes sorrendben, hibamentesen tudja-e végrehajtani a szükséges műveleteket.

### 6.1.3 Demo seed mint tesztelési eszköz

A tesztelési stratégia részeként létrejött egy demo seed mechanizmus is, amely ismert tesztfelhasználóval és előre feltöltött, eltérő állapotú versenyekkel tölti fel az adatbázist. Ez a megoldás két okból is hasznos:

- reprodukálható kiindulóállapotot biztosít a manuális és félautomatikus tesztekhez;
- lehetővé teszi, hogy a rendszer demonstrációs célra gyorsan újraépíthető legyen.

A seedelt adatkészlet különösen jól használható volt olyan nézetek tesztelésére, ahol egyszerre kellett kész, futó és még függő állapotú objektumokat ellenőrizni.

### 6.1.4 Validációs szemlélet

A validáció nem csak azt jelentette, hogy a rendszer „nem dob hibát”, hanem azt is, hogy a visszaadott eredmény szakmailag helyes-e. Ennek megfelelően a tesztelés során az alábbi kérdésekre kellett választ adni:

- A generált párosítások helyesek és duplikációmentesek-e?
- A standings valóban a szabályok szerinti sorrendet adja-e?
- A playoff a megfelelő játékosokkal épül-e fel?
- A hibás eredmények tényleg visszautasításra kerülnek-e?
- A hibás vagy nem létező azonosítók nem okoznak-e összeomlást?
- A felhasználó kizárólag a saját adatait éri-e el?

Ez a megközelítés közelebb áll a validációhoz, mint a puszta hibakereséshez, mert a cél a rendszer követelményeknek való megfelelésének igazolása volt.

## 6.2 Tesztesetek a követelményekhez kötve

A következőkben a legfontosabb tesztesetek kerülnek összefoglalásra. A felsorolás nem a teljes technikai tesztkészlet minden részletét mutatja be, hanem a rendszer szempontjából legfontosabb, követelményhez kapcsolt ellenőrzéseket.

### TC-01 Regisztráció és bejelentkezés

**Kapcsolódó követelmények:** FR-01, AC-01

**Kiinduló állapot:**  
A rendszerben nincs a megadott e-mail címmel felhasználó.

**Tesztlépések:**  
1. Új felhasználó regisztrációja.  
2. Bejelentkezés a létrehozott adatokkal.  
3. Az aktuális felhasználói állapot lekérdezése.  

**Elvárt eredmény:**  
- A rendszer létrehozza a felhasználót.  
- A bejelentkezés sikeres.  
- A kliens hitelesítési tokent kap.  
- Az aktuális felhasználó adatai lekérdezhetők.  

### TC-02 Jelszómódosítás

**Kapcsolódó követelmények:** FR-01, AC-01

**Kiinduló állapot:**  
Hitelesített felhasználó létezik.

**Tesztlépések:**  
1. A felhasználó megadja a jelenlegi jelszót és új jelszót.  
2. A frontend elküldi a jelszómódosítási kérést.  
3. Bejelentkezés az új jelszóval.  

**Elvárt eredmény:**  
- Hibátlan jelenlegi jelszó esetén a módosítás sikeres.  
- A régi jelszóval a belépés sikertelen.  
- Az új jelszóval a belépés sikeres.  

### TC-03 Verseny létrehozása és listázása

**Kapcsolódó követelmények:** FR-02, AC-02

**Kiinduló állapot:**  
Hitelesített felhasználó létezik.

**Tesztlépések:**  
1. Új verseny létrehozása konfigurációs adatokkal.  
2. A versenylista lekérdezése.  
3. A részletes versenynézet megnyitása.  

**Elvárt eredmény:**  
- A verseny mentésre kerül.  
- A lista tartalmazza az új versenyt.  
- A részletes nézetben a megadott alapadatok helyesen jelennek meg.  

### TC-04 Kategória létrehozása és módosítása

**Kapcsolódó követelmények:** FR-03, AC-02

**Kiinduló állapot:**  
Létező verseny áll rendelkezésre.

**Tesztlépések:**  
1. Új kategória létrehozása adott formátummal.  
2. A kategória paramétereinek módosítása.  
3. A módosított kategória újralekérdezése.  

**Elvárt eredmény:**  
- A kategória létrejön.  
- A módosított paraméterek mentésre kerülnek.  
- A lekért adatok a módosított állapotot tükrözik.  

### TC-05 Játékosok felvitele és nevezési szinkron

**Kapcsolódó követelmények:** FR-04, AC-03

**Kiinduló állapot:**  
Létező verseny és kategória áll rendelkezésre.

**Tesztlépések:**  
1. Több játékos felvétele a kategóriához.  
2. Nevezési rekordok létrehozása vagy szinkronizálása.  
3. A nevezések listázása.  

**Elvárt eredmény:**  
- A játékosok elmentődnek.  
- A hiányzó nevezések létrejönnek.  
- A rendszer tárolja a nevezéshez kapcsolódó adminisztratív adatokat.  

### TC-06 Check-in és draw lezárás

**Kapcsolódó követelmények:** FR-05, AC-03, AC-04

**Kiinduló állapot:**  
Egy kategóriában több benevezett játékos szerepel.

**Tesztlépések:**  
1. A részt vevő játékosok check-in státuszának beállítása.  
2. A draw lezárása.  
3. A generált csoportok és meccsek lekérdezése.  

**Elvárt eredmény:**  
- Csak a check-inelt, érvényes indulók kerülnek bele a fő mezőnybe.  
- A kategória állapota lezárttá válik.  
- A szükséges csoportok és mérkőzések létrejönnek.  

### TC-07 Round robin párosítás helyessége

**Kapcsolódó követelmények:** FR-06, AC-04

**Kiinduló állapot:**  
A kategóriában ismert számú játékos szerepel.

**Tesztlépések:**  
1. A rendszer legenerálja a csoportkörös mérkőzéseket.  
2. A párosítások listája ellenőrzésre kerül.  

**Elvárt eredmény:**  
- Nincs önmagával játszó játékos.  
- Nincs duplikált párosítás.  
- A mérkőzésszám megfelel a konfigurációnak.  
- Csonka round robin esetén a terhelés közel egyenletes.  

### TC-08 Eredményrögzítés és mérkőzéslezárás

**Kapcsolódó követelmények:** FR-08, AC-06

**Kiinduló állapot:**  
Létező pending vagy running mérkőzés áll rendelkezésre.

**Tesztlépések:**  
1. A felhasználó szettekre bontott eredményt rögzít.  
2. A backend elvégzi a szabályalapú validációt.  
3. A mérkőzés új állapotának lekérdezése.  

**Elvárt eredmény:**  
- A helyes formátumú eredmény mentésre kerül.  
- A mérkőzés állapota `finished` lesz.  
- A győztes mező kitöltődik.  

### TC-09 Hibás eredmény visszautasítása

**Kapcsolódó követelmények:** FR-08, NFR-05, AC-10

**Kiinduló állapot:**  
Létező mérkőzés áll rendelkezésre.

**Tesztlépések:**  
1. A felhasználó hibás szettállást küld, például szabálytalan pontkülönbséggel vagy túl sok szettel.  

**Elvárt eredmény:**  
- A backend a kérést visszautasítja.  
- Nem történik hibás állapotmentés.  
- A kliens értelmezhető hibaüzenetet kap.  

### TC-10 Standings számítás és tie-break

**Kapcsolódó követelmények:** FR-09, AC-06, AC-07

**Kiinduló állapot:**  
Egy csoportban több kész mérkőzés szerepel.

**Tesztlépések:**  
1. A standings végpont meghívása.  
2. A visszakapott sorrend összevetése az elvárt tie-break logikával.  

**Elvárt eredmény:**  
- A sorrend a konfigurált szabályok szerint alakul ki.  
- Kétfős holtversenynél az egymás elleni eredmény érvényesül.  
- Több szereplős holtversenynél a mini-tábla logika használódik.  

### TC-11 Playoff generálása

**Kapcsolódó követelmények:** FR-10, AC-07, AC-08

**Kiinduló állapot:**  
A csoportkör standings adatai rendelkezésre állnak.

**Tesztlépések:**  
1. A továbbjutók kiválasztása.  
2. A playoff ág generálása.  
3. A generált mérkőzések ellenőrzése.  

**Elvárt eredmény:**  
- A megfelelő számú továbbjutó kerül kiválasztásra.  
- A rendszer seedelt párosításokat hoz létre.  
- A playoff szakasz megjeleníthető és nyomon követhető.  

### TC-12 Playoff-only kategória kezelése

**Kapcsolódó követelmények:** FR-03, FR-10, AC-08

**Kiinduló állapot:**  
Playoff-only formátumú kategória létezik.

**Tesztlépések:**  
1. A játékosok rögzítése.  
2. Az első kör generálása.  
3. Az előző körök eredménye alapján következő kör létrehozása.  

**Elvárt eredmény:**  
- A rendszer csoportkör nélkül is képes teljes playoff működésre.  
- A továbbjutók és következő körök helyesen épülnek fel.  

### TC-13 Csoportszintű ütemezés

**Kapcsolódó követelmények:** FR-07, AC-05

**Kiinduló állapot:**  
Több pending mérkőzés létezik egy csoportban.

**Tesztlépések:**  
1. Az ütemezés generálása adott pályaszámmal és pihenőidőkkel.  
2. A kiosztott kezdési idők és pályák ellenőrzése.  

**Elvárt eredmény:**  
- Minden ütemezett mérkőzés pályát és időpontot kap.  
- A játékosok között a minimális pihenőidő érvényesül.  
- A pályák időben nem fedik egymást.  

### TC-14 Globális schedule több kategóriára

**Kapcsolódó követelmények:** FR-07, AC-05

**Kiinduló állapot:**  
Több kategóriában vannak pending mérkőzések.

**Tesztlépések:**  
1. A globális schedule végpont meghívása.  
2. Az eredmény ellenőrzése kategóriák közötti eloszlás szempontjából.  

**Elvárt eredmény:**  
- A rendszer nem kizárólag egy kategóriát szolgál ki.  
- A kiosztás használható, kiegyensúlyozott eredményt ad.  

### TC-15 Board nézet és nyilvános végpont

**Kapcsolódó követelmények:** FR-11

**Kiinduló állapot:**  
A versenyben vannak futó és közelgő mérkőzések.

**Tesztlépések:**  
1. A board végpont vagy board oldal megnyitása.  
2. A megjelenített meccsek ellenőrzése.  

**Elvárt eredmény:**  
- A futó és közelgő mérkőzések külön kezelhetők.  
- A pályaszám, játékosnevek és releváns státuszadatok láthatók.  

### TC-16 Audit naplózás

**Kapcsolódó követelmények:** FR-12, AC-09

**Kiinduló állapot:**  
Történnek adminisztratív műveletek.

**Tesztlépések:**  
1. Verseny, kategória vagy eredmény módosítása.  
2. Az auditnaplók lekérdezése.  

**Elvárt eredmény:**  
- A rendszer naplózza a fontos eseményeket.  
- A naplórekordok visszakereshetők a megfelelő versenyhez.  

### TC-17 Export funkciók

**Kapcsolódó követelmények:** FR-13, AC-09

**Kiinduló állapot:**  
A versenyhez léteznek játékos-, mérkőzés- és standings adatok.

**Tesztlépések:**  
1. CSV export végpont meghívása.  
2. A kapott kimenet ellenőrzése.  

**Elvárt eredmény:**  
- A rendszer letölthető CSV tartalmat ad vissza.  
- Az export szerkezete feldolgozható és konzisztens.  

### TC-18 Hibás azonosítók és nem létező objektumok kezelése

**Kapcsolódó követelmények:** FR-14, NFR-05, AC-10

**Kiinduló állapot:**  
A kliens hibás vagy nem létező azonosítóval próbál kérni erőforrást.

**Tesztlépések:**  
1. Érvénytelen `tournamentId`, `categoryId` vagy `matchId` használata.  
2. Az API válasz és a frontend viselkedés megfigyelése.  

**Elvárt eredmény:**  
- A backend kontrollált hibaválaszt ad.  
- A szerver nem omlik össze.  
- A frontend nem hagyja értelmetlen állapotban a felhasználót.  

### TC-19 Ownership ellenőrzés

**Kapcsolódó követelmények:** FR-01, NFR-05

**Kiinduló állapot:**  
Két különböző felhasználó létezik eltérő versenyekkel.

**Tesztlépések:**  
1. Az egyik felhasználó megpróbálja lekérni vagy módosítani a másik erőforrását.  

**Elvárt eredmény:**  
- A rendszer a hozzáférést megtagadja.  
- Idegen versenyek adatai nem érhetők el.  

### TC-20 Demo seed és bemutathatóság

**Kapcsolódó követelmények:** AC-11

**Kiinduló állapot:**  
Üres vagy törölt demo adatbázis.

**Tesztlépések:**  
1. A demo seed futtatása.  
2. Bejelentkezés az ismert tesztfelhasználóval.  
3. A fő adminisztratív oldalak végigellenőrzése.  

**Elvárt eredmény:**  
- A demo user és a demo versenyek létrejönnek.  
- A rendszer bemutatási környezetben azonnal használható.  

### TC-21 Pályaütközés tiltása meccsindításkor

**Kapcsolódó követelmények:** FR-08, FR-14, AC-05, AC-10

**Kiinduló állapot:**  
Az egyik pályán már fut egy mérkőzés, ugyanarra a pályára pedig létezik egy másik, még nem indított mérkőzés.

**Tesztlépések:**  
1. Egy futó mérkőzés mellett megpróbálni elindítani egy másik mérkőzést ugyanazon a pályán.  

**Elvárt eredmény:**  
- A backend a műveletet visszautasítja.  
- A második mérkőzés nem kerül `running` állapotba.  

### TC-22 Játékosütközés tiltása meccsindításkor

**Kapcsolódó követelmények:** FR-08, FR-14, AC-05, AC-10

**Kiinduló állapot:**  
Az egyik játékos már szerepel egy futó mérkőzésben.

**Tesztlépések:**  
1. Megkísérelni elindítani egy másik olyan mérkőzést, amelyben ugyanaz a játékos szerepel.  

**Elvárt eredmény:**  
- A backend a műveletet visszautasítja.  
- Egy játékos egyszerre csak egy futó mérkőzésben szerepelhet.  

### TC-23 Ütemezetlen mérkőzés indításának tiltása

**Kapcsolódó követelmények:** FR-08, FR-14, AC-10

**Kiinduló állapot:**  
Létezik olyan pending mérkőzés, amelyhez nincs pályaszám vagy időpont rendelve.

**Tesztlépések:**  
1. Megpróbálni a mérkőzést `running` állapotba tenni.  

**Elvárt eredmény:**  
- A backend a műveletet visszautasítja.  
- Csak ténylegesen beütemezett mérkőzés indítható el.  

### TC-24 Lezárt verseny eredményzárolása és feloldása

**Kapcsolódó követelmények:** FR-15, AC-12

**Kiinduló állapot:**  
A verseny állapota `finished`, az eredményjavítás zárolt.

**Tesztlépések:**  
1. Megpróbálni egy lezárt verseny meccsének eredményét módosítani.  
2. Adminisztrátori művelettel feloldani az eredményjavítási zárolást.  
3. Újra megpróbálni az eredmény módosítását.  
4. A javítás után visszazárni a lezárt versenyt.  

**Elvárt eredmény:**  
- Feloldás nélkül a módosítás tiltott.  
- Feloldás után a javítás elvégezhető.  
- Visszazárás után a további módosítás ismét tiltott.  

### TC-25 Fizetési csoport és nevezések szinkronja

**Kapcsolódó követelmények:** FR-04, AC-03

**Kiinduló állapot:**  
Több nevezés ugyanahhoz a fizetési csoporthoz tartozik, és a csoport kezdetben nincs befizetve.

**Tesztlépések:**  
1. A fizetési csoportot befizetettre állítani.  
2. A fizetési módot megadni vagy módosítani.  
3. A kapcsolódó nevezések listáját újralekérdezni.  

**Elvárt eredmény:**  
- A csoport befizetett állapotba kerül.  
- A fizetési mód mentésre kerül.  
- A kapcsolódó nevezések `paid` mezői is frissülnek.  
- A kapcsolódó nevezések fizetési módja konzisztensen kezelhető.
## 6.3 Edge case-ek és kritikus helyzetek

A rendszer egyik legfontosabb minőségi szempontja, hogy ne csak tipikus bemenetek mellett működjön helyesen. A tollaslabda versenykezelésben több olyan speciális helyzet fordulhat elő, amely külön kezelést igényel. Ezek közül a legfontosabbak az alábbiak.

### TC-26 Automatikus játékvezetői rotáció

**Kapcsolódó követelmények:** FR-07, AC-05, AC-13

**Kiinduló állapot:**  
A versenyhez több játékvezető tartozik, és több pending mérkőzés vár ütemezésre.

**Tesztlépések:**  
1. A globális ütemezés futtatása bekapcsolt játékvezetői rotációval.  
2. Az ütemezett mérkőzések játékvezető mezőinek ellenőrzése.  
3. A játékvezetők terhelésének és pihenőidejének vizsgálata.  

**Elvárt eredmény:**  
- A rendszer a mérkőzésekhez játékvezetőt rendel, ha rendelkezésre áll játékvezetői lista.  
- A kiosztás nem mindig ugyanazt a játékvezetőt választja.  
- A minimális játékvezetői pihenőidő figyelembevételre kerül.  
- Játékvezetői lista hiányában a funkció nem okoz hibát, csak nem rendel játékvezetőt.

### TC-27 Dinamikus becsült idő újraszámítása

**Kapcsolódó követelmények:** FR-07, AC-05, AC-13

**Kiinduló állapot:**  
A versenyben vannak futó, befejezett és pending mérkőzések. A tényleges kezdési és befejezési idők eltérhetnek az eredeti ütemezéstől.

**Tesztlépések:**  
1. Egyes mérkőzések tényleges állapotának módosítása futó vagy befejezett állapotra.  
2. A dinamikus becsült időfrissítés indítása.  
3. A pending mérkőzések új kezdési időpontjainak ellenőrzése.  

**Elvárt eredmény:**  
- A rendszer a még várakozó mérkőzések becsült kezdési idejét frissíti.  
- Az újraszámítás figyelembe veszi a pályák foglaltságát.  
- Az újraszámítás figyelembe veszi a játékosok minimális pihenőidejét.  
- A funkció nem módosítja a már befejezett mérkőzések eredményét vagy státuszát.

### 6.3.1 Páratlan létszám és BYE

Páratlan számú játékos esetén a klasszikus round robin generálás virtuális BYE pozíciót igényel. Az ellenőrzés során biztosítani kellett, hogy:
- ne jöjjön létre felesleges tényleges mérkőzés a BYE miatt,
- a játékosok terhelése ne torzuljon indokolatlanul,
- a generált lista csak valós párosításokat tartalmazzon.

Ez az eset különösen fontos, mert amatőr versenyeken a résztvevőszám gyakran nem páros.

### 6.3.2 Csonka round robin nagyobb mezőnynél

Nagyobb játékosszám esetén a teljes körmérkőzés túl sok meccset eredményezne. Emiatt szükséges volt ellenőrizni:
- minden játékos a konfigurált számú meccset kapja-e meg,
- nincs-e duplikált párosítás,
- a terhelés megfelelően kiegyensúlyozott-e.

Ez a validáció nemcsak helyességi, hanem gyakorlati szempontból is fontos, mert egy rosszul kiegyensúlyozott részleges párosítás sportszakmai szempontból kifogásolható lenne.

### 6.3.3 Holtversenyek különböző esetei

A standings logika tesztelésének egyik legnehezebb része a holtversenyek kezelése volt. Külön vizsgálni kellett:
- két játékos egymás elleni eredmény alapján eldönthető holtversenyét,
- több játékos körbeverés jellegű holtversenyét,
- olyan helyzetet, ahol a mini-tábla után is szükség van további tie-break feltételekre,
- fel nem oldható holtversenyt.

Ezek a helyzetek különösen jól mutatják, hogy a rendszernek nemcsak egyszerű sorbarendezést, hanem szabályalapú rangsorolást kell megvalósítania.

### 6.3.4 Utólagos eredménymódosítás

Valós versenyhelyzetben előfordulhat, hogy egy már rögzített eredményt javítani kell. Ilyenkor ellenőrizni kellett:
- a mérkőzés állapota és győztese helyesen frissül-e,
- a standings újraszámítása megtörténik-e,
- a későbbi logikai lépések nem maradnak-e inkonzisztens állapotban.

Ez a szempont azért lényeges, mert egy adminisztratív rendszerben a hibajavítás lehetősége gyakran elkerülhetetlen.

### 6.3.5 Visszalépés és walkover

A visszalépések kezelése különösen kritikus, mert nem csak egyetlen rekordot érint. A vizsgálat során fontos szempont volt, hogy:
- a még le nem játszott meccsek megfelelően kezelődjenek,
- a standings ne torzuljon indokolatlanul,
- a rendszer a választott policy szerint működjön.

Különösen jelentős edge case, amikor a visszalépés már részben lejátszott csoportkörben történik, és a rendszernek el kell döntenie, hogy a korábbi eredmények megmaradnak-e.

### 6.3.6 Hibás navigáció és nem létező kontextus

A frontend fejlesztése során konkrét problémaforrás volt, hogy a felhasználó el tudott jutni olyan útvonalakra, ahol még nem létezett tényleges verseny- vagy kategóriakontextus. Ebből olyan helyzetek adódtak, amikor a kliens `new` vagy más érvénytelen értéket adott át az API-nak.

Ennek kezelése során külön ellenőrizni kellett:
- a sidebar kontextusérzékeny működését,
- a kliensoldali route-validációt,
- a backend ObjectId validációját,
- azt, hogy a hibás kérés nem dönti le a szervert.

Ez a tesztelési terület jól mutatta, hogy a használhatósági és stabilitási hibák gyakran nem az algoritmusokban, hanem a képernyők közötti átmenetekben jelennek meg.

### 6.3.7 Pálya- és játékosütközések

A mérkőzések életciklusának egyik kritikus speciális esete, amikor a szervező vagy a felület hibás sorrendben próbál meccset indítani. A jelenlegi rendszerben külön vizsgálni kellett, hogy:
- ugyanazon a pályán egyszerre ne futhasson két mérkőzés,
- ugyanaz a játékos ne szerepelhessen párhuzamosan két futó meccsben,
- ütemezetlen mérkőzés ne indulhasson el.

Ezek a szabályok azért fontosak, mert az ütemezésből önmagában még nem következik automatikusan, hogy a futó állapotba váltás üzletileg helyes. A védelemnek ezért backend oldalon is érvényesülnie kell.

### 6.3.8 Játékvezetői ütközés és terhelés

A játékvezetői rotáció bevezetése után külön ellenőrzési szemponttá vált, hogy a rendszer ne osszon be indokolatlanul túl sűrűn ugyanazt a játékvezetőt. A vizsgálat során fontos szempont volt:
- a minimális játékvezetői pihenőidő betartása,
- a játékvezetői terhelés közel egyenletes elosztása,
- annak kezelése, ha nincs megadott játékvezetői lista,
- annak kezelése, ha a játékvezetői lista kevés a teljes menetrendhez képest.

Ez az edge case azért fontos, mert a játékvezetői rotáció nem lehet erősebb kényszer, mint maga a mérkőzésütemezés. Ha nincs elegendő játékvezető, a rendszernek kontrolláltan kell viselkednie, nem pedig hibás állapotot létrehoznia.

### 6.3.9 Lezárt verseny utólagos korrekciója

Külön edge case-ként jelent meg a lezárt versenyek eredményeinek javítása. Teljes tiltás esetén a rendszer túl merev, korlátlan szerkeszthetőség esetén viszont sérül a lezárt állapot jelentése. A jelenlegi megoldás egy köztes modellt alkalmaz: a verseny lezárása után az eredmények zároltak, de adminisztratív feloldással ideiglenesen javíthatók.

### 6.3.10 Hibás vagy hiányos azonosítók

Kritikus ellenőrzési pont volt, hogy a backend hogyan viselkedik hibás vagy hiányzó azonosítók esetén. A cél az volt, hogy:
- ne jöjjön létre Mongoose cast hiba miatti szerverösszeomlás,
- a válasz státuszkód és üzenet alapján egyértelmű legyen,
- a kliens a hiba után is használható állapotban maradjon.

Ez a fajta tesztelés a robusztusság egyik közvetlen mérőszáma.

### 6.3.11 Demo adatkészlet és bemutatási állapot

A rendszer demonstrációs használatára tekintettel külön edge case-nek tekinthető, hogy az adatbázis üres vagy nem megfelelő állapotban van. Ennek megoldására szolgál a demo seed, amely:
- ismert felhasználót hoz létre,
- több, eltérő állapotú versenyt készít,
- lehetővé teszi a fő felhasználói folyamatok azonnali kipróbálását.

Ez nem klasszikus üzleti edge case, de a projekt értékelhetősége és bemutathatósága szempontjából mégis kulcsfontosságú.

## 6.4 A tesztelés eredményeinek összegzése

A végrehajtott tesztek alapján megállapítható, hogy a rendszer fő funkcionális követelményei teljesülnek. A backend képes kezelni a versenyek, kategóriák, játékosok és mérkőzések teljes alapvető életciklusát, valamint a csoportkörös és playoff alapú lebonyolítás fő logikáit is.

Különösen erős területek:
- a round robin és standings logika,
- a playoff generálás,
- a konfigurálható eredményvalidáció,
- a több kategóriára kiterjedő ütemezési támogatás,
- a játékvezetői rotáció támogatása,
- a dinamikus becsült időfrissítés,
- a pálya- és játékosütközések backend oldali kivédése,
- a lezárt versenyek kontrollált eredményjavítási mechanizmusa,
- a fizetési csoportok, fizetési módok és nevezések szinkronizált kezelése,
- az audit és export funkciók,
- a demo adatkészletre épülő bemutathatóság.
A tesztelés során feltárt hibák közül több a rendszer stabilitását és felhasználói folyamatainak következetességét érintette, nem magukat a fő versenyalgoritmusokat. Ilyen volt például a nem létező versenykontextusra történő hibás kliensoldali navigáció. Ezek a hibák rávilágítottak arra, hogy egy adminisztratív rendszer minőségét nemcsak az üzleti logika helyessége, hanem a hibás felhasználói útvonalak kezelése is jelentősen befolyásolja.

Összességében a validáció eredménye azt mutatja, hogy a rendszer szakdolgozati keretek között egy működőképes, reprodukálhatóan tesztelhető és demonstrálható prototípusnak tekinthető, amely a fő követelmények döntő részét teljesíti.

**Javasolt ábrahelyek:**  
*6.1. ábra – Tesztelési stratégia: logikai, integrációs és manuális szintek*  
*6.2. ábra – Példa tesztfolyamat: check-in → draw lezárás → standings → playoff*  
*6.3. ábra – Hibás azonosító kezelése a frontend és backend együttműködésében*

# 7. Összegzés, eredmények, korlátok és továbbfejlesztési lehetőségek

A szakdolgozat célja egy olyan webalapú tollaslabda versenykezelő rendszer megtervezése és megvalósítása volt, amely képes támogatni a versenyek adminisztratív előkészítését, a lebonyolítás közbeni operatív feladatokat, valamint az eredmények és állapotok kezelését. A fejlesztés során a hangsúly nem egy általános sportinformatikai platform létrehozásán volt, hanem egy konkrét, jól körülhatárolt domainprobléma megoldásán: amatőr és kisebb szervezésű tollaslabda versenyek támogatásán.

A dolgozatban bemutatott rendszer ennek megfelelően olyan funkciókat valósít meg, amelyek a versenyszervezés legfontosabb lépéseit fedik le. 
A megoldás képes:
- felhasználók hitelesítésére és elkülönített versenykezelésére,
- versenyek és kategóriák létrehozására,
- játékosok és nevezések kezelésére,
- fizetési állapotok, fizetési módok és fizetési csoportok nyilvántartására,
- check-in alapú tényleges mezőnyképzésre,
- csoportkörös mérkőzések generálására,
- részleges round robin lebonyolítás támogatására,
- mérkőzéseredmények szettekre bontott rögzítésére,
- standings számításra és holtversenyek feloldására,
- továbbjutók meghatározására,
- playoff ág generálására és követésére,
- mérkőzések ütemezésére,
- játékvezetők automatikus rotációjára,
- hátralévő mérkőzések becsült kezdési idejének frissítésére,
- nyilvános board nézet biztosítására,
- auditnaplózásra és CSV exportokra.

## 7.1 Az elért eredmények összefoglalása

A fejlesztés eredményeként létrejött egy működőképes, többmodulos rendszer, amely a frontend–backend–adatbázis felosztásnak megfelelően, réteges architektúrában épül fel. A megoldás egyik legfontosabb eredménye, hogy nem pusztán adatbeviteli felületként működik, hanem több kulcsfontosságú versenylogikát is automatizál.

Kiemelt eredménynek tekinthető, hogy a rendszerben önálló, külön szolgáltatási modulokban valósulnak meg:
- a round robin és csonka round robin párosítások,
- a badminton szabályok szerinti eredményvalidáció,
- a standings és tie-break logika,
- a továbbjutási és playoff mechanizmus,
- a pályákhoz és időkhöz kötött ütemezés.

Ez különösen fontos, mert a versenykezelő rendszerek valós értékét általában nem az egyszerű CRUD műveletek, hanem az összetettebb domainlogikák adják. A jelen rendszer ezen a téren működőképes megoldást nyújt.

Szintén fontos eredmény a reprodukálható demo seed kialakítása. Ez fejlesztési, tesztelési és bemutatási szempontból egyaránt előnyös, mivel lehetővé teszi, hogy a rendszer ismert belépési adatokkal és előre előállított, eltérő állapotú versenyekkel azonnal kipróbálható legyen.

A rendszer jelenlegi állapotában alkalmas arra, hogy szakdolgozati demonstráció keretében bemutassa a fő adminisztratív folyamatokat, és szemléltesse a tollaslabda versenykezeléshez kapcsolódó legfontosabb üzleti logikákat.

## 7.2 A rendszer erősségei

A megoldás egyik fő erőssége a domainfókusz. A rendszer nem próbál minden sportágat vagy minden versenytípust általánosan kezelni, hanem egy konkrét sportág logikájára koncentrál. Emiatt több olyan részlet megjelenhetett benne, amely általános versenyszervező eszközökben vagy hiányzik, vagy csak részben támogatott.

További erősség a moduláris szerkezet. A backendben a route–service–model rétegződés, a frontendben pedig a nézetek és közös komponensek elkülönítése javítja a karbantarthatóságot. Ez a szerkezet lehetővé teszi, hogy új funkciók vagy módosítások később célzottan, a teljes rendszer átírása nélkül kerüljenek be.

A rendszer gyakorlati használhatóságát erősíti az is, hogy figyelmet kapott a hibakezelés, az ownership ellenőrzés és a hibás navigációk kezelése. Ez azért fontos, mert egy adminisztratív rendszerben a tényleges használhatóságot jelentősen ronthatja, ha a felhasználó könnyen inkonzisztens vagy értelmetlen állapotba tudja vinni az alkalmazást.

Szintén pozitívumnak tekinthető az auditnapló és az exportfunkciók megjelenése. Ezek nem a rendszer alapműködésének feltételei, mégis jelentősen növelik a gyakorlati értékét.

## 7.3 Korlátok és hiányosságok

A rendszer bár működőképes, nem tekinthető teljes körű, általános célú versenyplatformnak. A szakdolgozati keretekből, valamint a fejlesztési prioritásokból következően több területen tudatos egyszerűsítés történt.

Az egyik legfontosabb korlát a jogosultságkezelés egyszerűsége. A jelenlegi modell elsősorban tulajdonosi szintű elkülönítést biztosít, de nem támogat összetett szerepköröket, például külön versenyadminisztrátori, játékvezetői vagy csak megtekintési jogosultságú felhasználói szerepeket.

Korlátként jelenik meg az is, hogy a rendszer elsődlegesen helyi vagy fejlesztői környezetben futtatott alkalmazásként készült. Bár a hosztolás technikailag megoldható lenne, ez nem képezte a dolgozat elsődleges fókuszát. Emiatt a jelenlegi változat inkább prototípus- és demonstrációs használatra optimalizált.

A lebonyolítási logikák terén is vannak határok. A round robin, standings és playoff támogatás erős, ugyanakkor a rendszer nem kezel minden lehetséges speciális versenyformát. Nem célja például:
- teljes vigaszágas rendszer kezelése,
- páros vagy vegyes páros specifikus szabályok teljes körű modellezése,
- többfordulós, országos kvalifikációs struktúrák kezelése.

A felhasználói felület bár funkcionális, jelenleg inkább adminisztratív használatra optimalizált, nem pedig végső, széles körben terjeszthető termékszintű UX-megoldásként készült. Egyes nézetek tovább egyszerűsíthetők, illetve vizuálisan egységesíthetők lennének.

Végül a dokumentumexport tekintetében is van hiányosság: a jelenlegi rendszer CSV exportot biztosít, de hivatalosabb, nyomtatható PDF-alapú dokumentumgenerálás még nem része a kész implementációnak.

## 7.4 Továbbfejlesztési lehetőségek

A rendszer jelenlegi felépítése jó alapot nyújt több jövőbeli bővítéshez. Ezek közül az egyik legfontosabb irány a jogosultságkezelés fejlesztése lehet. Célszerű lenne külön szerepkörök bevezetése, például:
- szervező,
- adminisztrátor,
- játékvezető,
- csak olvasási jogosultságú felhasználó.

További fontos fejlesztési irány lehet a felhasználói felület finomítása. Ide tartozhat:
- még intuitívabb navigáció,
- mobilbarátabb megjelenítés,
- vizuálisan fejlettebb bracket nézet,
- jobban strukturált dashboard,
- gyorsabb adminisztratív műveleti útvonalak.

A versenylogika oldalán további lehetőséget jelentene:
- összetettebb seeding rendszer,
- fejlettebb visszalépéskezelés,
- teljes vigaszág támogatása,
- páros és vegyes páros versenyszámok teljesebb kezelése,
- fejlettebb, több szempontot figyelembe vevő játékvezetői és pályakihasználási optimalizáció.
- A dinamikus időbecslés jelenlegi formájában adminisztrátori művelettel indítható újraszámítás, nem pedig valós idejű, automatikusan futó háttérfolyamat. Ez tudatos egyszerűsítés, mert a szakdolgozati rendszer célja az átlátható és kontrollált lebonyolítás támogatása, nem egy teljesen autonóm menetrendvezérlő rendszer létrehozása.

Jelentős bővítési irány lehet a dokumentumkezelés és export fejlesztése is. A CSV export mellett célszerű lenne:
- PDF alapú sorsolási és eredménylapok,
- nyomtatható meccslapok,
- hivatalos eredményösszesítők,
- közvetlen nyomtatási sablonok előállítása.

A rendszer bemutathatóságát és gyakorlati használhatóságát tovább javítaná:
- egyszerű hosztolt demóverzió,
- automatikus demo reset,
- publikus megosztható board linkek,
- nyilvános vagy félpublikus eredményhirdető nézet,
- importfunkciók külső táblázatokból.

Hosszabb távon akár olyan integrációs lehetőségek is megjelenhetnének, mint:
- e-mail alapú értesítések,
- külső nevezési űrlapokból történő adatbeolvasás,
- online eredményközlő felület,
- több versenyhelyszín kezelése.

## 7.5 Személyes és szakmai tanulságok

A fejlesztés egyik legfontosabb tanulsága az volt, hogy egy látszólag egyszerű versenykezelő rendszer mögött jelentős mennyiségű üzleti szabály és speciális eset húzódik meg. A projekt előrehaladtával egyre világosabbá vált, hogy a tényleges nehézséget nem az alapvető adatműveletek, hanem az állapotváltozások, a különböző lebonyolítási helyzetek és a hibás felhasználói útvonalak kezelése jelenti.

Szakmai szempontból a projekt jól szemléltette, hogy egy teljesebb webalkalmazás fejlesztése során a frontend és backend közötti összhang legalább olyan fontos, mint az egyes rétegek külön-külön történő helyes implementációja. Több hiba is abból adódott, hogy egy önmagában logikus frontend viselkedés a backend felől hibás kontextusban értelmeződött. Ezek a helyzetek rámutattak arra, hogy a robusztusság a rendszer egészének tulajdonsága, nem csupán egyetlen komponensé.

A projekt emellett gyakorlati tapasztalatot adott:
- REST API tervezésben,
- Mongoose alapú adatmodellezésben,
- React alapú adminfelületek kialakításában,
- domain-specifikus algoritmusok megvalósításában,
- reprodukálható tesztelés és demoállapot kialakításában.

## 7.6 Záró összegzés

Összességében megállapítható, hogy a dolgozatban bemutatott rendszer elérte a kitűzött alapcélt: létrejött egy olyan működőképes, webalapú tollaslabda versenykezelő alkalmazás, amely képes támogatni a versenyek szervezésének és lebonyolításának több kulcsfontosságú lépését.

A rendszer legfontosabb szakmai eredménye, hogy a domainben lényeges automatizmusokat – csoportkör-generálás, standings számítás, tie-break kezelés, playoff felépítés és ütemezés – egységes alkalmazásba integrálja. Bár a megoldás jelenlegi formájában még nem tekinthető teljes körű, végleges terméknek, szakdolgozati keretek között jól használható, érdemi eredményt képviselő és továbbfejleszthető alkalmazásként értelmezhető.

A projekt így nemcsak egy konkrét szoftvertermék létrehozását jelentette, hanem annak bemutatását is, hogy egy valós problématerületre hogyan lehet informatikai megközelítéssel, strukturált tervezéssel és fokozatos fejlesztéssel működő megoldást készíteni.

**Javasolt ábrahelyek:**  
*7.1. ábra – A megvalósult funkciók és a jövőbeli fejlesztési irányok összefoglalása*  
*7.2. ábra – A rendszer jelenlegi hatóköre és a bővítési lehetőségek kapcsolata*
