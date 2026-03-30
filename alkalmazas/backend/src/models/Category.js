import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema(
    {
        closeAt: { type: Date, default: null },
        graceMinutesOverride: { type: Number, default: null, min: 0 },
        graceOverrideReason: { type: String, default: '' }
    },
    { _id: false }
);

const categorySchema = new mongoose.Schema(
    {
        tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
        name: { type: String, required: true, trim: true },

        status: {
            type: String,
            enum: ['setup', 'checkin_open', 'draw_locked', 'in_progress', 'completed'],
            default: 'setup',
            index: true
        },

        drawLockedAt: { type: Date, default: null },
        drawVersion: { type: Number, default: 1, min: 1 },

        checkIn: { type: checkInSchema, default: () => ({}) },

        // --- Group stage (csonka RR) config ---
        groupStageMatchesPerPlayer: { type: Number, default: null, min: 1 },

        // auto group build célméret
        groupSizeTarget: { type: Number, default: 8, min: 2 },

        walkoverPolicy: {
            type: String,
            enum: ['count_win_exclude_tiebreak', 'count_win_include_tiebreak'],
            default: 'count_win_exclude_tiebreak'
        },

        incompletePolicy: {
            type: String,
            enum: ['delete_results', 'keep_results'],
            default: 'delete_results'
        },

        multiTiePolicy: {
            type: String,
            enum: ['direct_only', 'direct_then_overall'],
            default: 'direct_then_overall'
        },

        unresolvedTiePolicy: {
            type: String,
            enum: ['shared_place', 'manual_override'],
            default: 'shared_place'
        },

        gender: { type: String, enum: ['male', 'female', 'mixed', 'other'], default: 'other' },
        ageGroup: { type: String },
        format: { type: String, enum: ['group', 'group+playoff', 'playoff'], default: 'group+playoff' },

        // ha 1, auto számoljuk groupSizeTarget alapján
        groupsCount: { type: Number, default: 1, min: 1 },
        qualifiersPerGroup: { type: Number, default: 4, min: 1 },
        playoffSize: { type: Number, default: null, min: 2 }
    },
    { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
