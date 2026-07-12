'use client';
import { useState, useEffect } from 'react';

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

function MpesaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}>
      <circle cx="12" cy="12" r="11" fill="#00A651"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial">M</text>
    </svg>
  );
}

function KesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6M9 15h6"/>
    </svg>
  );
}

export default function WalletModal({ onClose, user, onDepositSuccess }) {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutId, setCheckoutId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    let interval;
    if (checkoutId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/wallet/status?id=${checkoutId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'completed') {
              clearInterval(interval);
              setSucceeded(true);
              setStatusMessage('Payment successful! 🎉');
              setTimeout(() => onDepositSuccess(), 2500);
            } else if (data.status === 'failed' || data.status === 'cancelled') {
              clearInterval(interval);
              setError(`Payment failed: ${data.failure_reason || 'Request was cancelled'}`);
              setCheckoutId(null);
              setLoading(false);
            }
          }
        } catch (e) { console.error(e); }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [checkoutId, onDepositSuccess]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    setError('');
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt < 1) { setError('Enter a valid amount (min KES 1)'); return; }
    if (!phone || phone.replace(/\D/g, '').length < 9) { setError('Enter a valid Safaricom number'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmt, phone: phone.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage('Check your phone and enter your M-Pesa PIN...');
        setCheckoutId(data.checkout_request_id);
      } else {
        setError(data.error || 'Failed to initiate deposit');
        setLoading(false);
      }
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const addAmount = (val) => setAmount(prev => {
    const current = parseFloat(prev) || 0;
    return String(current + val);
  });

  return (
    <>
      <style>{`
        @keyframes walletSlideIn {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes wSpin { 100% { transform: rotate(360deg); } }
        @keyframes successPop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .wallet-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .wallet-box {
          background: #111827;
          border: 1px solid #1e293b;
          border-radius: 20px;
          width: 100%; max-width: 440px;
          overflow: hidden;
          animation: walletSlideIn 0.3s ease;
          box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,93,4,0.08);
        }
        .wallet-header {
          background: linear-gradient(135deg, #1a0f1e 0%, #0f1629 100%);
          border-bottom: 1px solid #1e293b;
          padding: 20px 24px 0;
          position: relative;
        }
        .wallet-close-btn {
          position: absolute; top: 16px; right: 16px;
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #94a3b8; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .wallet-close-btn:hover { background: rgba(232,93,4,0.15); color: #e85d04; border-color: rgba(232,93,4,0.3); }
        .wallet-title { font-size: 1.25rem; font-weight: 700; color: #f8fafc; margin-bottom: 2px; }
        .wallet-subtitle { font-size: 0.85rem; color: #64748b; margin-bottom: 18px; }
        .wallet-balance-row {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(232,93,4,0.08);
          border: 1px solid rgba(232,93,4,0.15);
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }
        .wallet-balance-label { font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .wallet-balance-amount { font-size: 1.4rem; font-weight: 800; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
        .wallet-balance-amount svg { color: #e85d04; }
        .wallet-body { padding: 24px; }
        .wallet-error {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
          color: #f87171; border-radius: 10px;
          padding: 12px 16px; font-size: 0.85rem; margin-bottom: 16px;
        }
        .wallet-label { font-size: 0.78rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .wallet-amount-input-row {
          display: flex; align-items: center;
          background: #0f1629; border: 1px solid #1e293b;
          border-radius: 12px; overflow: hidden;
          margin-bottom: 12px; transition: border-color 0.2s;
        }
        .wallet-amount-input-row:focus-within { border-color: rgba(232,93,4,0.5); }
        .wallet-amount-btn {
          width: 44px; height: 50px; flex-shrink: 0;
          background: rgba(255,255,255,0.04);
          border: none; color: #94a3b8; font-size: 22px;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .wallet-amount-btn:hover { background: rgba(232,93,4,0.15); color: #e85d04; }
        .wallet-amount-input {
          flex: 1; background: transparent; border: none;
          color: #f8fafc; font-size: 1.3rem; font-weight: 700;
          text-align: center; outline: none; padding: 0 8px;
          font-family: inherit; height: 50px;
        }
        .wallet-amount-input::placeholder { color: #334155; font-weight: 400; font-size: 1rem; }
        .wallet-chips {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 8px; margin-bottom: 20px;
        }
        .wallet-chip {
          padding: 10px 6px; border-radius: 10px;
          background: #1a2035; border: 1px solid #1e293b;
          color: #94a3b8; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; text-align: center;
        }
        .wallet-chip:hover { background: rgba(232,93,4,0.15); border-color: rgba(232,93,4,0.4); color: #e85d04; }
        .wallet-chip.active { background: rgba(232,93,4,0.2); border-color: #e85d04; color: #f8fafc; }
        .wallet-phone-input {
          width: 100%; background: #0f1629;
          border: 1px solid #1e293b; border-radius: 12px;
          color: #f8fafc; font-size: 1rem; font-family: inherit;
          padding: 14px 16px; outline: none; margin-bottom: 6px;
          transition: border-color 0.2s;
        }
        .wallet-phone-input:focus { border-color: rgba(232,93,4,0.5); }
        .wallet-phone-input::placeholder { color: #334155; }
        .wallet-phone-hint { font-size: 0.75rem; color: #475569; margin-bottom: 20px; }
        .wallet-submit-btn {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #e85d04, #f4701b);
          border: none; border-radius: 12px;
          color: white; font-size: 1rem; font-weight: 700;
          cursor: pointer; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s; box-shadow: 0 4px 20px rgba(232,93,4,0.3);
        }
        .wallet-submit-btn:hover:not(:disabled) { background: linear-gradient(135deg, #f4701b, #f97316); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(232,93,4,0.4); }
        .wallet-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .wallet-pending {
          padding: 32px 24px; text-align: center;
        }
        .wallet-spinner {
          width: 52px; height: 52px;
          border: 4px solid #1e293b;
          border-top-color: #e85d04;
          border-radius: 50%;
          animation: wSpin 1s linear infinite;
          margin: 0 auto 20px;
        }
        .wallet-pending-title { font-size: 1.1rem; font-weight: 700; color: #f8fafc; margin-bottom: 10px; }
        .wallet-pending-msg { font-size: 0.9rem; color: #e85d04; font-weight: 500; line-height: 1.5; }
        .wallet-success-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(16,185,129,0.15); border: 2px solid #10b981;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px; animation: successPop 0.5s ease;
          font-size: 28px;
        }
        .wallet-success-msg { font-size: 0.9rem; color: #10b981; font-weight: 600; }
        .wallet-divider { border: none; border-top: 1px solid #1e293b; margin: 20px 0; }
        .wallet-secure-note { font-size: 0.72rem; color: #334155; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; }
      `}</style>

      <div className="wallet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="wallet-box">

          {/* Header */}
          <div className="wallet-header">
            <button className="wallet-close-btn" onClick={onClose}>×</button>
            <div className="wallet-title">Deposit Funds</div>
            <div className="wallet-subtitle">Top up your Strike Markets account via M-Pesa</div>

            <div className="wallet-balance-row">
              <div>
                <div className="wallet-balance-label">Account Balance</div>
                <div className="wallet-balance-amount">
                  <KesIcon />
                  KES {Number(user?.balance || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ fontSize: '2rem' }}>💰</div>
            </div>
          </div>

          {/* Body */}
          <div className="wallet-body">
            {checkoutId ? (
              <div className="wallet-pending">
                {succeeded ? (
                  <>
                    <div className="wallet-success-icon">✓</div>
                    <div className="wallet-pending-title" style={{ color: '#10b981' }}>Deposit Confirmed!</div>
                    <p className="wallet-success-msg">KES {parseFloat(amount).toLocaleString()} has been added to your account.</p>
                  </>
                ) : (
                  <>
                    <div className="wallet-spinner"></div>
                    <div className="wallet-pending-title">Waiting for Payment</div>
                    <p className="wallet-pending-msg">{statusMessage}</p>
                    <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: 12 }}>
                      Do not close this window. This may take up to 60 seconds.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleDeposit}>
                {error && <div className="wallet-error">⚠ {error}</div>}

                {/* Amount */}
                <div className="wallet-label">Enter Amount (KES)</div>
                <div className="wallet-amount-input-row">
                  <button type="button" className="wallet-amount-btn" onClick={() => setAmount(v => String(Math.max(0, (parseFloat(v) || 0) - 50)))} tabIndex={-1}>−</button>
                  <input
                    className="wallet-amount-input"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                  />
                  <button type="button" className="wallet-amount-btn" onClick={() => addAmount(50)} tabIndex={-1}>+</button>
                </div>

                {/* Quick chips */}
                <div className="wallet-chips">
                  {QUICK_AMOUNTS.map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`wallet-chip ${parseFloat(amount) === v ? 'active' : ''}`}
                      onClick={() => setAmount(String(v))}
                    >
                      +{v.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Phone */}
                <div className="wallet-label">M-Pesa Phone Number</div>
                <input
                  className="wallet-phone-input"
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <div className="wallet-phone-hint">Enter your Safaricom number. Auto-normalized to 254XXXXXXXXX.</div>

                <button className="wallet-submit-btn" type="submit" disabled={loading}>
                  <MpesaIcon />
                  {loading ? 'Sending STK Push...' : `Deposit ${amount ? `KES ${parseFloat(amount).toLocaleString()}` : 'via M-Pesa'}`}
                </button>

                <hr className="wallet-divider" />
                <div className="wallet-secure-note">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Secured · Powered by PayNexus & Safaricom M-Pesa
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
