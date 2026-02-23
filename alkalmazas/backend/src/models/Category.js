import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
        name: { type: String, required: true, trim: true },

            // --- Group stage (csonka RR) config ---
            groupStageMatchesPerPlayer: { type: Number, default: null, min: 1 },
            // pl. 6 azt jelenti: minden játékos 6 meccset játszik (ha lehetséges)

            walkoverPolicy: {
                    type: String,
                    enum: ['count_win_exclude_tiebreak', 'count_win_include_tiebreak'],
                    default: 'count_win_exclude_tiebreak'
            },

            incompletePolicy: {
                    type: String,
                    enum: ['delete_results', 'keep_results'],
                    default: 'delete_results' // BWF-hez közelítő default
            },

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
