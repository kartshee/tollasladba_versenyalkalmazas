import { AppLink } from './AppLink.jsx';

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <div className="page-header__eyebrow">{eyebrow}</div> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? <p className="page-header__description">{description}</p> : null}
      </div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </header>
  );
}

export function BackLink({ to, children = '← Vissza' }) {
  return <AppLink className="back-link" to={to}>{children}</AppLink>;
}
