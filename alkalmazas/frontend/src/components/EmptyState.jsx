export function EmptyState({ title, description, action, icon = '○' }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div style={{ marginTop: '0.5rem' }}>{action}</div> : null}
    </div>
  );
}
