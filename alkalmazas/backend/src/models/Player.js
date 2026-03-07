import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
    {
        tournamentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tournament',
            required: true
        },

        // MVP: egy játékos egy kategóriában (később Entry modellre bővíthető)
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        club: {
            type: String,
            trim: true,
            default: ''
        },

        note: {
            type: String,
            trim: true,
            default: ''
        },

        checkedInAt: { type: Date, default: null, index: true },

        mainEligibility: {
            type: String,
            enum: ['main', 'friendly_only', 'withdrawn'],
            default: 'main',
            index: true
        }
    },
    { timestamps: true }
);

export default mongoose.model('Player', playerSchema);