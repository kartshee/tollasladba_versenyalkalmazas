import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

let j;

async function main() {
    const auth = await createAuthContext('FEE');
    j = (method, path, body) => auth.j(method, path, body);

    const tournament = await j('POST', '/api/tournaments', {
        name: `FEE ${new Date().toISOString()}`,
        config: {
            entryFeeEnabled: true,
            entryFeeAmount: 3500
        }
    });
    assert(tournament?._id);

    const category = await j('POST', '/api/categories', {
        tournamentId: tournament._id,
        name: 'Men Singles',
        format: 'group'
    });
    assert(category?._id);

    const player1 = await j('POST', '/api/players', {
        tournamentId: tournament._id,
        categoryId: category._id,
        name: 'Alpha'
    });
    const player2 = await j('POST', '/api/players', {
        tournamentId: tournament._id,
        categoryId: category._id,
        name: 'Beta'
    });

    const entries = await j('GET', `/api/entries?tournamentId=${tournament._id}`);
    assert.equal(entries.length, 2);
    assert(entries.every((entry) => entry.feeAmount === 3500));

    const paymentGroup = await j('POST', '/api/payment-groups', {
        tournamentId: tournament._id,
        payerName: 'Kis Ferenc SE',
        billingName: 'Kis Ferenc SE',
        billingAddress: '6000 Kecskemét, Példa utca 1.',
        paid: true,
        entryIds: entries.map((entry) => entry._id)
    });
    assert(paymentGroup?._id);

    const groupedEntries = await j('GET', `/api/entries?paymentGroupId=${paymentGroup._id}`);
    assert.equal(groupedEntries.length, 2);

    const updated = await j('PATCH', `/api/entries/${groupedEntries[0]._id}`, {
        paid: true,
        billingName: 'Gál Gergő',
        billingAddress: '6720 Szeged, Minta tér 1.'
    });
    assert.equal(updated.paid, true);
    assert.equal(updated.billingName, 'Gál Gergő');

    console.log('OK: entry fee smoke passed');
    console.log({ tournamentId: tournament._id, categoryId: category._id, playerIds: [player1._id, player2._id], paymentGroupId: paymentGroup._id });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
