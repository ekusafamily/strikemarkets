'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import WalletModal from '@/components/WalletModal';

const CATEGORIES = ['All', 'Crypto', 'Politics', 'Tech', 'Sports', 'Entertainment', 'General'];

function CoinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6M9 15h6"/>
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// Navbar is now shared from @/components/Navbar

function AuthModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please fill in all fields'); return; }
    
    if (isRegistering) {
      if (password !== confirmPwd) { setError('Passwords do not match'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
      setError('');
      setLoading(true);
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'register', email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.requiresEmailVerification) {
            setSuccessMsg(data.message);
          } else {
            onSuccess(data, `Welcome! Your account is ready.`);
          }
        } else {
          setError(data.error || 'Registration failed');
        }
      } catch {
        setError('Connection error. Try again.');
      }
      setLoading(false);
    } else {
      setError('');
      setLoading(true);
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', identifier: email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          onSuccess(data, `Welcome back!`);
        } else if (data.needsRegistration) {
          setIsRegistering(true);
          setError('Email not found. Please confirm your password to create an account.');
        } else {
          setError(data.error || 'Login failed');
        }
      } catch {
        setError('Connection error. Try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-logo">
          <img src="/logo.png" alt="Strike Markets" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem' }}>
              <span style={{ color: 'var(--text-primary)' }}>Strike</span>
              <span style={{ color: 'var(--accent-orange)' }}>Markets</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Virtual Prediction Market</div>
          </div>
        </div>
        </div>

        {/* Error / Success */}
        {error && <div className="auth-error">{error}</div>}
        {successMsg && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>✉️</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Check your email</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {successMsg}
            </p>
            <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={onClose}>Close</button>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleContinue} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                disabled={loading || isRegistering}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <input
                  className="form-input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="At least 6 characters..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="input-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                  <EyeIcon open={showPwd} />
                </button>
              </div>
            </div>
            {isRegistering && (
              <>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    className="form-input"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Repeat password..."
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                  />
                </div>
                <div className="auth-bonus-notice" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <strong>Valid email required.</strong> You must verify your email before logging in.
                </div>
              </>
            )}
            <button className="btn btn-amber btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Continue')}
            </button>
            {isRegistering && (
              <div className="auth-switch">
                <button type="button" onClick={() => { setIsRegistering(false); setError(''); }}>Back to Sign In</button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

// Price class based on buy probability
function getPriceClass(buyPrice) {
  if (buyPrice >= 0.6) return 'high';
  if (buyPrice >= 0.3) return 'mid';
  return 'low';
}

function MarketCard({ market, onClick }) {
  const topOptions = market.options.slice(0, 4);
  return (
    <div className="card card-clickable market-card" onClick={onClick}>
      <div className="market-card-header">
        <span className="market-category">{market.category}</span>
        {market.status === 'resolved' && (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            RESOLVED
          </span>
        )}
      </div>
      <h3 className="market-question">{market.question}</h3>
      <div className="market-options-preview">
        {topOptions.map((opt) => (
          <div className="option-row" key={opt.id}>
            <span className="option-name">{opt.name}</span>
            {/* Show ONLY the buy price — users see this as "the" probability */}
            <span className={`option-price ${getPriceClass(opt.fair)}`}>
              {(opt.fair * 100).toFixed(1)}%
            </span>
          </div>
        ))}
        {market.options.length > 4 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            +{market.options.length - 4} more options
          </div>
        )}
      </div>
      <div className="prob-bar-container" style={{ marginBottom: 14 }}>
        {market.options.map((opt, i) => {
          const colors = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#06b6d4', '#84cc16'];
          // use fair for bar widths (relative distribution), buy for display
          return (
            <div key={opt.id} className="prob-bar-segment" style={{ width: `${opt.fair * 100}%`, background: colors[i % colors.length] }} />
          );
        })}
      </div>
      <div className="market-meta" style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div className="market-meta-item">
          <span>Total Volume Traded:</span>
          <span className="market-meta-value" style={{ color: 'var(--text-secondary)' }}>{Number(market.volume).toLocaleString()} VCoins</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      setUser(data.user);
    } catch {}
  }, []);

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'open' });
      if (category !== 'All') params.set('category', category);
      const res = await fetch(`/api/markets?${params}`);
      const data = await res.json();
      setMarkets(data.markets || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => { fetchUser(); }, [fetchUser]);
  useEffect(() => { fetchMarkets(); }, [fetchMarkets]);

  const handleAuthSuccess = (userData, message) => {
    setUser(userData);
    setShowAuth(false);
    setToast({ message, type: 'success' });
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setUser(null);
    setToast({ message: 'Logged out', type: 'success' });
  };


  return (
    <>
      <Navbar 
        user={user} 
        onLogin={() => setShowAuth(true)} 
        onLogout={handleLogout} 
        onOpenWallet={() => setShowWallet(true)}
        activePage="Markets" 
      />
      <div className="page-container">
        <h1 className="page-title">Prediction Markets</h1>
        <p className="page-subtitle">Trade on outcomes with virtual coins. Pick your side, earn VCoins.</p>

        <div className="category-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : markets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
              </svg>
            </div>
            <div className="empty-state-text">No markets yet</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Be the first to create a prediction market!</p>
            <button className="btn btn-amber" onClick={() => user ? router.push('/create') : setShowAuth(true)}>Create Market</button>
          </div>
        ) : (
          <div className="markets-grid">
            {markets.map((m) => (
              <MarketCard key={m.id} market={m} onClick={() => router.push(`/market/${m.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
      {showWallet && user && (
        <WalletModal 
          user={user}
          onClose={() => setShowWallet(false)} 
          onDepositSuccess={() => {
            fetchUser(); // Refresh balance
            setShowWallet(false);
            setToast({ message: 'Deposit successful!', type: 'success' });
          }} 
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
