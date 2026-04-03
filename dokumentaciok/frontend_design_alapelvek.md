# Frontend design alapelvek

A frontend kialakításánál az elsődleges cél nem egy látványos, animációkkal teli felület létrehozása, hanem egy gyors, stabil és könnyen kezelhető adminisztrációs rendszer megvalósítása.

A rendszer használati környezete miatt különösen fontos, hogy a felület verseny közben is megbízhatóan működjön. Emiatt a frontend kialakításánál kerülni kell a felesleges vizuális effekteket, erőforrásigényes animációkat és minden olyan megoldást, amely lassíthatja a használatot vagy zavarhatja a gyors adminisztrációt.

A felület alapelvei a következők:

- legyen letisztult és egyszerű
- legyen gyors és alacsony erőforrásigényű
- legyen jól átlátható stresszhelyzetben is
- legyen intuitív, vagyis a felhasználó gyorsan értse, hol jár és mi a következő lépés
- a fontos műveletek legyenek jól láthatóak
- a veszélyes vagy visszafordíthatatlan műveletek legyenek egyértelműen elkülönítve
- a megjelenés legyen egységes, kevés színnel és következetes komponensekkel

A frontend tehát inkább egy modern, letisztult admin dashboard jellegét kövesse, ne pedig egy látványos marketingoldal vagy animációközpontú alkalmazás vizuális világát.

## Vizuális irányelvek

A rendszer vizuális megjelenésénél a cél az egyszerűség és az olvashatóság.

Ennek megfelelően:
- világos háttér és jól olvasható sötét szöveg legyen
- egy fő hangsúlyszín legyen használatban a teljes felületen
- a státuszok külön jelölést kapjanak
- a táblázatok, kártyák és adminisztratív blokkok jól elkülönüljenek
- a navigáció legyen egyszerű és egyértelmű

A túlzott díszítés, sokféle szín használata és a túl sűrű vizuális elemek rontanák a használhatóságot, ezért ezeket kerülni kell.

## Animációk használata

A felületen csak minimális animációk használata indokolt.

Elfogadható lehet például:
- gombok enyhe hover állapota
- modális ablakok finom megjelenése
- betöltési jelzés
- sikeres vagy hibás műveletek visszajelzése

Nem cél:
- nagy mozgó elemek használata
- látványos átmenetek
- folyamatos animációk
- minden kattintásnál hosszú vizuális effekt

A rendszer elsődleges feladata az adminisztráció támogatása, nem pedig a vizuális élmény maximalizálása.

## Használhatósági alapelvek

A frontend akkor tekinthető jónak, ha a felhasználó mindig gyorsan meg tudja állapítani:
- melyik versenyben dolgozik
- melyik kategóriában van
- milyen oldalon jár
- mi a következő logikus lépés

Ezért fontos:
- egyértelmű oldalfejlécek használata
- követhető navigáció
- szükség esetén breadcrumb
- jól elkülönülő műveleti gombok
- világos státuszjelzések

A legfontosabb műveletek, például a draw finalizálása, az ütemezés futtatása, az eredmény mentése vagy a playoff generálása mindig jól látható helyen legyenek.

A veszélyes műveleteket, például törlés, újragenerálás, lezárás vagy felülírás, vizuálisan is el kell különíteni a normál műveletektől.

## Kontextusérzékeny szakmai segítség

A rendszer egyik fontos kényelmi és szakmai eleme legyen, hogy a nem egyértelmű konfigurációs mezők és beállítások mellett információs ikon jelenjen meg.

Az ikonra kattintva vagy hoverre rövid, közérthető, de szakmailag pontos magyarázat jelenjen meg arról, hogy az adott beállítás:
- mit jelent
- mire szolgál
- mikor érdemes használni
- milyen hatása lesz a verseny lebonyolítására

Ez különösen hasznos lehet például az alábbi esetekben:
- csonka round robin meccsszám
- tie-break policy
- playoff méret
- nevezési díj beállítása
- játékvezetők használata
- check-inhez kapcsolódó döntések
- ütemezési paraméterek

A cél az, hogy a felhasználónak ne kelljen külön dokumentációban keresgélnie, hanem a szakmai segítség közvetlenül az adott mező mellett jelenjen meg.

## Összefoglalás

A frontend tervezése során a legfontosabb szempontok a következők:

- gyorsaság
- stabil működés
- alacsony erőforrásigény
- egyszerű, letisztult megjelenés
- könnyű kezelhetőség
- szakmai magyarázatokkal támogatott konfiguráció

A frontend tehát egy olyan adminisztrációs felületként készül, amely a döntnök és a versenyszervező napi munkáját támogatja, nem pedig egy látványcentrikus, vizuálisan túlterhelt alkalmazásként.
