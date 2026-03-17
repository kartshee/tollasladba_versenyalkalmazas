import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

async function main() {
    const adminA = await createAuthContext('AUTHA');
    const adminB = await createAuthContext('AUTHB');

    const meA = await adminA.j('GET', '/api/auth/me');
    assert.equal(meA.user.email, adminA.user.email);
    assert.equal(meA.user.role, 'admin');

    const tA = await adminA.j('POST', '/api/tournaments', { name: `AUTH-A-${Date.now()}` });
    const tB = await adminB.j('POST', '/api/tournaments', { name: `AUTH-B-${Date.now()}` });

    const listA = await adminA.j('GET', '/api/tournaments');
    const listB = await adminB.j('GET', '/api/tournaments');

    assert(listA.some((x) => String(x._id) === String(tA._id)), 'owner A should see own tournament');
    assert(!listA.some((x) => String(x._id) === String(tB._id)), 'owner A should not see B tournament');
    assert(listB.some((x) => String(x._id) === String(tB._id)), 'owner B should see own tournament');
    assert(!listB.some((x) => String(x._id) === String(tA._id)), 'owner B should not see A tournament');

    const hidden = await adminB.j('GET', `/api/tournaments/${tA._id}`, null, { expectedStatus: 404 });
    assert.match(hidden.error, /not found/i);

    const cA = await adminA.j('POST', '/api/categories', {
        tournamentId: tA._id,
        name: 'AUTH-CAT',
        groupSizeTarget: 4,
        groupsCount: 1,
        format: 'group'
    });
    assert(cA._id);

    const hiddenCategory = await adminB.j('GET', `/api/categories/${cA._id}`, null, { expectedStatus: 404 });
    assert.match(hiddenCategory.error, /not found/i);

    console.log('OK: auth + ownership smoke passed');
    console.log({
        ownerA: adminA.user.email,
        ownerB: adminB.user.email,
        tournamentA: tA._id,
        tournamentB: tB._id,
        categoryA: cA._id
    });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
