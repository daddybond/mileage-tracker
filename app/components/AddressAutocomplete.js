'use client';

import { useState, useEffect, useRef } from 'react';

export default function AddressAutocomplete({ value, onChange, placeholder, className, autoFocus = false }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
    if (autoFocus && typeof value === 'string' && value.length > 2) {
      fetchSuggestions(value);
    }
  }, [value, autoFocus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (input) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      setSuggestions(data.predictions || []);
      setShowDropdown(true);
    } catch (err) {
      console.error('Autocomplete fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val); // Update parent immediately
    
    // Debounce fetch
    const timeoutId = setTimeout(() => fetchSuggestions(val), 300);
    return () => clearTimeout(timeoutId);
  };

  const handleSelect = (suggestion) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    setShowDropdown(false);
    onChange(suggestion.description);
  };

  return (
    <div className="autocomplete-container" style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <input
        type="text"
        className={className}
        value={inputValue}
        onChange={handleChange}
        onFocus={() => {
          if (inputValue.length > 2 && suggestions.length === 0) {
            fetchSuggestions(inputValue);
          } else if (suggestions.length > 0) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
      />
      
      {showDropdown && suggestions.length > 0 && (
        <ul className="autocomplete-dropdown shadow-lg" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          marginTop: '4px',
          padding: '0.5rem 0',
          listStyle: 'none',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {suggestions.map((s) => (
            <li 
              key={s.id}
              onClick={() => handleSelect(s)}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                transition: 'background 0.2s',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-glass)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <div style={{ fontWeight: '500' }}>{s.main_text}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.secondary_text}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
