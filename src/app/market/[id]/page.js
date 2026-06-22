'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';


function getPriceClass(price) {
  // Use the buy price (displayed probability) for color classification
  if (price >= 0.6) return 'high';
  if (price >= 0.3) return 'mid';
  return 'low';
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

export default function MarketPage() {
  const { id } = useParams();
  const router = useRouter();
  const [market, setMarket] = useState(null);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Trade state
  const [tradeAction, setTradeAction] = useState('buy');
  const [selectedOption, setSelectedOption] = useState(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [marketRes, userRes] = await Promise.all([
        fetch(`/api/markets/${id}`),
        fetch('/api/auth'),
      ]);
      const marketData = await marketRes.json();
      const userData = await userRes.json();
      
      if (marketData.market) {
        setMarket(marketData.market);
        setPositions(marketData.userPositions || []);
        setTrades(marketData.recentTrades || []);
        if (!selectedOption && marketData.market.options.length > 0) {
          setSelectedOption(marketData.market.options[0].id);
        }
      }
      setUser(userData.user);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }, [id, selectedOption]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTrade = async () => {
    if (!user) { setToast({ message: 'Please login first', type: 'error' }); return; }
    if (!selectedOption || !amount || Number(amount) <= 0) { setToast({ message: 'Enter a valid amount', type: 'error' }); return; }
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: id,
          option_id: selectedOption,
          action: tradeAction,
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = tradeAction === 'buy'
          ? `Bought ${data.trade.shares_received.toFixed(2)} shares for ${data.trade.coins_spent.toFixed(2)} VCoins`
          : `Sold ${data.trade.shares_sold.toFixed(2)} shares for ${data.trade.coins_received.toFixed(2)} VCoins`;
        setToast({ message: msg, type: 'success' });
        setAmount('');
        fetchData();
      } else {
        setToast({ message: data.error, type: 'error' });
      }
    } catch(e) {
      setToast({ message: 'Connection error', type: 'error' });
    }
    setSubmitting(false);
  };

  const getPreview = () => {
    if (!market || !selectedOption || !amount || Number(amount) <= 0) return null;
    const opt = market.options.find(o => o.id === selectedOption);
    if (!opt) return null;
    const amt = Number(amount);

    if (tradeAction === 'buy') {
      const fee = amt * 0.02;
      const net = amt - fee;
      const shares = net / opt.buy;
      return { shares: shares.toFixed(4), fee: fee.toFixed(2), price: opt.buy.toFixed(4), total: amt.toFixed(2) };
    } else {
      const gross = amt * opt.sell;
      const fee = gross * 0.02;
      const net = gross - fee;
      return { coins: net.toFixed(2), fee: fee.toFixed(2), price: opt.sell.toFixed(4), shares: amt };
    }
  };

  const preview = getPreview();
  const colors = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#06b6d4', '#84cc16'];

  if (loading) return (
    <>
      <Navbar user={null} activePage="Markets" />
      <div className="loading-center"><div className="spinner" /></div>
    </>
  );

  if (!market) return (
    <>
      <Navbar user={null} activePage="Markets" />
      <div className="page-container"><div className="empty-state"><div className="empty-state-text">Market not found</div></div></div>
    </>
  );

  return (
    <>
      <Navbar user={user} activePage="Markets" />

      <div className="page-container">
        <div style={{ marginBottom: 8 }}>
          <span className="market-category">{market.category}</span>
          {market.status === 'resolved' && (
            <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>RESOLVED</span>
          )}
        </div>
        <h1 className="page-title" style={{ marginBottom: 4 }}>{market.question}</h1>
        {market.description && <p className="page-subtitle">{market.description}</p>}

        <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>Total Volume Traded: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{Number(market.volume).toLocaleString()} VCoins</strong></span>
        </div>

        <div className="two-col">
          {/* LEFT: Options & Activity */}
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-secondary)' }}>OPTIONS & PROBABILITIES</h3>
              <div className="prob-bar-container" style={{ height: 10, borderRadius: 5, marginBottom: 20 }}>
                {market.options.map((opt, i) => (
                  <div key={opt.id} className="prob-bar-segment" style={{ width: `${opt.fair * 100}%`, background: colors[i % colors.length] }} />
                ))}
              </div>
              {market.options.map((opt, i) => (
                <div key={opt.id} className="option-row" style={{ marginBottom: 8, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: colors[i % colors.length] }} />
                    <span className="option-name">{opt.name}</span>
                  </div>
                  <span className={`option-price ${getPriceClass(opt.fair)}`} style={{ fontSize: '1.1rem' }}>
                    {(opt.fair * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Positions */}
            {positions.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-secondary)' }}>YOUR POSITIONS</h3>
                {positions.map((pos) => {
                  const opt = market.options.find(o => o.id === pos.option_id);
                  const value = opt ? pos.shares * opt.sell : 0;
                  return (
                    <div key={pos.id} className="position-card">
                      <div className="position-header">
                        <span className="position-name">{pos.option_name}</span>
                        <span className="position-shares">{pos.shares.toFixed(2)} shares</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Sell value: <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>{value.toFixed(2)} VC</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent Activity */}
            {trades.length > 0 && (
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-secondary)' }}>RECENT ACTIVITY</h3>
                <table className="data-table">
                  <thead>
                    <tr><th>Option</th><th>Volume</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {trades.map((tx) => (
                      <tr key={tx.id}>
                        <td>{tx.option_name}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{Number(tx.amount_coins).toFixed(2)} VC</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT: Trade Panel */}
          {market.status === 'open' && (
            <div style={{ position: 'sticky', top: 80 }}>
              <div className="trade-panel">
                <div className="trade-tabs">
                  <button className={`trade-tab ${tradeAction === 'buy' ? 'active-buy' : ''}`} onClick={() => setTradeAction('buy')}>Buy</button>
                  <button className={`trade-tab ${tradeAction === 'sell' ? 'active-sell' : ''}`} onClick={() => setTradeAction('sell')}>Sell</button>
                </div>
                <div className="trade-body">
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Select Option</label>
                    <div className="trade-option-selector">
                      {market.options.map((opt) => (
                        <button
                          key={opt.id}
                          className={`trade-option-btn ${selectedOption === opt.id ? 'selected' : ''}`}
                          onClick={() => setSelectedOption(opt.id)}
                        >
                          <span>{opt.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: tradeAction === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {(opt.fair * 100).toFixed(1)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{tradeAction === 'buy' ? 'Amount (VCoins)' : 'Shares to Sell'}</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="any"
                      placeholder={tradeAction === 'buy' ? 'Enter VCoins to spend...' : 'Enter shares to sell...'}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    {tradeAction === 'buy' && user && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {[10, 25, 50, 100].map(pct => (
                          <button key={pct} className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                            onClick={() => setAmount(String(Math.floor(Number(user.balance) * pct / 100)))}
                          >{pct}%</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {preview && (
                    <div className="trade-preview">
                      {tradeAction === 'buy' ? (
                        <>
                          <div className="trade-preview-row" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 8 }}>
                            <span className="trade-preview-label" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payout (Shares)</span>
                            <span className="trade-preview-value green" style={{ fontWeight: 800, fontSize: '1.4rem' }}>{preview.shares}</span>
                          </div>
                          <div className="trade-preview-row">
                            <span className="trade-preview-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price per share</span>
                            <span className="trade-preview-value" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{preview.price} VC</span>
                          </div>
                          <div className="trade-preview-row">
                            <span className="trade-preview-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform fee (2%)</span>
                            <span className="trade-preview-value red" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{preview.fee} VC</span>
                          </div>
                          <div className="trade-preview-row" style={{ marginTop: 4 }}>
                            <span className="trade-preview-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total cost</span>
                            <span className="trade-preview-value amber" style={{ fontSize: '0.85rem' }}>{preview.total} VC</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="trade-preview-row" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 8 }}>
                            <span className="trade-preview-label" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payout (Coins)</span>
                            <span className="trade-preview-value green" style={{ fontWeight: 800, fontSize: '1.4rem' }}>{preview.coins} VC</span>
                          </div>
                          <div className="trade-preview-row">
                            <span className="trade-preview-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price per share</span>
                            <span className="trade-preview-value" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{preview.price} VC</span>
                          </div>
                          <div className="trade-preview-row">
                            <span className="trade-preview-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform fee (2%)</span>
                            <span className="trade-preview-value red" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{preview.fee} VC</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    className={`btn ${tradeAction === 'buy' ? 'btn-green' : 'btn-red'} btn-lg`}
                    style={{ width: '100%', marginTop: 16 }}
                    disabled={submitting || !selectedOption || !amount || Number(amount) <= 0}
                    onClick={handleTrade}
                  >
                    {submitting ? 'Processing...' : tradeAction === 'buy' ? 'Buy Shares' : 'Sell Shares'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
