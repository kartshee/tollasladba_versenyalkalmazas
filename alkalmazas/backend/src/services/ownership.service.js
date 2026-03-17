import Tournament from '../models/Tournament.js';

export async function getOwnedTournamentIds(userId) {
    const items = await Tournament.find({ ownerId: userId }).select('_id').lean();
    return items.map((x) => x._id);
}

export async function findOwnedTournamentById(tournamentId, userId) {
    return Tournament.findOne({ _id: tournamentId, ownerId: userId });
}

export async function assertTournamentOwned(tournamentId, userId, { lean = false } = {}) {
    const query = Tournament.findOne({ _id: tournamentId, ownerId: userId });
    return lean ? query.lean() : query;
}
