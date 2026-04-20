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

export function formatDateTimeLocalInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatStatusLabel(status) {
  const labels = {
    draft: 'Tervezet',
    running: 'Folyamatban',
    finished: 'Lezárt',
    setup: 'Beállítás alatt',
    checkin_open: 'Jelenléti időszak nyitva',
    draw_locked: 'Sorsolás lezárva',
    in_progress: 'Lebonyolítás alatt',
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

export function formatTournamentStatus(status) {
  return formatStatusLabel(status);
}

export function formatCategoryFormat(value) {
  const labels = {
    group: 'Csoportkör',
    'group+playoff': 'Csoportkör + rájátszás',
    playoff: 'Egyenes kiesés',
  };
  return labels[value] ?? value ?? '—';
}

export function formatGender(value) {
  const labels = {
    male: 'férfi',
    female: 'női',
    mixed: 'vegyes',
    other: 'egyéb',
  };
  return labels[value] ?? value ?? '—';
}

export function formatMultiTiePolicy(value) {
  const labels = {
    direct_only: 'Csak mini-tabella',
    direct_then_overall: 'Mini-tabella, majd összesített mutatók',
  };
  return labels[value] ?? value ?? '—';
}

export function formatUnresolvedTiePolicy(value) {
  const labels = {
    shared_place: 'Közös helyezés',
    manual_override: 'Kézi döntés szükséges',
  };
  return labels[value] ?? value ?? '—';
}

export function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0 Ft';
  return `${amount.toLocaleString('hu-HU')} Ft`;
}

export function roundLabel(round) {
  const labels = {
    group: 'Csoportkör',
    playoff_round_of_32: 'Legjobb 32',
    playoff_round_of_16: 'Nyolcaddöntő',
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
    wo: 'játék nélkül megnyert',
    ff: 'feladás',
    ret: 'sérülés miatti feladás',
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
