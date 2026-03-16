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

const DEFAULT_PREFIX_PATTERNS = [
    /^SMOKE\s/i,
    /^WITHDRAW\s/i,
    /^CHECKIN\s/i,
    /^STANDINGS\s/i,
    /^TB-3WAY\s/i,
    /^TB-H2H\s/i,
    /^PLAYOFF\s/i,
    /^RULES-BO[15]-/i,
    /^BAD-RULES-/i,
    /^CONFIG-VALID-/i,
    /^CONFIGURE-ROLLBACK-/i,
    /^LIFE\s/i
];

function matchesSmokeName(name) {
    return DEFAULT_PREFIX_PATTERNS.some((rx) => rx.test(name ?? ''));
}

async function main() {
    const apply = process.argv.includes('--apply');
    const olderThanDaysStr = getArgValue('--olderThanDays', null);
    const olderThanDays = olderThanDaysStr ? Number(olderThanDaysStr) : null;

    if (!process.env.MONGO_URI) {
        throw new Error('Missing MONGO_URI in environment');
    }

    await mongoose.connect(process.env.MONGO_URI);

    let tournaments = await Tournament.find({}).select('_id name createdAt updatedAt').lean();
    tournaments = tournaments.filter((t) => matchesSmokeName(t.name));

    if (olderThanDays !== null) {
        if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
            throw new Error('--olderThanDays must be a non-negative number');
        }
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        tournaments = tournaments.filter((t) => {
            const stamp = t.createdAt ?? t.updatedAt;
            return stamp ? new Date(stamp) < cutoff : true;
        });
    }

    const tIds = tournaments.map((t) => t._id);

    console.log(`Found ${tIds.length} smoke tournaments${olderThanDays !== null ? ` (olderThanDays=${olderThanDays})` : ''}.`);

    if (tIds.length === 0) {
        await mongoose.disconnect();
        return;
    }

    const [matchCount, groupCount, playerCount, categoryCount] = await Promise.all([
        Match.countDocuments({ tournamentId: { $in: tIds } }),
        Group.countDocuments({ tournamentId: { $in: tIds } }),
        Player.countDocuments({ tournamentId: { $in: tIds } }),
        Category.countDocuments({ tournamentId: { $in: tIds } })
    ]);

    console.log('Will affect:');
    console.log({ tournaments: tIds.length, categories: categoryCount, players: playerCount, groups: groupCount, matches: matchCount });

    console.log('Sample tournaments:');
    for (const t of tournaments.slice(0, 10)) {
        console.log(`- ${String(t._id)} | ${t.name}${t.createdAt ? ` | ${new Date(t.createdAt).toISOString()}` : ''}`);
    }

    if (!apply) {
        console.log('Dry-run only. Re-run with --apply to actually delete.');
        await mongoose.disconnect();
        return;
    }

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
