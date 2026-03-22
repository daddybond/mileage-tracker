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
        <div style={{ 
          padding: '2rem', 
          margin: '2rem auto',
          maxWidth: '100%',
          background: 'rgba(255, 0, 0, 0.1)', 
          border: '1px solid red', 
          color: 'white', 
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
          borderRadius: '8px'
        }}>
          <h2>🚨 FATAL REACT CRASH 🚨</h2>
          <p><strong>Please send this exact text to the developer:</strong></p>
          <hr style={{ margin: '1rem 0', borderColor: 'rgba(255,0,0,0.3)' }} />
          <p style={{ color: '#ff8888', fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <div style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.8 }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '2rem', 
              padding: '1rem', 
              background: 'red', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              width: '100%',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            RELOAD APP
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
