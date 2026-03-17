import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

let j;


async function main() {
    const auth = await createAuthContext('CONFIG');
    j = (method, path, body, expectedStatus = null) => auth.j(method, path, body, expectedStatus === null ? {} : { expectedStatus });
    const invalidTournament = await j('POST', '/api/tournaments', {
        name: `BAD-RULES-${Date.now()}`,
        config: {
            matchRules: { bestOf: 3, pointsToWin: 11, winBy: 2, cap: 10 }
        }
    }, 400);
    assert.match(invalidTournament.error, /cap/i);

    const t = await j('POST', '/api/tournaments', {
        name: `CONFIG-VALID-${Date.now()}`,
        config: {
            matchRules: { bestOf: 5, pointsToWin: 11, winBy: 2, cap: 15 },
            estimatedMatchMinutes: 30,
            minRestPlayerMinutes: 15,
            courtsCount: 3,
            avoidSameClubEarly: true
        }
    });
    assert.equal(t.config.matchRules.bestOf, 5);
    assert.equal(t.config.estimatedMatchMinutes, 30);
    assert.equal(t.config.courtsCount, 3);
    assert.equal(t.config.avoidSameClubEarly, true);

    const invalidCategory = await j('POST', '/api/categories', {
        tournamentId: t._id,
        name: 'BAD-CAT',
        format: 'group+playoff',
        groupSizeTarget: 8,
        groupsCount: 1,
        qualifiersPerGroup: 3
    }, 400);
    assert.match(invalidCategory.error, /qualifiersPerGroup must be 2 or 4/i);

    const validCategory = await j('POST', '/api/categories', {
        tournamentId: t._id,
        name: 'GOOD-CAT',
        format: 'group+playoff',
        groupSizeTarget: 8,
        groupsCount: 1,
        qualifiersPerGroup: 4
    });
    assert.equal(validCategory.qualifiersPerGroup, 4);

    const configureName = `CONFIGURE-ROLLBACK-${Date.now()}`;
    const invalidConfigure = await j('POST', '/api/tournaments/configure', {
        tournament: {
            name: configureName,
            config: {
                matchRules: { bestOf: 1, pointsToWin: 11, winBy: 2, cap: 15 }
            }
        },
        categories: [
            {
                name: 'BROKEN-CAT',
                format: 'group+playoff',
                groupSizeTarget: 8,
                groupsCount: 1,
                qualifiersPerGroup: 3
            }
        ]
    }, 400);
    assert.match(invalidConfigure.error, /qualifiersPerGroup/i);

    const tournaments = await j('GET', '/api/tournaments');
    const rolledBack = tournaments.find(x => x.name === configureName);
    assert.equal(rolledBack, undefined);

    console.log('OK: config validation smoke passed');
    console.log({
        tournamentId: t._id,
        validCategoryId: validCategory._id,
        rollbackVerified: true
    });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
