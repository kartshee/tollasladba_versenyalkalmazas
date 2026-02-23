import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }],
    withdrawals: [
        {
            playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
            reason: {
                type: String,
                enum: ['injury', 'voluntary', 'disqualified', 'no_show', 'other'],
                required: true
            },
            policy: {
                type: String,
                enum: ['delete_results', 'keep_results'],
                required: true
            },
            note: { type: String, default: '' },
            at: { type: Date, default: Date.now }
        }
    ],
});

export default mongoose.model('Group', groupSchema);
