function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function recommendMatchesPerPlayer(n) {
    if (n <= 6) return n - 1;   // full RR
    if (n <= 10) return 5;
    if (n <= 14) return 6;
    return 6; // 15-20 default; ha belefér, lehet 7-8 is később
}

function buildCircleRounds(playerIds) {
    const ids = [...playerIds];
    // párosítás előtt randomizálunk (admin ne tudja “kiválasztani”)
    shuffleInPlace(ids);

    // odd -> BYE (null)
    if (ids.length % 2 === 1) ids.push(null);

    const n = ids.length;
    const half = n / 2;
    const roundsCount = n - 1;

    let arr = [...ids];
    const rounds = [];

    for (let r = 0; r < roundsCount; r++) {
        const pairs = [];
        for (let i = 0; i < half; i++) {
            const a = arr[i];
            const b = arr[n - 1 - i];
            if (a && b) {
                pairs.push({ player1: a, player2: b, roundNumber: r + 1 });
            }
            // ha a vagy b null -> BYE, nem generálunk meccset
        }
        rounds.push(pairs);

        // rotate all but first
        arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
    }
    return rounds;
}

// Odd n + partial: BYE fairness miatt csinálunk "m-regular" párosítást (m legyen páros!)
function buildOddRegularPairs(playerIds, matchesPerPlayer) {
    const ids = [...playerIds];
    shuffleInPlace(ids);

    const n = ids.length;
    const m = matchesPerPlayer;

    if (m >= n) throw new Error('matchesPerPlayer must be <= n-1');
    if (m % 2 === 1) throw new Error('Odd player count requires even matchesPerPlayer');

    const seen = new Set();
    const out = [];

    // circulant offsets: k = 1..m/2
    for (let k = 1; k <= m / 2; k++) {
        for (let i = 0; i < n; i++) {
            const j = (i + k) % n;
            const a = String(ids[i]);
            const b = String(ids[j]);
            const key = a < b ? `${a}_${b}` : `${b}_${a}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ player1: a, player2: b, roundNumber: null });
        }
    }
    return out;
}

export function generatePartialRoundRobin(players, matchesPerPlayer) {
    const unique = [...new Set(players.map(p => String(p)))];
    const n = unique.length;
    if (n < 2) return [];

    let m = Math.min(matchesPerPlayer, n - 1);

    // full RR: körmérkőzés
    if (m === n - 1) {
        const rounds = buildCircleRounds(unique);
        return rounds.flat();
    }

    // even n: első m forduló (m meccs/fő, BYE nélkül)
    if (n % 2 === 0) {
        const rounds = buildCircleRounds(unique);
        return rounds.slice(0, m).flat();
    }

    // odd n: BYE elkerülése -> m legyen páros
    if (m % 2 === 1) m = Math.max(2, m - 1);
    return buildOddRegularPairs(unique, m);
}