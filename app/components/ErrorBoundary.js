'use client';

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary Caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
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
              {this.state.error && this.state.error.toString()}
            </div>

            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: '#f43f5e' }}
            >
              <span>🔄</span> Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
