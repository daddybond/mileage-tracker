'use client';

import { useState, useEffect, useRef } from 'react';

export default function DestinationPrompt({ trip, onSubmit, onCancel }) {
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
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

    try {
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      const data = await res.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const handleInputChange = (val) => {
    setDestination(val);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion) => {
    setDestination(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination.trim()) return;
    setLoading(true);
    await onSubmit(trip, destination.trim());
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="modal-title">📍 Missing Destination</div>
        <div className="modal-description">
          This looks like a business trip, but I don&apos;t have a destination. Where did you go?
        </div>

        <div className="modal-event-highlight">
          <div className="modal-event-date">{formatDate(trip.date)}</div>
          <div className="modal-event-name">{trip.title}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="destination-input">
              Destination address or venue name
            </label>
            <div className="autocomplete-container" ref={suggestionsRef}>
              <input
                id="destination-input"
                type="text"
                className="form-input"
                placeholder="e.g. Ashfield House, Wigan or M1 5QS"
                value={destination}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => destination.length >= 3 && setShowSuggestions(true)}
                autoFocus
                autoComplete="off"
                disabled={loading}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-list">
                  {suggestions.map((s) => (
                    <div 
                      key={s.id} 
                      className="suggestion-item"
                      onClick={() => handleSelectSuggestion(s)}
                    >
                      <div className="suggestion-main">{s.main_text}</div>
                      <div className="suggestion-secondary">{s.secondary_text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onCancel}
              disabled={loading}
            >
              Skip
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!destination.trim() || loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Calculating...
                </>
              ) : (
                <>
                  🗺️ Calculate Mileage
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
