'use client';

import { useState, useMemo } from 'react';
import AddressAutocomplete from './AddressAutocomplete';

export default function TripTable({ trips, onRequestDestination, onReviewTrip, onTripUpdate }) {
  const [activeTab, setActiveTab] = useState('needs_review');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Memoize everything to save memory
  const { displayedReview, displayedBusiness, displayedPersonal, totalOriginal } = useMemo(() => {
    const businessTrips = trips.filter(t => t.classification === 'business');
    const needsReviewTrips = trips.filter(t => t.classification === 'needs_review');
    const personalTrips = trips.filter(t => t.classification === 'personal');

    const filter = (list) => {
      if (!searchTerm) return list;
      const s = searchTerm.toLowerCase();
      return list.filter(t => 
        (t.title || '').toLowerCase().includes(s) ||
        (t.destinationAddress || '').toLowerCase().includes(s) ||
        (t.destination || '').toLowerCase().includes(s)
      );
    };

    return {
      displayedReview: filter(needsReviewTrips),
      displayedBusiness: filter(businessTrips),
      totalOriginal: {
        review: needsReviewTrips.length,
        business: businessTrips.length
      }
    };
  }, [trips, searchTerm]);

  const activeTrips = activeTab === 'needs_review' ? displayedReview : displayedBusiness;

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
    if (!dateStr) return 'No Date';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    return d.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="glass-card animate-in" style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Tab Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="glass-pill" style={{ display: 'flex', padding: '0.25rem', marginBottom: '1rem' }}>
          <button 
            className="tab-btn"
            onClick={() => setActiveTab('needs_review')}
            style={{ 
              flex: 1, padding: '0.6rem', borderRadius: '999px', border: 'none', background: activeTab === 'needs_review' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'needs_review' ? 'white' : 'var(--muted)', fontSize: '0.85rem', fontWeight: '600'
            }}
          >
            Review <span style={{ opacity: 0.5 }}>{totalOriginal.review}</span>
          </button>
          <button 
            className="tab-btn"
            onClick={() => setActiveTab('business')}
            style={{ 
              flex: 1, padding: '0.6rem', borderRadius: '999px', border: 'none', background: activeTab === 'business' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'business' ? 'white' : 'var(--muted)', fontSize: '0.85rem', fontWeight: '600'
            }}
          >
            Business <span style={{ opacity: 0.5 }}>{totalOriginal.business}</span>
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input 
            type="text"
            placeholder="Search journeys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.03)' }}
          />
        </div>
      </div>

      <div className="trip-table-container " style={{ overflowX: 'auto' }}>
        {/* Review Table */}
        {activeTab === 'needs_review' && (
          <table className="trip-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--muted)' }}>
                <th style={{ padding: '1rem' }}>DATE</th>
                <th style={{ padding: '1rem' }}>EVENT & REASON</th>
                <th style={{ padding: '1rem' }}>CONFIDENCE</th>
                <th style={{ padding: '1rem' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {activeTrips.length === 0 ? (
                <tr><td colSpan="4" className="empty-state">No items found in review.</td></tr>
              ) : activeTrips.map((trip, index) => (
                <tr key={trip.eventId || index}>
                  <td><span className="trip-date">{formatDate(trip.date)}</span></td>
                  <td>
                    <div className="trip-event-name">{trip.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{trip.reasoning}</div>
                  </td>
                  <td><span className="badge badge--pending">{trip.confidence || 0}% {trip.source || 'AI'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-success" onClick={() => onReviewTrip(trip.eventId, 'business')}>✓ Business</button>
                      <button className="btn btn-sm btn-danger" onClick={() => onReviewTrip(trip.eventId, 'delete')}>🗑️ Ignore</button>
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
              {activeTrips.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No business trips found.</td></tr>
              ) : activeTrips.map((trip, index) => (
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

      </div>
    </div>
  );
}
