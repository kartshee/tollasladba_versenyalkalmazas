function escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

export function toCsv(rows) {
    return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

export function sendCsv(res, filename, rows) {
    const csvBody = toCsv(rows);
    const bom = '\uFEFF';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(`${bom}${csvBody}`);
}

export function formatIso(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
}

export function formatSets(sets) {
    if (!Array.isArray(sets) || sets.length === 0) return '';
    return sets.map((s) => `${s.p1}-${s.p2}`).join(' | ');
}

export function sanitizeFilePart(input, fallback = 'export') {
    const value = String(input ?? '').trim();
    if (!value) return fallback;
    return value
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '') || fallback;
}
