import Entry from '../models/Entry.js';

export function getDefaultEntryFee(tournament) {
    const enabled = tournament?.config?.entryFeeEnabled === true;
    const amount = Number(tournament?.config?.entryFeeAmount ?? 0);
    return enabled ? amount : 0;
}

export async function ensureEntryForPlayer({ tournament, player, categoryId = null }) {
    if (!categoryId) return null;

    const feeAmount = getDefaultEntryFee(tournament);
    return Entry.findOneAndUpdate(
        { categoryId, playerId: player._id },
        {
            $setOnInsert: {
                tournamentId: player.tournamentId,
                categoryId,
                playerId: player._id,
                feeAmount,
                paid: false,
                billingName: '',
                billingAddress: '',
                paymentGroupId: null
            }
        },
        { upsert: true, new: true }
    );
}
