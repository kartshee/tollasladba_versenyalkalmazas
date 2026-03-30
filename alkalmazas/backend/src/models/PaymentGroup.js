import mongoose from 'mongoose';

const paymentGroupSchema = new mongoose.Schema(
    {
        tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
        payerName: { type: String, required: true, trim: true },
        billingName: { type: String, trim: true, default: '' },
        billingAddress: { type: String, trim: true, default: '' },
        paid: { type: Boolean, default: false, index: true },
        note: { type: String, trim: true, default: '' }
    },
    { timestamps: true }
);

export default mongoose.model('PaymentGroup', paymentGroupSchema);
