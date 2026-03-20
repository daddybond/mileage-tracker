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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="badge badge--business">✓ Connected</span>
        <button className="btn btn-sm btn-danger" onClick={handleDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className="btn btn-primary" onClick={handleConnect}>
      <span className="btn-icon">📅</span>
      Connect Google Calendar
    </button>
  );
}
