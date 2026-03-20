'use client';

import { useState } from 'react';

export default function ManualTripModal({ isOpen, onClose, onSubmit }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !destination) return;
    onSubmit({
      date,
      title,
      destination,
      eventId: `manual-${Date.now()}`,
      classification: 'business', // Default to business for manual mileage
      source: 'Manual Entry'
    });
    // Reset and close
    setTitle('');
    setDestination('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 style={{ marginBottom: '1.5rem', color: '#f8fafc' }}>➕ Add Manual Journey</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Date</label>
            <input 
              type="date" 
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Event / Description</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. Client Meeting - Manchester"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Destination</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Enter address or venue"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Add Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
