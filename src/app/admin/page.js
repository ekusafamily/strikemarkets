'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

function StatusBadge({ status, winnerName }) {
  const styles = {
    open:     { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'OPEN' },
    resolved: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: winnerName ? `STRUCK: ${winnerName}` : 'STRUCK' },
    canceled: { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', label: 'VOIDED' },
  };
  const s = styles[status] || styles.open;
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color, letterSpacing: '0.08em', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function ChartBarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: 420, padding: 32 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: 12, color: danger ? 'var(--accent-red)' : 'var(--text-primary)' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-red' : 'btn-orange'}`} style={{ flex: 1 }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [allMarkets, setAllMarkets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'resolved' | 'canceled'
  const [striking, setStriking] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, marketId, optionId?, marketQuestion }

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchData = useCallback(async () => {
    try {
      const [authRes, statsRes, marketsRes] = await Promise.all([
        fetch('/api/auth').then(r => r.json()),
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/admin/markets').then(r => r.json()),
      ]);

      if (!authRes.user?.is_admin) { router.push('/'); return; }
      setUser(authRes.user);
      setStats(statsRes.stats);
      setTransactions(statsRes.recent_transactions || []);
      setAllMarkets(marketsRes.markets || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStrike = async (marketId, optionId) => {
    setStriking(marketId);
    setConfirm(null);
    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId, winning_option_id: optionId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Market struck! House rake: ${data.resolution.houseRake.toFixed(2)} VC | ${data.resolution.winnersCount} winners paid out`);
        fetchData();
      } else {
        showToast(data.error, 'error');
      }
    } catch {
      showToast('Error striking market', 'error');
    }
    setStriking(null);
  };

  const handleVoid = async (marketId) => {
    setConfirm(null);
    setStriking(marketId);
    try {
      const res = await fetch('/api/admin/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Market voided — ${data.refund_count} users refunded`);
        fetchData();
      } else {
        showToast(data.error, 'error');
      }
    } catch {
      showToast('Error voiding market', 'error');
    }
    setStriking(null);
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const filteredMarkets = allMarkets.filter(m => m.status === activeTab);
  const openCount = allMarkets.filter(m => m.status === 'open').length;
  const resolvedCount = allMarkets.filter(m => m.status === 'resolved').length;
  const canceledCount = allMarkets.filter(m => m.status === 'canceled').length;

  if (loading) return (
    <>
      <Navbar user={null} activePage="Admin" />
      <div className="loading-center"><div className="spinner" /></div>
    </>
  );

  return (
    <>
      <Navbar
        user={user}
        onLogout={async () => { await fetch('/api/auth', { method: 'DELETE' }); router.push('/'); }}
        activePage="Admin"
      />

      <div className="page-container">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform metrics, market management & strike controls.</p>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: 36 }}>
          {[
            { label: 'Total Trade Volume', val: fmt(stats?.total_volume), color: 'orange', sub: 'VCoins traded' },
            { label: 'Total House Profit', val: fmt(stats?.total_house_profit), color: 'green', sub: 'All revenue combined' },
            { label: 'Transaction Fees (2%)', val: fmt(stats?.total_fees), color: 'violet', sub: 'From buy/sell trades' },
            { label: 'Spread & Markup Profit', val: fmt(stats?.total_spread_profit), color: 'orange', sub: '20% overround/markdown' },
            { label: 'Resolution Rake (20%)', val: fmt(stats?.total_resolution_rake), color: 'red', sub: 'From struck markets' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className={`stat-value ${s.color}`}>{s.val}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Market Strike Panel */}
        <div className="card" style={{ marginBottom: 32, padding: 0, overflow: 'hidden' }}>
          {/* Panel header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ChartBarIcon />
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                MARKET STRIKE PANEL
              </h3>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {allMarkets.length} total markets
            </div>
          </div>

          {/* Status tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            {[
              { key: 'open',     label: 'Open Markets',     count: openCount,     color: '#3b82f6' },
              { key: 'resolved', label: 'Struck Markets',   count: resolvedCount, color: '#10b981' },
              { key: 'canceled', label: 'Voided Markets',   count: canceledCount, color: '#ef4444' },
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

          {/* Markets list */}
          <div>
            {filteredMarkets.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 12 }}>
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
                <div>No {activeTab} markets</div>
              </div>
            ) : (
              filteredMarkets.map((m, idx) => (
                <div
                  key={m.id}
                  style={{
                    padding: '20px 24px',
                    borderBottom: idx < filteredMarkets.length - 1 ? '1px solid var(--border-color)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span className="market-category">{m.category}</span>
                        <StatusBadge status={m.status} winnerName={m.winner_name} />
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.4 }}>{m.question}</div>
                      {m.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{m.description}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-orange)' }}>{fmt(m.total_pool)} VC</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vol: {fmt(m.volume)}</div>
                    </div>
                  </div>

                  {/* Options + Actions (open markets only) */}
                  {m.status === 'open' && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Strike outcome — choose winner:
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        {m.options.map(opt => (
                          <button
                            key={opt.id}
                            className="btn btn-sm"
                            disabled={striking === m.id}
                            onClick={() => setConfirm({
                              type: 'strike',
                              marketId: m.id,
                              optionId: opt.id,
                              marketQuestion: m.question,
                              optionName: opt.name,
                            })}
                            style={{
                              background: 'rgba(229,92,4,0.12)',
                              border: '1px solid rgba(229,92,4,0.35)',
                              color: 'var(--accent-orange)',
                              fontWeight: 700,
                            }}
                          >
                            {striking === m.id ? '...' : `⚡ Strike: ${opt.name}`} ({(opt.fair * 100).toFixed(0)}%)
                          </button>
                        ))}
                      </div>
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={striking === m.id}
                        onClick={() => setConfirm({
                          type: 'void',
                          marketId: m.id,
                          marketQuestion: m.question,
                        })}
                        style={{ color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.3)' }}
                      >
                        Void & Refund All
                      </button>
                    </div>
                  )}

                  {/* Show resolution info for resolved markets */}
                  {m.status === 'resolved' && m.winner_name && (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.07)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--accent-green)' }}>
                      Winner: <strong>{m.winner_name}</strong>
                    </div>
                  )}

                  {m.status === 'canceled' && (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.07)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--accent-red)' }}>
                      Market voided — all users refunded
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>RECENT TRANSACTIONS</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th><th>User</th><th>Type</th><th>Market</th>
                  <th>Option</th><th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Fee</th><th style={{ textAlign: 'right' }}>House Profit</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(tx.created_at).toLocaleString()}</td>
                    <td>{tx.username}</td>
                    <td>
                      <span style={{
                        color: tx.type === 'buy' ? 'var(--accent-green)'
                          : tx.type === 'sell' ? 'var(--accent-red)'
                          : 'var(--accent-violet)',
                        fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem',
                      }}>{tx.type}</span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.question}</td>
                    <td>{tx.option_name}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{Number(tx.amount_coins).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-violet)' }} className="mono">{Number(tx.fee_coins).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-green)' }} className="mono">{Number(tx.house_profit).toFixed(2)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation dialogs */}
      {confirm?.type === 'strike' && (
        <ConfirmDialog
          title="Strike Market"
          message={`Declare "${confirm.optionName}" as the winner for "${confirm.marketQuestion}"? The house takes 20% rake and winners are paid out. This cannot be undone.`}
          confirmLabel="Strike It"
          onConfirm={() => handleStrike(confirm.marketId, confirm.optionId)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'void' && (
        <ConfirmDialog
          title="Void Market"
          message={`Void "${confirm.marketQuestion}"? All users will be refunded their net coins spent. This cannot be undone.`}
          confirmLabel="Void & Refund"
          danger
          onConfirm={() => handleVoid(confirm.marketId)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
