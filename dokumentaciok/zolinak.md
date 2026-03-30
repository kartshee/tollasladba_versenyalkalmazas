Szia!

Összefoglalom röviden, hogy mire jutottam a rendszerrel kapcsolatban, illetve a felmerült kérdésekre milyen megoldást választottam.

Az első fontos téma a csonka round robin volt. Ennek a lényege nálam az, hogy nem minden játékos játszik mindenkivel, hanem mindenki csak egy előre meghatározott számú csoportmeccset kap. Ezt azért választottam, mert a cél nem az, hogy például 10-12 fős mezőnynél teljes pontossággal megmondjuk, ki lett a 9., 10. vagy 11. helyezett, hanem az, hogy reálisan ki lehessen választani a továbbjutókat vagy a legjobb 4-6 játékost. Tehát ez tudatos kompromisszum: kevesebb meccs, gyorsabb lebonyolítás, de továbbra is használható sorrend a továbbjutók meghatározásához. Kis létszámnál továbbra is működhet teljes körmérkőzés, nagyobb mezőnynél pedig a részleges körmérkőzésből lehet továbbjutókat képezni, majd playoffot játszatni.

A rendszer most már több formátumot is támogat. Van sima csoportkörös kategória, van csoportkör plusz playoff, és van olyan kategória is, ahol eleve csak egyenes kieséses ág van. A playoff résznél már nem csak a korábbi szűkebb megoldás működik, hanem nagyobb ágak is támogatottak, és a bronzmeccs is kötelezően létrejön, tehát az elődöntők vesztesei le tudják játszani a 3. helyért a mérkőzést.

A pályabeosztásnál az volt a kérdés, hogyan osztja el a rendszer több kategória között a pályákat. Ennél az volt a döntésem, hogy nem akarok kategóriaprioritást, hanem a cél az egyenletes elosztás. Ennek megfelelően a globális scheduler a teljes versenyt együtt nézi, figyeli a szabad pályákat, a játékosok pihenőidejét, és próbálja egyenletesen elosztani a meccseket a kategóriák között. Ebben a részben most nem tervezek további módosítást.

A csoporton belüli tie-break kérdésnél fontos felvetés volt a 3-as körbeverés. Ezt a részt átdolgoztam. A rendszerben most már kategóriánként beállítható, hogy 3 vagy több fős holtversenynél csak az egymás elleni mini-tabella számítson, vagy először a mini-tabella számítson, és ha az sem dönt, akkor az összes csoportmeccs statisztikái alapján dőljön el a sorrend. Emellett a név szerinti döntést teljesen kivettem, tehát ilyen már nincs. Ha minden sportági szempont után is marad döntetlen, akkor vagy közös helyezés adható, vagy kézi döntés szükséges.

Felmerült a nevezési díj kezelése is. Ezt nem online fizetési rendszerként valósítottam meg, hanem adminisztratív nyilvántartásként. Tehát a rendszer nem banki tranzakciókat kezel, hanem azt tudja vezetni, hogy van-e nevezési díj, mennyi az összeg, ki fizette be, mi a számlázási név és cím, illetve azt is, ha például egy egyesület egy összegben fizeti be több játékos nevezését. Ez kifejezetten nyilvántartási célú funkció, nem tényleges fizetési modul.

A szerepköröknél pontosítottam a megnevezéseket is. A rendszer technikai oldalán továbbra is admin felhasználó van, de a versenylogikában ezt a szerepet döntnökként, illetve versenyszervezőként értelmezem. Emellett bekerült a játékvezetői szerep is a mérkőzésekhez, tehát egy meccshez külön megadható játékvezető. Adogatásbíróval és vonalbíróval nem számolok, mert amatőr versenykörnyezetben ezek jellemzően nincsenek jelen.

További fejlesztésként bekerült egy olyan backend végpont is, amely egy későbbi kijelzős vagy TV-s nézetet tud kiszolgálni. Ez arra lesz jó, hogy a futó és a következő meccsek külön oldalon megjeleníthetők legyenek, így a játékosok láthatják, mikor és hol játszanak, és nem kell ezt folyamatosan külön megkérdezniük.

Összességében tehát a mostani fejlesztési körben a backend oldalon elkészültek a fő logikai bővítések: a többféle versenyformátum, a playoff és bronzmeccs kezelése, a konfigurálható tie-break szabályok, a nevezési díj adminisztratív nyilvántartása, a döntnök/játékvezető szerepkörök pontosítása, valamint a későbbi kijelzős nézet backend alapja. Ezekre automatizált teszteket is készítettem, és a teljes smoke tesztkör sikeresen lefutott.

A következő lépés már a frontend oldali bekötés és a kezelőfelület bővítése lesz.
