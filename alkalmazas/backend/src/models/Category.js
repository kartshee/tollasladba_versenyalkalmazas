import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
        name: { type: String, required: true, trim: true },

        // opcionális meta
        gender: { type: String, enum: ['male', 'female', 'mixed', 'other'], default: 'other' },
        ageGroup: { type: String }, // pl. "U17", "2004"
        format: { type: String, enum: ['group', 'group+playoff'], default: 'group+playoff' },

        groupsCount: { type: Number, default: 1, min: 1 },
        qualifiersPerGroup: { type: Number, default: 4, min: 1 }
    },
    { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
