export function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

export function formatDateOnly(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('hu-HU');
  } catch {
    return String(value);
  }
}

export function formatStatusLabel(status) {
  const labels = {
    draft: 'Tervezet',
    running: 'Folyamatban',
    finished: 'Lezárt',
    setup: 'Beállítás',
    checkin_open: 'Jelenlét nyitva',
    draw_locked: 'Sorsolás lezárva',
    in_progress: 'Folyamatban',
    completed: 'Befejezve',
    pending: 'Várakozik',
    group: 'Csoportkör',
  };
  return labels[status] ?? status ?? '—';
}

export function toneForStatus(status) {
  if (['running', 'in_progress', 'checkin_open'].includes(status)) return 'success';
  if (['finished', 'completed'].includes(status)) return 'warning';
  if (['pending', 'draft', 'setup', 'draw_locked'].includes(status)) return 'neutral';
  return 'neutral';
}

export function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0 Ft';
  return `${amount.toLocaleString('hu-HU')} Ft`;
}

export function roundLabel(round) {
  const labels = {
    group: 'Csoportkör',
    playoff_quarter: 'Negyeddöntő',
    playoff_semi: 'Elődöntő',
    playoff_final: 'Döntő',
    playoff_bronze: 'Bronzmeccs',
    friendly: 'Barátságos meccs',
  };
  return labels[round] ?? round ?? '—';
}

export function outcomeLabel(resultType) {
  const labels = {
    played: 'lejátszott',
    wo: 'W.O.',
    ff: 'feladás',
    ret: 'Visszalépés',
  };
  return labels[resultType] ?? resultType ?? '—';
}

export function setsToText(sets) {
  if (!Array.isArray(sets) || sets.length === 0) return '—';
  return sets.map((set) => `${set.p1}-${set.p2}`).join(', ');
}

export function normalizeSearch(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function byName(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'hu');
}


export function formatCategoryFormat(value) {
  const labels = {
    group: 'Csoportkör',
    'group+playoff': 'Csoportkör + rájátszás',
    playoff: 'Egyenes kiesés'
  };
  return labels[value] ?? value ?? '—';
}
