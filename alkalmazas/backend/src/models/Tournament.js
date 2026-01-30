import mongoose from 'mongoose';

const matchRulesSchema = new mongoose.Schema(
    {
        bestOf: { type: Number, default: 3, enum: [1, 3, 5] }, // nálad 3 kell
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
        courtsCount: { type: Number, default: 1, min: 1 },
        avoidSameClubEarly: { type: Boolean, default: false }
    },
    { _id: false }
);

const refereeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true }
    },
);

const tournamentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        date: Date,
        location: String,

        status: { type: String, enum: ['draft', 'running', 'finished'], default: 'draft' },

        config: { type: configSchema, default: () => ({}) },

        // bíró logika: ha referees.length > 0 => kötelező minden meccshez, különben OFF
        referees: { type: [refereeSchema], default: [] }
    },
    { timestamps: true }
);

export default mongoose.model('Tournament', tournamentSchema);
