'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function StrikeLogoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="18" cy="18" rx="15" ry="13" fill="#1a0f1e"/>
      <rect x="8"  y="16" width="2.5" height="6"  fill="white" rx="0.5"/>
      <rect x="12" y="13" width="2.5" height="9"  fill="white" rx="0.5"/>
      <rect x="16" y="11" width="2.5" height="11" fill="white" rx="0.5"/>
      <rect x="20" y="12" width="2.5" height="10" fill="white" rx="0.5"/>
      <rect x="24" y="14" width="2.5" height="8"  fill="white" rx="0.5"/>
      <path d="M7 13 Q10 5 18 5 Q25 5 30 11" stroke="#e85d04" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <polygon points="30,8 33,13 27,12" fill="#e85d04"/>
      <path d="M29 23 Q26 31 18 31 Q11 31 6 25" stroke="#e85d04" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <polygon points="6,28 3,23 9,24" fill="#e85d04"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export default function Navbar({ user, onLogin, onLogout, onOpenWallet, activePage = '' }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLink = (href, label, icon) => (
    <a
      href={href}
      className={`navbar-link ${activePage === label ? 'active' : ''}`}
      onClick={(e) => { e.preventDefault(); router.push(href); }}
    >
      {icon && icon}
      {label}
    </a>
  );

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '??';

  return (
    <>
      <style>{`
        .navbar-deposit-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 20px; border-radius: 10px;
          background: linear-gradient(135deg, #e85d04, #f4701b);
          border: none; color: white;
          font-size: 0.875rem; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(232,93,4,0.35);
          white-space: nowrap;
        }
        .navbar-deposit-btn:hover {
          background: linear-gradient(135deg, #f4701b, #f97316);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(232,93,4,0.45);
        }
        .navbar-balance-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 14px; border-radius: 10px;
          background: rgba(232,93,4,0.08);
          border: 1px solid rgba(232,93,4,0.2);
          font-size: 0.875rem; font-weight: 700; font-family: var(--font-mono);
          color: #f8fafc; cursor: pointer; transition: all 0.2s;
          white-space: nowrap;
        }
        .navbar-balance-chip:hover { background: rgba(232,93,4,0.15); border-color: rgba(232,93,4,0.4); }
        .navbar-balance-chip .balance-label { font-size: 0.7rem; color: #64748b; font-weight: 500; font-family: var(--font-sans); margin-right: 2px; }
        .navbar-avatar-wrap { position: relative; }
        .navbar-avatar-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px 6px 6px;
          background: #1a2035; border: 1px solid #1e293b;
          border-radius: 50px; cursor: pointer; transition: all 0.2s;
          color: #f8fafc; font-size: 0.85rem; font-weight: 600;
          font-family: var(--font-sans);
        }
        .navbar-avatar-btn:hover { border-color: rgba(232,93,4,0.4); background: #1f2a45; }
        .navbar-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #e85d04, #f4701b);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800; color: white; flex-shrink: 0;
          letter-spacing: 0.5px;
        }
        .navbar-avatar-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .navbar-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          background: #111827; border: 1px solid #1e293b;
          border-radius: 14px; overflow: hidden;
          min-width: 200px; z-index: 200;
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
          animation: dropIn 0.18s ease;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .navbar-dropdown-header {
          padding: 14px 18px 12px;
          border-bottom: 1px solid #1e293b;
        }
        .navbar-dropdown-email { font-size: 0.78rem; color: #64748b; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .navbar-dropdown-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 18px; cursor: pointer;
          color: #94a3b8; font-size: 0.875rem; font-weight: 500;
          transition: all 0.15s; border: none; background: none;
          width: 100%; text-align: left; font-family: inherit;
        }
        .navbar-dropdown-item:hover { background: #1a2035; color: #f8fafc; }
        .navbar-dropdown-item.danger { color: #f87171; }
        .navbar-dropdown-item.danger:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
        .navbar-dropdown-divider { border: none; border-top: 1px solid #1e293b; margin: 4px 0; }
        .navbar-create-link {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px;
          border: 1px solid #1e293b; background: transparent;
          color: #94a3b8; font-size: 0.875rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s; text-decoration: none;
          font-family: var(--font-sans);
        }
        .navbar-create-link:hover { border-color: rgba(232,93,4,0.4); color: #e85d04; background: rgba(232,93,4,0.06); }
      `}</style>

      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <a href="/" className="navbar-logo" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            <StrikeLogoIcon size={36} />
            <span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>Strike</span>
              <span style={{ color: 'var(--accent-orange)' }}>Markets</span>
            </span>
          </a>

          {/* Nav links */}
          <div className="navbar-links">
            {navLink('/', 'Markets')}
            {user && navLink('/history', 'History', <HistoryIcon />)}
          </div>

          {/* Right side */}
          <div className="navbar-user">
            {user ? (
              <>
                {/* Create Market shortcut */}
                <a
                  href="/create"
                  className="navbar-create-link"
                  onClick={(e) => { e.preventDefault(); router.push('/create'); }}
                >
                  <PlusIcon />
                  Create
                </a>

                {/* Balance / Deposit area */}
                <div
                  className="navbar-balance-chip"
                  onClick={onOpenWallet}
                  title="Click to deposit"
                >
                  <WalletIcon />
                  <span>
                    <span className="balance-label">KES</span>
                    {Number(user.balance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Deposit button */}
                <button className="navbar-deposit-btn" onClick={onOpenWallet}>
                  + Deposit
                </button>

                {/* Avatar / Profile dropdown */}
                <div className="navbar-avatar-wrap">
                  <button
                    className="navbar-avatar-btn"
                    onClick={() => setMenuOpen(o => !o)}
                  >
                    <div className="navbar-avatar">{initials}</div>
                    <span className="navbar-avatar-name">{user.username}</span>
                    <ChevronIcon />
                  </button>

                  {menuOpen && (
                    <>
                      {/* Click-away backdrop */}
                      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuOpen(false)} />
                      <div className="navbar-dropdown">
                        <div className="navbar-dropdown-header">
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>{user.username}</div>
                          <div className="navbar-dropdown-email">{user.email}</div>
                        </div>
                        <button
                          className="navbar-dropdown-item"
                          onClick={() => { setMenuOpen(false); router.push('/history'); }}
                        >
                          <HistoryIcon /> Trade History
                        </button>
                        <button
                          className="navbar-dropdown-item"
                          onClick={() => { setMenuOpen(false); onOpenWallet && onOpenWallet(); }}
                        >
                          <WalletIcon /> Deposit Funds
                        </button>
                        <hr className="navbar-dropdown-divider" />
                        <button
                          className="navbar-dropdown-item danger"
                          onClick={() => { setMenuOpen(false); onLogout(); }}
                        >
                          <LogoutIcon /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <button className="navbar-deposit-btn" onClick={onLogin}>
                Login / Register
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
