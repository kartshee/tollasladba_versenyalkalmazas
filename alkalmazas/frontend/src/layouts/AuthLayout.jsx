export function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__inner">
        {/* Brand panel */}
        <div className="auth-layout__brand">
          <div>
            <div className="auth-brand-logo">TB</div>
            <div className="auth-brand-title">Tollaslabda Versenykezelő</div>
            <div className="auth-brand-subtitle">
              Letisztult admin felület döntnököknek és versenyszervezőknek.
            </div>
          </div>

          <div className="auth-brand-features">
            <div className="auth-brand-feature">Csoportkör és playoff kezelés</div>
            <div className="auth-brand-feature">Valós idejű eredményrögzítés</div>
            <div className="auth-brand-feature">Automatikus ütemezés és pályabeosztás</div>
            <div className="auth-brand-feature">Kijelzős board nézet</div>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-layout__card">{children}</div>
      </div>
    </div>
  );
}
