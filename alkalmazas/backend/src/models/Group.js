import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: false
    },
    name: {
        type: String,
        required: true
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }]
});

export default mongoose.model('Group', groupSchema);
