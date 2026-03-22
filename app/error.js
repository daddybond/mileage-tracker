'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Next.js Global UI Caught Error:', error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="glass-card animate-in" style={{ 
        padding: '2.5rem', 
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        boxShadow: '0 20px 40px -10px rgba(244, 63, 94, 0.15)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#fff' }}>Application Error</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          We encountered an unexpected layout issue. Please reload the dashboard to continue.
        </p>

        <div style={{ 
          background: 'rgba(0,0,0,0.4)', 
          padding: '1rem', 
          borderRadius: '8px', 
          fontSize: '0.75rem', 
          color: '#f43f5e', 
          textAlign: 'left',
          overflowX: 'auto',
          marginBottom: '2rem',
          fontFamily: 'monospace'
        }}>
          {error.message}
        </div>

        <button
          className="btn-primary"
          onClick={() => reset()}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: '#f43f5e' }}
        >
          <span>🔄</span> Reload Application
        </button>
      </div>
    </div>
  );
}
