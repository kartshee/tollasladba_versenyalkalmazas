import mongoose from 'mongoose';

const setSchema = new mongoose.Schema(
    { p1: { type: Number, required: true }, p2: { type: Number, required: true } },
    { _id: false }
);

const matchSchema = new mongoose.Schema(
    {
        tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },

        player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
        player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },

        round: { type: String, default: 'group' }, // később enumolhatod
        status: { type: String, enum: ['pending', 'running', 'finished'], default: 'pending', index: true },

            courtNumber: { type: Number, min: 1, default: null },
            startAt: { type: Date, default: null },      // scheduled
            endAt: { type: Date, default: null },        // scheduled

            actualStartAt: { type: Date, default: null },// actual
            actualEndAt: { type: Date, default: null },  // actual
            resultUpdatedAt: { type: Date, default: null },



        sets: { type: [setSchema], default: [] },
        winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null }
    },
    { timestamps: true } // createdAt miatt hasznos (te is sortolsz rá)
);

export default mongoose.model('Match', matchSchema);
