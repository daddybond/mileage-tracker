'use client';
import { useState } from 'react';
import { DEFAULT_INDICATORS } from '@/lib/learning-engine';

export default function LearningSettings({ customKeywords, onSave, onCancel }) {
  const indicators = customKeywords || DEFAULT_INDICATORS;
  const [bizKeywords, setBizKeywords] = useState(indicators.business);
  const [persKeywords, setPersKeywords] = useState(indicators.personal);
  const [newBiz, setNewBiz] = useState('');
  const [newPers, setNewPers] = useState('');

  const addKeyword = (type) => {
    if (type === 'business' && newBiz.trim()) {
      if (!bizKeywords.includes(newBiz.trim().toLowerCase())) {
        setBizKeywords([...bizKeywords, newBiz.trim().toLowerCase()]);
      }
      setNewBiz('');
    } else if (type === 'personal' && newPers.trim()) {
      if (!persKeywords.includes(newPers.trim().toLowerCase())) {
        setPersKeywords([...persKeywords, newPers.trim().toLowerCase()]);
      }
      setNewPers('');
    }
  };

  const removeKeyword = (type, keyword) => {
    if (type === 'business') {
      setBizKeywords(bizKeywords.filter(k => k !== keyword));
    } else {
      setPersKeywords(persKeywords.filter(k => k !== keyword));
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 className="modal-title" style={{ fontSize: '1.5rem' }}>Smart Learning Settings</h2>
            <p className="modal-description" style={{ marginBottom: 0 }}>
              Manage the keywords the AI uses to automatically classify your trips.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>✕ Close</button>
        </div>

        <div className="keyword-grid">
          {/* Business Keywords */}
          <div className="card" style={{ borderTop: '3px solid var(--success)' }}>
            <h3 className="form-label" style={{ color: 'var(--success)', marginBottom: '1rem' }}>Business Indicators</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. client, project..." 
                value={newBiz}
                onChange={(e) => setNewBiz(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword('business')}
              />
              <button className="btn btn-primary btn-sm" onClick={() => addKeyword('business')}>Add</button>
            </div>
            <div className="keyword-list">
              {bizKeywords.map(kw => (
                <span key={kw} className="keyword-tag">
                  {kw}
                  <span className="keyword-tag-remove" onClick={() => removeKeyword('business', kw)}>✕</span>
                </span>
              ))}
            </div>
          </div>

          {/* Personal Keywords */}
          <div className="card" style={{ borderTop: '3px solid var(--error)' }}>
            <h3 className="form-label" style={{ color: 'var(--error)', marginBottom: '1rem' }}>Personal Indicators</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. gym, family..." 
                value={newPers}
                onChange={(e) => setNewPers(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword('personal')}
              />
              <button className="btn btn-primary btn-sm" onClick={() => addKeyword('personal')}>Add</button>
            </div>
            <div className="keyword-list">
              {persKeywords.map(kw => (
                <span key={kw} className="keyword-tag">
                  {kw}
                  <span className="keyword-tag-remove" onClick={() => removeKeyword('personal', kw)}>✕</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Discard Changes</button>
          <button 
            className="btn btn-primary" 
            onClick={() => onSave({ business: bizKeywords, personal: persKeywords })}
          >
            Save AI Rules
          </button>
        </div>
      </div>
    </div>
  );
}
