'use client';

export default function AuthButton({ authenticated, loading }) {
  const handleConnect = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDisconnect = async () => {
    await fetch('/api/auth/status', { method: 'DELETE' });
    window.location.reload();
  };

  if (loading) {
    return (
      <button className="btn btn-secondary" disabled>
        <span className="spinner"></span>
        Checking...
      </button>
    );
  }

  if (authenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div className="glass-pill" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.6rem' }}>●</span> Connected
        </div>
        <button 
          onClick={handleDisconnect}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: '500', padding: '0.4rem' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className="btn-primary" onClick={handleConnect} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '1.2rem' }}>📅</span>
      Connect Google Calendar
    </button>
  );
}
