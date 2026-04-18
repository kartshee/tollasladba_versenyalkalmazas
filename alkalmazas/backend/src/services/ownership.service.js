import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';

export function isValidObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value);
}

export async function getOwnedTournamentIds(userId) {
    const items = await Tournament.find({ ownerId: userId }).select('_id').lean();
    return items.map((x) => x._id);
}

export async function findOwnedTournamentById(tournamentId, userId) {
    if (!isValidObjectId(tournamentId)) return null;
    return Tournament.findOne({ _id: tournamentId, ownerId: userId });
}

export async function assertTournamentOwned(tournamentId, userId, { lean = false } = {}) {
    if (!isValidObjectId(tournamentId)) return null;
    const query = Tournament.findOne({ _id: tournamentId, ownerId: userId });
    return lean ? query.lean() : query;
}
