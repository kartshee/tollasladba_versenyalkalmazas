export function SectionCard({ title, subtitle, children, action, className = '' }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {(title || subtitle || action) ? (
        <header className="section-card__header">
          <div>
            {title ? <h2 className="section-card__title">{title}</h2> : null}
            {subtitle ? <p className="section-card__subtitle">{subtitle}</p> : null}
          </div>
          {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
