export function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__brand">
        <div className="brand-mark">TB</div>
        <div>
          <div className="brand-title">Tollaslabda Versenyalkalmazás</div>
          <div className="brand-subtitle">Letisztult, gyors admin felület döntnököknek és szervezőknek.</div>
        </div>
      </div>
      <div className="auth-layout__card">{children}</div>
    </div>
  );
}
