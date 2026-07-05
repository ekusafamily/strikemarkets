'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const CATEGORIES = ['General', 'Crypto', 'Politics', 'Tech', 'Sports', 'Entertainment', 'Science', 'Finance'];

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

export default function CreatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [endDate, setEndDate] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => { if (!d.user) router.push('/'); else setUser(d.user); });
  }, [router]);

  const addOption = () => { if (options.length < 10) setOptions([...options, '']); };
  const removeOption = (i) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i, v) => { const n = [...options]; n[i] = v; setOptions(n); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) { setToast({ message: 'Need at least 2 options', type: 'error' }); return; }
    if (question.trim().length < 5) { setToast({ message: 'Question too short', type: 'error' }); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, description, category, end_date: endDate || null, options: validOptions }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Market created! 100 VCoins deducted as seed liquidity.', type: 'success' });
        // Refresh user to update balance in navbar
        fetch('/api/auth').then(r => r.json()).then(d => { if (d.user) setUser(d.user); });
        setTimeout(() => router.push(`/market/${data.market.id}`), 1500);
      } else {
        setToast({ message: data.error, type: 'error' });
      }
    } catch(e) {
      setToast({ message: 'Error creating market', type: 'error' });
    }
    setSubmitting(false);
  };

  if (!user) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      <Navbar user={user} activePage="Create" />

      <div className="page-container" style={{ maxWidth: 700 }}>
        <h1 className="page-title">Create a Market</h1>
        <p className="page-subtitle">Ask a question about the future and let the crowd predict the outcome.</p>

        <div style={{ background: 'rgba(232,93,4,0.1)', border: '1px solid rgba(232,93,4,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: 'var(--accent-orange)' }}>
          <strong>⚡ Cost: 100 VCoins</strong> — Deducted as seed liquidity for your market. Refunded when the market is resolved or voided.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Question</label>
              <input className="form-input" placeholder="Will Bitcoin reach $100k by December 2026?" value={question} onChange={(e) => setQuestion(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-textarea" placeholder="Add more context..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">End Date (optional)</label>
                <input className="form-input" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: 16, color: 'var(--text-secondary)' }}>OPTIONS ({options.length}/10)</h3>
            {options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  className="form-input"
                  placeholder={`Option ${i + 1}...`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                {options.length > 2 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeOption(i)} style={{ flexShrink: 0 }}>✕</button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={addOption}>+ Add Option</button>
            )}
          </div>

          <button type="submit" className="btn btn-amber btn-lg" style={{ width: '100%' }} disabled={submitting || (user && Number(user.balance) < 100)}>
            {submitting ? 'Creating...' : 'Create Market — 100 VCoins'}
          </button>
          {user && Number(user.balance) < 100 && (
            <div style={{ textAlign: 'center', color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: 8 }}>
              Insufficient balance. You need at least 100 VCoins to create a market.
            </div>
          )}
        </form>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
