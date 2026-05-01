import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema(
    {
        tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
        feeAmount: { type: Number, default: 0, min: 0 },
        paid: { type: Boolean, default: false, index: true },
        paymentMethod: {
            type: String,
            enum: ['unknown', 'cash', 'bank_transfer', 'card', 'other'],
            default: 'unknown',
            index: true
        },
        billingName: { type: String, trim: true, default: '' },
        billingAddress: { type: String, trim: true, default: '' },
        paymentGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentGroup', default: null, index: true }
    },
    { timestamps: true }
);

entrySchema.index({ categoryId: 1, playerId: 1 }, { unique: true });

export default mongoose.model('Entry', entrySchema);
