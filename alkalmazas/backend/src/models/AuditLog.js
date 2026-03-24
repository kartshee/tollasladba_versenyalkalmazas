import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null, index: true },
        matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null, index: true },
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null, index: true },

        entityType: { type: String, required: true, trim: true, index: true },
        entityId: { type: String, default: '', trim: true, index: true },
        action: { type: String, required: true, trim: true, index: true },
        summary: { type: String, default: '', trim: true },

        before: { type: mongoose.Schema.Types.Mixed, default: null },
        after: { type: mongoose.Schema.Types.Mixed, default: null },
        metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

auditLogSchema.index({ tournamentId: 1, createdAt: -1 });
auditLogSchema.index({ categoryId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
