import 'dotenv/config';
import mongoose from 'mongoose';

import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import Player from '../models/Player.js';
import Group from '../models/Group.js';
import Match from '../models/Match.js';

function getArgValue(name, def = null) {
    const pfx = `${name}=`;
    const hit = process.argv.find((a) => a.startsWith(pfx));
    return hit ? hit.slice(pfx.length) : def;
}

async function main() {
    const apply = process.argv.includes('--apply'); // dry-run az alap
    const olderThanDaysStr = getArgValue('--olderThanDays', null);
    const olderThanDays = olderThanDaysStr ? Number(olderThanDaysStr) : null;

    if (!process.env.MONGO_URI) {
        throw new Error('Missing MONGO_URI in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const nameRegex = /^(SMOKE|WITHDRAW)\s/i;
    const query = { name: { $regex: nameRegex } };

    if (olderThanDays !== null) {
        if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
            throw new Error('--olderThanDays must be a non-negative number');
        }
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        // Ha nincs timestamps a Tournament modellen, ez a filter nem fog találni -> ezért fallback:
        query.createdAt = { $lt: cutoff };
    }

    // Keressük a teszt tournamenteket
    let tournaments = await Tournament.find(query).select('_id name createdAt').lean();

    // Fallback, ha a createdAt filter miatt 0 jött és valószínűleg nincs timestamps:
    if (olderThanDays !== null && tournaments.length === 0) {
        delete query.createdAt;
        tournaments = await Tournament.find(query).select('_id name createdAt').lean();
    }

    const tIds = tournaments.map((t) => t._id);

    console.log(`Found ${tIds.length} SMOKE/WITHDRAW tournaments${olderThanDays !== null ? ` (olderThanDays=${olderThanDays})` : ''}.`);

    if (tIds.length === 0) {
        await mongoose.disconnect();
        return;
    }

    // Számolás (dry-run output)
    const [matchCount, groupCount, playerCount, categoryCount] = await Promise.all([
        Match.countDocuments({ tournamentId: { $in: tIds } }),
        Group.countDocuments({ tournamentId: { $in: tIds } }),
        Player.countDocuments({ tournamentId: { $in: tIds } }),
        Category.countDocuments({ tournamentId: { $in: tIds } })
    ]);

    console.log('Would delete:');
    console.log({ tournaments: tIds.length, categories: categoryCount, players: playerCount, groups: groupCount, matches: matchCount });

    // Pár példa név, hogy lásd mit talál
    console.log('Sample tournaments:');
    for (const t of tournaments.slice(0, 5)) {
        console.log(`- ${String(t._id)} | ${t.name}${t.createdAt ? ` | ${new Date(t.createdAt).toISOString()}` : ''}`);
    }

    if (!apply) {
        console.log('Dry-run only. Re-run with --apply to actually delete.');
        await mongoose.disconnect();
        return;
    }

    // Törlés sorrend: match -> group/player/category -> tournament
    const delMatches = await Match.deleteMany({ tournamentId: { $in: tIds } });
    const delGroups = await Group.deleteMany({ tournamentId: { $in: tIds } });
    const delPlayers = await Player.deleteMany({ tournamentId: { $in: tIds } });
    const delCategories = await Category.deleteMany({ tournamentId: { $in: tIds } });
    const delTournaments = await Tournament.deleteMany({ _id: { $in: tIds } });

    console.log('Deleted:');
    console.log({
        matches: delMatches.deletedCount,
        groups: delGroups.deletedCount,
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