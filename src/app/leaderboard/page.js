'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboard').then(r => r.json()),
      fetch('/api/auth').then(r => r.json()),
    ]).then(([lb, auth]) => {
      setLeaderboard(lb.leaderboard || []);
      setUser(auth.user);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <Navbar user={user} activePage="Leaderboard" />

      <div className="page-container" style={{ maxWidth: 800 }}>
        <h1 className="page-title">Leaderboard</h1>
        <p className="page-subtitle">Top traders ranked by net worth (balance + portfolio value).</p>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : leaderboard.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">No users yet</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Rank</th>
                  <th>Trader</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'right' }}>Portfolio</th>
                  <th style={{ textAlign: 'right' }}>Net Worth</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => {
                  const isMe = user && entry.username === user.username;
                  return (
                    <tr key={entry.username} style={isMe ? { background: 'rgba(245,158,11,0.06)' } : {}}>
                      <td>
                        {i < 3 ? (
                          <div className={`leaderboard-rank rank-${i + 1}`}>{i + 1}</div>
                        ) : (
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', paddingLeft: 8 }}>{i + 1}</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                          {entry.username} {isMe && '(you)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">{Number(entry.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-violet)' }} className="mono">{Number(entry.portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-amber)', fontWeight: 700 }} className="mono">{Number(entry.net_worth).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
