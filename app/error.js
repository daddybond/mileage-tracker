'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Next.js Global UI Caught Error:', error);
  }, [error]);

  return (
    <div style={{ 
      padding: '2rem', 
      margin: '2rem auto',
      maxWidth: '600px',
      width: '90%',
      background: 'rgba(255, 0, 0, 0.1)', 
      border: '1px solid red', 
      color: 'white', 
      fontFamily: 'monospace',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
      borderRadius: '8px',
      zIndex: 99999,
      position: 'relative'
    }}>
      <h2>🚨 FATAL APP CRASH 🚨</h2>
      <p><strong>Take a screenshot and send this to the developer:</strong></p>
      <hr style={{ margin: '1rem 0', borderColor: 'rgba(255,0,0,0.3)' }} />
      <p style={{ color: '#ff8888', fontWeight: 'bold' }}>{error.message}</p>
      <div style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.8, background: '#000', padding: '1rem', borderRadius: '4px' }}>
        {error.stack}
      </div>
      <button
        onClick={() => reset()}
        style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: 'red', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          width: '100%',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        RELOAD APP
      </button>
    </div>
  );
}
