import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
    {
        tournamentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tournament',
            required: true
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
        }
    },
    { timestamps: true }
);

export default mongoose.model('Player', playerSchema);
