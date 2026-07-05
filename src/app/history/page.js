'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

function CoinIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6M9 15h6"/>
    </svg>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('positions'); // 'positions' | 'transactions'

  useEffect(() => {
    Promise.all([
      fetch('/api/auth').then(r => r.json()),
      fetch('/api/history').then(r => r.json()),
    ]).then(([auth, history]) => {
      if (!auth.user) { router.push('/'); return; }
      setUser(auth.user);
      setData(history);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const txTypeStyle = (type) => {
    const map = {
      buy: { color: '#10b981', label: 'BUY' },
      sell: { color: '#ef4444', label: 'SELL' },
      resolution_payout: { color: '#f59e0b', label: 'WIN' },
      redeem: { color: '#8b5cf6', label: 'REFUND' },
    };
    return map[type] || { color: 'var(--text-muted)', label: type.toUpperCase() };
  };

  if (loading) return (
    <>
      <Navbar user={null} activePage="History" />
      <div className="loading-center"><div className="spinner" /></div>
    </>
  );

  if (!data) return (
    <>
      <Navbar user={user} activePage="History" />
      <div className="page-container"><div className="empty-state"><div className="empty-state-text">Could not load history</div></div></div>
    </>
  );

  const { stats, positions, transactions } = data;

  return (
    <>
      <Navbar user={user} activePage="History" />

      <div className="page-container">
        <h1 className="page-title">Your Trading History</h1>
        <p className="page-subtitle">Track your positions, trades, and performance.</p>

        {/* Stats Cards */}
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          {[
            { label: 'Net Worth', val: fmt(stats.net_worth), color: 'orange' },
            { label: 'Balance', val: fmt(user?.balance), color: 'green' },
            { label: 'Portfolio Value', val: fmt(stats.portfolio_value), color: 'violet' },
            { label: 'Total Winnings', val: fmt(stats.total_winnings), color: 'green' },
            { label: 'Total Spent', val: fmt(stats.total_spent), color: 'red' },
            { label: 'Markets Created', val: stats.markets_created, color: 'orange' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className={`stat-value ${s.color}`}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            {[
              { key: 'positions', label: 'Active Positions', count: positions.length, color: '#10b981' },
              { key: 'transactions', label: 'Trade History', count: transactions.length, color: '#f59e0b' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '14px 16px', textAlign: 'center',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.85rem',
                  color: activeTab === tab.key ? tab.color : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === tab.key ? tab.color : 'transparent'}`,
                  transition: 'all 0.2s', marginBottom: -1,
                }}
              >
                {tab.label}
                <span style={{
                  marginLeft: 8, padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem',
                  background: activeTab === tab.key ? `${tab.color}22` : 'var(--bg-input)',
                  color: activeTab === tab.key ? tab.color : 'var(--text-muted)',
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Active Positions Tab */}
          {activeTab === 'positions' && (
            <div>
              {positions.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: 8, opacity: 0.4 }}><CoinIcon size={32} /></div>
                  <div>No active positions</div>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Start trading to see your holdings here.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th>Option</th>
                        <th style={{ textAlign: 'right' }}>Shares</th>
                        <th style={{ textAlign: 'right' }}>Probability</th>
                        <th style={{ textAlign: 'right' }}>Current Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(pos => (
                        <tr
                          key={pos.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/market/${pos.market_id}`)}
                        >
                          <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pos.market_question}
                          </td>
                          <td style={{ fontWeight: 600 }}>{pos.option_name}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{pos.shares.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-amber)' }} className="mono">
                            {(pos.fair_price * 100).toFixed(1)}%
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-green)', fontWeight: 700 }} className="mono">
                            {fmt(pos.current_value)} VC
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              {transactions.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: 8, opacity: 0.4 }}><CoinIcon size={32} /></div>
                  <div>No transactions yet</div>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Your trade history will appear here.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Market</th>
                        <th>Option</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th style={{ textAlign: 'right' }}>Shares</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => {
                        const style = txTypeStyle(tx.type);
                        return (
                          <tr key={tx.id}>
                            <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                              {new Date(tx.created_at).toLocaleDateString([], { timeZone: 'Africa/Nairobi' })} {new Date(tx.created_at).toLocaleTimeString([], { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td>
                              <span style={{
                                color: style.color, fontWeight: 700,
                                fontSize: '0.7rem', textTransform: 'uppercase',
                                padding: '2px 8px', borderRadius: 4,
                                background: `${style.color}15`,
                              }}>
                                {style.label}
                              </span>
                            </td>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.market_question || '—'}
                            </td>
                            <td>{tx.option_name || '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }} className="mono">
                              <span style={{ color: tx.type === 'buy' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                {tx.type === 'buy' ? '-' : '+'}{fmt(tx.amount_coins)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--text-muted)' }} className="mono">
                              {Number(tx.amount_shares) > 0 ? Number(tx.amount_shares).toFixed(2) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
