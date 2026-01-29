export function isValidSet(p1, p2) {
    // típusellenőrzés
    if (!Number.isInteger(p1) || !Number.isInteger(p2)) {
        return false;
    }

    // negatív pont kizárása
    if (p1 < 0 || p2 < 0) {
        return false;
    }

    const max = Math.max(p1, p2);
    const min = Math.min(p1, p2);

    if (max < 21) return false;
    if (max > 30) return false;

    if (max === 30) {
        return min === 29;
    }

    return (max - min) >= 2;
}



export function determineMatchWinner(sets, player1, player2) {
    let p1Sets = 0;
    let p2Sets = 0;

    sets.forEach(s => {
        if (s.p1 > s.p2) p1Sets++;
        else p2Sets++;
    });

    if (p1Sets === 2) return player1;
    if (p2Sets === 2) return player2;

    return null;
}
