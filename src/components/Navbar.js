'use client';
import { useRouter } from 'next/navigation';

function StrikeLogoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="18" cy="18" rx="15" ry="13" fill="#1a0f1e"/>
      <rect x="8"  y="16" width="2.5" height="6"  fill="white" rx="0.5"/>
      <rect x="12" y="13" width="2.5" height="9"  fill="white" rx="0.5"/>
      <rect x="16" y="11" width="2.5" height="11" fill="white" rx="0.5"/>
      <rect x="20" y="12" width="2.5" height="10" fill="white" rx="0.5"/>
      <rect x="24" y="14" width="2.5" height="8"  fill="white" rx="0.5"/>
      {/* Top arrow */}
      <path d="M7 13 Q10 5 18 5 Q25 5 30 11" stroke="#e85d04" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <polygon points="30,8 33,13 27,12" fill="#e85d04"/>
      {/* Bottom arrow */}
      <path d="M29 23 Q26 31 18 31 Q11 31 6 25" stroke="#e85d04" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <polygon points="6,28 3,23 9,24" fill="#e85d04"/>
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6M9 15h6"/>
    </svg>
  );
}

export default function Navbar({ user, onLogin, onLogout, activePage = '' }) {
  const router = useRouter();

  const navLink = (href, label) => (
    <a
      href={href}
      className={`navbar-link ${activePage === label ? 'active' : ''}`}
      onClick={(e) => { e.preventDefault(); router.push(href); }}
    >
      {label}
    </a>
  );

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a href="/" className="navbar-logo" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
          <StrikeLogoIcon size={38} />
          <span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>Strike</span>
            <span style={{ color: 'var(--accent-orange)' }}>Markets</span>
          </span>
        </a>

        <div className="navbar-links">
          {navLink('/', 'Markets')}
          {navLink('/leaderboard', 'Leaderboard')}
          {user && navLink('/create', 'Create')}
        </div>

        <div className="navbar-user">
          {user ? (
            <>
              <div className="wallet-badge">
                <CoinIcon />
                {Number(user.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onLogout}>{user.username}</button>
            </>
          ) : (
            <button className="btn btn-orange" onClick={onLogin}>Login / Register</button>
          )}
        </div>
      </div>
    </nav>
  );
}
