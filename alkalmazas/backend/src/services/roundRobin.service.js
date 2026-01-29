export function generateRoundRobinPairs(players) {
    const uniquePlayers = [...new Set(players.map(p => p.toString()))];
    const matches = [];

    for (let i = 0; i < uniquePlayers.length; i++) {
        for (let j = i + 1; j < uniquePlayers.length; j++) {
            matches.push({
                player1: uniquePlayers[i],
                player2: uniquePlayers[j]
            });
        }
    }

    return matches;
}
