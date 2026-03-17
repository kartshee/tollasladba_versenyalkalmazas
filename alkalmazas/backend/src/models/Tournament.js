import mongoose from 'mongoose';

const matchRulesSchema = new mongoose.Schema(
    {
            bestOf: { type: Number, default: 3, enum: [1, 3, 5] },
            pointsToWin: { type: Number, default: 21 },
            winBy: { type: Number, default: 2 },
            cap: { type: Number, default: 30 }
    },
    { _id: false }
);

const configSchema = new mongoose.Schema(
    {
            matchRules: { type: matchRulesSchema, default: () => ({}) },

            estimatedMatchMinutes: { type: Number, default: 35 },
            minRestPlayerMinutes: { type: Number, default: 20 },
            minRestRefereeMinutes: { type: Number, default: 10 },

            courtTurnoverMinutes: { type: Number, default: 0, min: 0 },

            courtsCount: { type: Number, default: 1, min: 1 },

            // check-in
            checkInGraceMinutesDefault: { type: Number, default: 40, min: 0 },

            // late/no-show MAIN-ben: void (fair)
            lateNoShowPolicy: { type: String, enum: ['void'], default: 'void' },

            avoidSameClubEarly: { type: Boolean, default: false }
    },
    { _id: false }
);

const refereeSchema = new mongoose.Schema(
    {
            name: { type: String, required: true }
    },
    { _id: false }
);

const tournamentSchema = new mongoose.Schema(
    {
            name: { type: String, required: true, trim: true },
            ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
            date: Date,
            location: String,

            status: { type: String, enum: ['draft', 'running', 'finished'], default: 'draft' },

            config: { type: configSchema, default: () => ({}) },

            referees: { type: [refereeSchema], default: [] }
    },
    { timestamps: true }
);

export default mongoose.model('Tournament', tournamentSchema);