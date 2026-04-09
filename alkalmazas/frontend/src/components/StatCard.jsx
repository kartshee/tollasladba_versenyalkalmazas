export function StatCard({ label, value, accent }) {
  return (
    <article className="stat-card" style={accent ? { '--stat-accent': accent } : {}}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value ?? '—'}</div>
    </article>
  );
}
