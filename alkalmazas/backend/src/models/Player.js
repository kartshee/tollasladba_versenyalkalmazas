import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }
});

export default mongoose.model('Player', playerSchema);
