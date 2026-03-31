# Összefoglaló a rendszer jelenlegi állapotáról és a felmerült szakmai kérdésekre adott válaszokról

Szia!

Összefoglalom röviden, hogy mire jutottam a rendszerrel kapcsolatban, illetve a felmerült kérdésekre milyen megoldást választottam.

## 1. Csonka round robin

Az első fontos téma a csonka round robin volt, ezért ezt részletesebben is kifejtem.

A klasszikus round robin, vagyis teljes körmérkőzés lényege az, hogy **mindenki játszik mindenkivel**. Ez akkor adja a legpontosabb sorrendet, mert minden résztvevő ugyanazzal a mezőnnyel találkozik. Ennek viszont az a hátránya, hogy nagyobb létszámnál nagyon sok mérkőzés keletkezik, ami amatőr vagy iskolai versenyen gyakran túl hosszú lebonyolítást jelentene.

Az én rendszeremben ezért nem minden esetben teljes round robin van, hanem lehet **csonka round robin** is. Ez azt jelenti, hogy **nem minden játékos játszik mindenkivel**, hanem mindenki csak egy előre meghatározott számú csoportmeccset kap. Tehát nem a teljes párosításkészlet kerül lejátszásra, hanem csak annak egy része.

A megoldás mögötti gondolat az, hogy számomra a cél nem az, hogy például egy 10–12 fős mezőnyben teljes pontossággal meg lehessen mondani, ki lett a 9., 10. vagy 11. helyezett, hanem az, hogy:
- reálisan ki lehessen választani a továbbjutókat,
- vagy megbízhatóan meg lehessen határozni a legjobb 4–6 játékost,
- majd velük playoffot lehessen játszatni.

Vagyis ez egy **tudatos kompromisszum**:
- kevesebb mérkőzés,
- gyorsabb lebonyolítás,
- kisebb pálya- és időigény,
- cserébe nem a teljes mezőnyre ad tökéletesen részletes erősorrendet.

Ez a gyakorlatban azt jelenti, hogy a rendszer nem arra optimalizál, hogy a mezőny végén lévő helyezések között is teljes bizonyossággal különbséget tegyen, hanem arra, hogy a mezőny elejét, vagyis a továbbjutókat megfelelően el tudja választani.

Fontos az is, hogy ez **nem svájci rendszer**. A svájci rendszerben a következő fordulók párosításai mindig az addigi eredmények alapján készülnek el. Az én megoldásomban ezzel szemben a párosítások **előre generálódnak**, tehát nem fordulóról fordulóra, az aktuális állás szerint készülnek. Emiatt ez nem Swiss, hanem egy előre meghatározott, részleges round robin megoldás.

A rendszer működése röviden így foglalható össze:
- kis létszámnál továbbra is használható teljes körmérkőzés,
- nagyobb mezőnynél részleges körmérkőzés fut,
- ebből kialakul egy csoportsorrend,
- majd a legjobbak playoffba vagy következő fordulóba jutnak.

Ez különösen olyan esetekben hasznos, mint például:
- diákolimpián 10 játékosból 5 továbbjuttatása,
- házi versenyen a top 4 kiválasztása,
- nagyobb amatőr kategóriában a továbbjutók meghatározása úgy, hogy a verseny ne húzódjon el indokolatlanul.

Összefoglalva tehát a csonka round robin nálam nem a teljes erősorrend tökéletes meghatározására szolgál, hanem arra, hogy **kezelhető mennyiségű meccsből, reális idő alatt, használható továbbjutási sorrend jöjjön létre**. Ez a rendszer céljához jobban illeszkedik, mint a mindenki-mindenki-ellen modell minden helyzetben történő erőltetése.

## 2. Támogatott versenyformátumok

A rendszer most már több formátumot is támogat:

- sima csoportkörös kategória,
- csoportkör + playoff,
- csak playoff, tehát eleve egyenes kieséses kategória.

A playoff résznél már nem csak a korábbi szűkebb megoldás működik, hanem nagyobb ágak is támogatottak, és a bronzmeccs is kötelezően létrejön, tehát az elődöntők vesztesei le tudják játszani a 3. helyért a mérkőzést.

## 3. Több kategória közötti pályabeosztás

A pályabeosztásnál az volt a kérdés, hogyan osztja el a rendszer több kategória között a pályákat.

Ennél az volt a döntésem, hogy nem akarok kategóriaprioritást, hanem a cél az egyenletes elosztás.

Ennek megfelelően a globális scheduler:
- a teljes versenyt együtt nézi,
- figyeli a szabad pályákat,
- figyeli a játékosok pihenőidejét,
- és próbálja egyenletesen elosztani a meccseket a kategóriák között.

Ebben a részben most nem tervezek további módosítást.

## 4. Tie-break szabályok a csoportkörben

A csoporton belüli tie-break kérdésnél fontos felvetés volt a 3-as körbeverés.

Ezt a részt átdolgoztam. A rendszerben most már kategóriánként beállítható, hogy 3 vagy több fős holtversenynél:

- csak az egymás elleni mini-tabella számítson,
- vagy először a mini-tabella számítson, és ha az sem dönt, akkor az összes csoportmeccs statisztikái alapján dőljön el a sorrend.

Ha minden sportági szempont után is marad döntetlen, akkor:
- vagy közös helyezés adható,
- vagy kézi döntés szükséges.

## 5. Nevezési díj kezelése

Felmerült a nevezési díj kezelése is.

Ezt nem online fizetési rendszerként valósítottam meg, hanem adminisztratív nyilvántartásként.

Tehát a rendszer nem banki tranzakciókat kezel, hanem azt tudja vezetni, hogy:
- van-e nevezési díj,
- mennyi az összeg,
- ki fizette be,
- mi a számlázási név és cím,
- illetve azt is, ha például egy egyesület egy összegben fizeti be több játékos nevezését.

Ez kifejezetten nyilvántartási célú funkció, nem tényleges fizetési modul.

## 6. Szerepkörök pontosítása

A szerepköröknél pontosítottam a megnevezéseket is.

A rendszer technikai oldalán továbbra is admin felhasználó van, de a versenylogikában ezt a szerepet döntnökként, illetve versenyszervezőként értelmezem.

Emellett bekerült a játékvezetői szerep is a mérkőzésekhez, tehát egy meccshez külön megadható játékvezető.

Adogatásbíróval és vonalbíróval nem számolok, mert amatőr versenykörnyezetben ezek jellemzően nincsenek jelen.

## 7. Kijelzős / TV-s nézet backend alapja

További fejlesztésként bekerült egy olyan backend végpont is, amely egy későbbi kijelzős vagy TV-s nézetet tud kiszolgálni.

Ez arra lesz jó, hogy a futó és a következő meccsek külön oldalon megjeleníthetők legyenek, így a játékosok láthatják, mikor és hol játszanak, és nem kell ezt folyamatosan külön megkérdezniük.

## 8. Mi készült el ebben a fejlesztési körben?

Összességében tehát a mostani fejlesztési körben a backend oldalon elkészültek a fő logikai bővítések:

- többféle versenyformátum kezelése,
- playoff és bronzmeccs kezelése,
- konfigurálható tie-break szabályok,
- nevezési díj adminisztratív nyilvántartása,
- döntnök / játékvezető szerepkörök pontosítása,
- későbbi kijelzős nézet backend alapja.

Ezekre automatizált teszteket is készítettem, és a teljes smoke tesztkör sikeresen lefutott.

## 9. Következő lépés

A következő lépés már a frontend oldali bekötés és a kezelőfelület bővítése lesz.
