import 'dotenv/config';
import mongoose from 'mongoose';

import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import Player from '../models/Player.js';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import Entry from '../models/Entry.js';
import PaymentGroup from '../models/PaymentGroup.js';
import AuditLog from '../models/AuditLog.js';

async function main() {
    const apply = process.argv.includes('--apply');

    if (!process.env.MONGO_URI) {
        throw new Error('Missing MONGO_URI in environment');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const [
        tournamentCount,
        categoryCount,
        playerCount,
        groupCount,
        matchCount,
        entryCount,
        paymentGroupCount,
        auditLogCount
    ] = await Promise.all([
        Tournament.countDocuments({}),
        Category.countDocuments({}),
        Player.countDocuments({}),
        Group.countDocuments({}),
        Match.countDocuments({}),
        Entry.countDocuments({}),
        PaymentGroup.countDocuments({}),
        AuditLog.countDocuments({})
    ]);

    console.log('Will affect:');
    console.log({
        tournaments: tournamentCount,
        categories: categoryCount,
        players: playerCount,
        groups: groupCount,
        matches: matchCount,
        entries: entryCount,
        paymentGroups: paymentGroupCount,
        auditLogs: auditLogCount
    });

    if (!apply) {
        console.log('Dry-run only. Re-run with --apply to actually delete all non-user data.');
        await mongoose.disconnect();
        return;
    }

    const delMatches = await Match.deleteMany({});
    const delGroups = await Group.deleteMany({});
    const delEntries = await Entry.deleteMany({});
    const delPaymentGroups = await PaymentGroup.deleteMany({});
    const delAuditLogs = await AuditLog.deleteMany({});
    const delPlayers = await Player.deleteMany({});
    const delCategories = await Category.deleteMany({});
    const delTournaments = await Tournament.deleteMany({});

    console.log('Deleted:');
    console.log({
        matches: delMatches.deletedCount,
        groups: delGroups.deletedCount,
        entries: delEntries.deletedCount,
        paymentGroups: delPaymentGroups.deletedCount,
        auditLogs: delAuditLogs.deletedCount,
        players: delPlayers.deletedCount,
        categories: delCategories.deletedCount,
        tournaments: delTournaments.deletedCount
    });

    await mongoose.disconnect();
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});