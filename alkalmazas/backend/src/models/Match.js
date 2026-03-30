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

        pairKey: { type: String, required: true, index: true },

        round: { type: String, default: 'group' },
        status: { type: String, enum: ['pending', 'running', 'finished'], default: 'pending', index: true },
        roundNumber: { type: Number, default: null, min: 1, index: true },

        // redraw-hoz / audit-hoz
        drawVersion: { type: Number, default: 1, index: true },

        resultType: {
            type: String,
            enum: ['played', 'wo', 'ff', 'ret'],
            default: 'played',
            index: true
        },

        voided: { type: Boolean, default: false, index: true },
        voidReason: { type: String, default: '' },
        voidedAt: { type: Date, default: null },

        courtNumber: { type: Number, min: 1, default: null },
        startAt: { type: Date, default: null },
        endAt: { type: Date, default: null },

        actualStartAt: { type: Date, default: null },
        actualEndAt: { type: Date, default: null },
        resultUpdatedAt: { type: Date, default: null },

        umpireName: { type: String, trim: true, default: '' },

        sets: { type: [setSchema], default: [] },
        winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null }
    },
    { timestamps: true }
);

// UNIQUE: azonos drawVersion-ön belül ne legyen duplikált pár ugyanabban a group/round-ban
matchSchema.index({ groupId: 1, round: 1, drawVersion: 1, pairKey: 1 }, { unique: true, partialFilterExpression: { groupId: { $type: 'objectId' } } });
matchSchema.index({ categoryId: 1, round: 1, drawVersion: 1, pairKey: 1 }, { unique: true, partialFilterExpression: { groupId: null } });

export default mongoose.model('Match', matchSchema);
