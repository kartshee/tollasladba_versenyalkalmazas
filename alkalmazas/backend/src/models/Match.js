import mongoose from 'mongoose';

const setSchema = new mongoose.Schema(
    {
        p1: { type: Number, required: true },
        p2: { type: Number, required: true }
    },
    { _id: false }
);

const matchSchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament'
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    },
    player1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    player2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    sets: [setSchema],          // ← EZ AZ ÚJ RÉSZ
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    },
    round: {
        type: String,
        default: 'group'
    }
});

export default mongoose.model('Match', matchSchema);
