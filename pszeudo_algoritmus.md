# Meccskijelölő Algoritmus – Pszeudokód és Folyamatlogika

Ez a dokumentum a tollaslabda-verseny lebonyolító rendszerhez tervezett meccsgeneráló algoritmus pszeudokódját és működési logikáját tartalmazza.
Az algoritmus csoportkörben és egyenes kiesésben is használható.

---

## 1. Alapelvek

- Minden alverseny (pl. U17 Fiú Egyéni, U15 Lány, Vegyes Páros stb.) külön egységként van kezelve.
- Minden alverseny **közös pályakészletet** használ – nincs dedikált pálya.
- Bíró használata opcionális: konfiguráció dönti el, hogy kötelező-e.
- **Minden játékosnak van:**
  - ID, klub
  - eddigi ellenfelek listája
  - utolsó meccs ideje
- **Minden bírónál:**
  - ID
  - utolsó meccs ideje
- **Minden pálya:**
  - ID, foglaltsági állapot

---

## 2. Csoportkör – Meccsgeneráló Greedy Algoritmus

### 2.1 Általános folyamat

A rendszer addig generál meccseket, amíg:
- van elérhető pálya,
- van két olyan játékos, akik megfelelnek minden feltételnek.

A csoportkör egy gombnyomással újrasorsolható.

---

### 2.2 Pszeudokód

#### 2.2.1 Csoportkör generálás

```pseudo
function generateGroupStageMatches(groupPlayers, config):
    matches = []
    availablePlayers = groupPlayers.filter(p => !p.alreadyScheduled)
    shuffledPlayers = randomShuffle(availablePlayers)

    for playerA in shuffledPlayers:
        if playerA.alreadyScheduled:
            continue

        opponent = findOpponentFor(playerA, shuffledPlayers, config)
        if opponent == null:
            continue

        court = findAvailableCourt()
        if court == null:
            break

        referee = null
        if config.refereeRequired:
            referee = findAvailableReferee(config)

        matches.append({
            "court": court.id,
            "playerA": playerA.id,
            "playerB": opponent.id,
            "referee": referee?.id
        })

        markPlayerScheduled(playerA, opponent)
        occupyCourt(court)
        if referee exists:
            assignReferee(referee)

    return matches
```

#### 2.2.2 Ellenfélválasztás feltételei

```pseudo
function findOpponentFor(playerA, players, config):
    for playerB in players:
        if playerB == playerA:
            continue
        if playerB.alreadyScheduled:
            continue

        if timeSinceLastMatch(playerA) < config.minRestPlayer:
            continue

        if timeSinceLastMatch(playerB) < config.minRestPlayer:
            continue

        if havePlayedBefore(playerA, playerB):
            continue

        if sameClub(playerA, playerB) and config.avoidSameClubEarly:
            continue

        return playerB

    return null
```

#### 2.2.3 Bíró kezelése (opcionális)

```pseudo
function findAvailableReferee(config):
    if config.refereeRequired == false:
        return null

    for referee in allReferees:
        if timeSinceLastMatch(referee) >= config.minRestReferee:
            return referee

    return null
```

---

## 3. Egyenes Kiesés – Párosítás és Meccskiosztás

```pseudo
function scheduleKnockoutRound(players):
    sortedPlayers = seedOrRank(players)
    pairs = pairConsecutively(sortedPlayers)  # pl. 1-8, 2-7, stb.

    for (A, B) in pairs:
        court = findAvailableCourt()
        referee = findAvailableReferee(optional)
        createMatch(A, B, court, referee)
```

---

## 4. Körbeverés kezelése (pontarány alapján)

```pseudo
function resolveTie(players):
    for player in players:
        player.pointRatio = pointsScored(player) / pointsLost(player)

    return sortDescending(players by pointRatio)
```

---

## 5. Folyamatábra (szöveges)

```text
          ┌────────────────────────┐
          │  START: Csoportkör     │
          └─────────────┬──────────┘
                        │
            ┌───────────▼───────────┐
            │ Játékos kiválasztása  │
            └───────────┬───────────┘
                        │
            ┌───────────▼───────────┐
            │ Pihenőidő rendben?    │─No→ Skip
            └───────────┬───────────┘
                        │Yes
            ┌───────────▼───────────┐
            │ Ellenfél keresése     │
            │ (pihenőidő,           │
            │ nem játszottak együtt,│
            │ klub ellenőrzés)      │
            └───────────┬───────────┘
                        │Success
                        ▼
            ┌────────────────────────┐
            │ Elérhető pálya?        │─No→ STOP
            └───────────┬───────────┘
                        │Yes
            ┌───────────▼───────────┐
            │ Bíró kell?            │
            │   ├Igen→ keresés      │
            │   └Nem → mehet tovább │
            └───────────┬───────────┘
                        │
            ┌───────────▼──────────┐
            │  Meccs létrehozása   │
            └───────────┬──────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Következő meccs │
               └─────────────────┘
```

---

## 6. Konfigurálható paraméterek

| Paraméter | Leírás |
| :--- | :--- |
| `minRestPlayer` | Minimum pihenőidő játékosnak (pl. 20 perc) |
| `minRestReferee` | Minimum pihenőidő bírónak (pl. 10 perc) |
| `avoidSameClubEarly` | Klubon belüli meccsek kerülése (true/false) |
| `refereeRequired` | Kell-e bíró a meccshez (true/false) |
| `allowReshuffle` | Újrasorsolás engedélyezése |
| `poolSize` | Csoport mérete |

---

## 7. Célok

* Random, de szabályvezérelt párosítás
* Greedy alapú meccsgenerálás
* Közös pályakezelés több kategória között
* Klubon belüli és ismételt meccsek elkerülése
* Körbeverés kezelés pontaránnyal
* Bírórendszer opcionális
