import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: Date,
    location: String
});

export default mongoose.model('Tournament', tournamentSchema);
