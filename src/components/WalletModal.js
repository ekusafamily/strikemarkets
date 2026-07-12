import { useState, useEffect } from 'react';

function CoinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: 4 }}>
      <circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6M9 15h6"/>
    </svg>
  );
}

export default function WalletModal({ onClose, user, onDepositSuccess }) {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('07');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // polling state
  const [checkoutId, setCheckoutId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

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
              setStatusMessage('Payment successful!');
              setTimeout(() => {
                onDepositSuccess();
              }, 2000);
            } else if (data.status === 'failed' || data.status === 'cancelled') {
              clearInterval(interval);
              setError(`Payment failed: ${data.failure_reason || 'Unknown reason'}`);
              setCheckoutId(null);
              setLoading(false);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [checkoutId, onDepositSuccess]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    setError('');
    
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt < 1) {
      setError('Please enter a valid amount (min 1 KES)');
      return;
    }
    if (phone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setStatusMessage('Initiating M-Pesa push...');

    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmt, phone })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage('Please check your phone and enter your M-Pesa PIN...');
        setCheckoutId(data.checkout_request_id);
      } else {
        setError(data.error || 'Failed to initiate deposit');
        setLoading(false);
        setStatusMessage('');
      }
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal wallet-modal">
        <button className="auth-close" onClick={onClose}>&times;</button>
        <div className="auth-header">
          <h2>Deposit KES</h2>
          <p>Add real money to your Strike Markets wallet</p>
        </div>

        <div className="wallet-balance-display" style={{ textAlign: 'center', padding: '20px', background: 'var(--bg-input)', borderRadius: '12px', margin: '20px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Current Balance</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            <CoinIcon />
            {Number(user?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="auth-body">
          {error && <div className="auth-error">{error}</div>}
          
          {checkoutId ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div className="spinner" style={{ margin: '0 auto 20px', width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--accent-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <h3 style={{ color: 'var(--text-primary)' }}>Waiting for Payment</h3>
              <p style={{ color: 'var(--accent-orange)', fontWeight: '500', marginTop: '10px' }}>{statusMessage}</p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <form onSubmit={handleDeposit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Amount (KES)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">M-Pesa Phone Number</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-amber btn-lg" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                {loading ? 'Processing...' : 'Deposit via M-Pesa'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
