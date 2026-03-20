'use client';

import { useState } from 'react';
import AddressAutocomplete from './AddressAutocomplete';

export default function TripTable({ trips, onRequestDestination, onReviewTrip, onTripUpdate }) {
  const [activeTab, setActiveTab] = useState('needs_review');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Internal filtering for the search term
  const filterTrips = (list) => {
    if (!searchTerm) return list;
    const s = searchTerm.toLowerCase();
    return list.filter(t => 
      (t.title || '').toLowerCase().includes(s) ||
      (t.destinationAddress || '').toLowerCase().includes(s) ||
      (t.destination || '').toLowerCase().includes(s)
    );
  };

  const businessTrips = trips.filter(t => t.classification === 'business');
  const needsReviewTrips = trips.filter(t => t.classification === 'needs_review');
  const personalTrips = trips.filter(t => t.classification === 'personal');

  const displayedReview = filterTrips(needsReviewTrips);
  const displayedBusiness = filterTrips(businessTrips);
  const displayedPersonal = filterTrips(personalTrips);

  const handleEditStart = (trip) => {
    setEditingId(trip.eventId);
    setEditValues({
      title: trip.title,
      destinationAddress: trip.destinationAddress || trip.destination || ''
    });
  };

  const handleEditSave = (eventId) => {
    onTripUpdate(eventId, editValues);
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Tab Header */}
      <div className="tabs-wrapper">
        <div className="tabs-list">
          <button 
            className={`tab-btn ${activeTab === 'needs_review' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('needs_review')}
          >
            🤔 Review <span className="tab-count">{needsReviewTrips.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'business' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('business')}
          >
            🚗 Business <span className="tab-count">{businessTrips.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'personal' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            🚶 Personal <span className="tab-count">{personalTrips.length}</span>
          </button>
        </div>

        <div className="tab-search-container">
          <span className="tab-search-icon">🔍</span>
          <input 
            type="text"
            className="tab-search-input"
            placeholder="Search current tab..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="trip-table-container">
        {/* Review Table */}
        {activeTab === 'needs_review' && (
          <table className="trip-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Logic</th>
                <th>AI Reasoning</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedReview.length === 0 ? (
                <tr><td colSpan="5" className="empty-state">No items found in review.</td></tr>
              ) : displayedReview.map((trip, index) => (
                <tr key={trip.eventId || index}>
                  <td><span className="trip-date">{formatDate(trip.date)}</span></td>
                  <td>
                    {editingId === trip.eventId ? (
                      <input 
                        className="form-control form-control-sm"
                        value={editValues.title}
                        onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                        autoFocus
                      />
                    ) : (
                      <div className="trip-event-name">{trip.title}</div>
                    )}
                  </td>
                  <td><span className="badge badge--pending">{trip.confidence || 0}% {trip.source || 'AI'}</span></td>
                  <td><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{trip.reasoning}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-success" onClick={() => onReviewTrip(trip.eventId, 'business')}>✓</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => onReviewTrip(trip.eventId, 'personal')}>✕</button>
                      <button className="btn btn-sm btn-danger" onClick={() => onReviewTrip(trip.eventId, 'delete')}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Business Table */}
        {activeTab === 'business' && (
          <table className="trip-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Journey</th>
                <th>Miles</th>
                <th>Cost</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedBusiness.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No business trips found.</td></tr>
              ) : displayedBusiness.map((trip, index) => (
                <tr key={trip.eventId || index}>
                  <td><span className="trip-date">{formatDate(trip.date)}</span></td>
                  <td>
                    {editingId === trip.eventId ? (
                      <input 
                        className="form-control form-control-sm"
                        value={editValues.title}
                        onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                        autoFocus
                      />
                    ) : (
                      <div className="trip-event-name">{trip.title}</div>
                    )}
                  </td>
                  <td>
                    {editingId === trip.eventId ? (
                      <AddressAutocomplete 
                        className="form-control form-control-sm"
                        value={editValues.destinationAddress}
                        onChange={(val) => setEditValues(prev => ({ ...prev, destinationAddress: val }))}
                        placeholder="Type destination..."
                      />
                    ) : (
                      <span className="trip-journey">Home → {trip.destinationAddress || 'Unknown'} → Home</span>
                    )}
                  </td>
                  <td><span className="trip-miles">{trip.roundTripMiles || 0}</span></td>
                  <td><span className="trip-cost">£{(trip.cost || 0).toFixed(2)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {editingId === trip.eventId ? (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleEditSave(trip.eventId)}>💾</button>
                          <button className="btn btn-sm btn-secondary" onClick={handleEditCancel}>✕</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleEditStart(trip)}>✏️</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => onReviewTrip(trip.eventId, 'needs_review')}>↩️</button>
                          <button className="btn btn-sm btn-danger" onClick={() => onReviewTrip(trip.eventId, 'delete')}>🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Personal Table */}
        {activeTab === 'personal' && (
          <table className="trip-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedPersonal.length === 0 ? (
                <tr><td colSpan="3" className="empty-state">No personal items found.</td></tr>
              ) : displayedPersonal.map((trip, index) => (
                <tr key={trip.eventId || index}>
                  <td><span className="trip-date">{formatDate(trip.date)}</span></td>
                  <td>{trip.title}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => onReviewTrip(trip.eventId, 'needs_review')}>↩️</button>
                      <button className="btn btn-sm btn-danger" onClick={() => onReviewTrip(trip.eventId, 'delete')}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
