'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

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
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [loginPwd, setLoginPwd] = useState('');

  // Register fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !loginPwd) { setError('Please fill in all fields'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', identifier, password: loginPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data, `Welcome back, ${data.username}!`);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection error. Try again.');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password || !confirmPwd) { setError('Please fill in all fields'); return; }
    if (password !== confirmPwd) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data, `Welcome, ${data.username}! You have 1,000 VCoins 🎉`);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Connection error. Try again.');
    }
    setLoading(false);
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

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Sign In</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>Create Account</button>
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter username or email..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <input
                  className="form-input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter password..."
                  value={loginPwd}
                  onChange={(e) => setLoginPwd(e.target.value)}
                />
                <button type="button" className="input-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                  <EyeIcon open={showPwd} />
                </button>
              </div>
            </div>
            <button className="btn btn-amber btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="auth-switch">
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => { setTab('register'); setError(''); }}>Create one</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="Choose a username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            <div className="auth-bonus-notice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
              Get <strong>1,000 VCoins</strong> free on registration!
            </div>
            <button className="btn btn-amber btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account & Get 1,000 VC'}
            </button>
            <div className="auth-switch">
              Already have an account?{' '}
              <button type="button" onClick={() => { setTab('login'); setError(''); }}>Sign in</button>
            </div>
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
            <span className={`option-price ${getPriceClass(opt.buy)}`}>
              {(opt.buy * 100).toFixed(1)}%
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
      <div className="market-meta">
        <div className="market-meta-item">
          <span>Pool:</span>
          <span className="market-meta-value">{Number(market.total_pool).toLocaleString()}</span>
        </div>
        <div className="market-meta-item">
          <span>Volume:</span>
          <span className="market-meta-value">{Number(market.volume).toLocaleString()}</span>
        </div>
        <div className="market-meta-item">
          <span>Options:</span>
          <span className="market-meta-value">{market.options.length}</span>
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
      <Navbar user={user} onLogin={() => setShowAuth(true)} onLogout={handleLogout} activePage="Markets" />
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
