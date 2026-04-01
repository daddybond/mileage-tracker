'use client';

import { useState, useEffect, useMemo } from 'react';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { loadTrips, saveAllTrips, deleteTrip as dbDeleteTrip } from '../../lib/supabase';
import { MILEAGE_RATE } from '../../lib/constants';

function getTaxYearBounds(offset = 0) {
  const now = new Date();
  const year = now.getMonth() >= 3 // April = month 3 (0-indexed)
    ? now.getFullYear() + offset
    : now.getFullYear() - 1 + offset;
  return {
    start: `${year}-04-06`,
    end: `${year + 1}-04-05`,
  };
}

function getPresetDates(preset) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    return { start, end: today };
  }
  if (preset === 'last_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] };
  }
  if (preset === 'this_tax_year') return getTaxYearBounds(0);
  if (preset === 'last_tax_year') return getTaxYearBounds(-1);
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DatabasePage() {
  const [allTrips, setAllTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Init with current tax year
  useEffect(() => {
    const { start, end } = getTaxYearBounds(0);
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    loadTrips().then(trips => {
      setAllTrips(trips.filter(t => t.classification === 'business'));
      setLoading(false);
    });
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const applyPreset = (preset) => {
    const dates = getPresetDates(preset);
    if (dates) { setStartDate(dates.start); setEndDate(dates.end); }
  };

  const filtered = useMemo(() => {
    return allTrips.filter(t => {
      const d = t.date ? t.date.split('T')[0] : '';
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          (t.title || '').toLowerCase().includes(s) ||
          (t.destinationAddress || '').toLowerCase().includes(s) ||
          (t.destination || '').toLowerCase().includes(s)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allTrips, startDate, endDate, search]);

  const totals = useMemo(() => ({
    miles: filtered.reduce((s, t) => s + (Number(t.roundTripMiles) || 0), 0),
    cost: filtered.reduce((s, t) => s + (Number(t.cost) || 0), 0),
    count: filtered.length,
  }), [filtered]);

  const handleEditStart = (trip) => {
    setEditingId(trip.eventId);
    setEditValues({ title: trip.title, destinationAddress: trip.destinationAddress || trip.destination || '' });
  };

  const handleEditSave = async (eventId) => {
    setSaving(true);
    const trip = allTrips.find(t => t.eventId === eventId);
    let updates = { title: editValues.title };

    if (editValues.destinationAddress && editValues.destinationAddress !== (trip.destinationAddress || trip.destination)) {
      try {
        const res = await fetch('/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: editValues.destinationAddress }),
        });
        if (res.ok) {
          const dist = await res.json();
          updates.destinationAddress = dist.destinationAddress;
          updates.destination = dist.destinationAddress;
          updates.roundTripMiles = dist.roundTripMiles;
          updates.cost = dist.cost;
          updates.duration = dist.duration;
        } else {
          updates.destinationAddress = editValues.destinationAddress;
        }
      } catch {
        updates.destinationAddress = editValues.destinationAddress;
      }
    } else {
      updates.destinationAddress = editValues.destinationAddress;
    }

    const updated = allTrips.map(t => t.eventId === eventId ? { ...t, ...updates } : t);
    setAllTrips(updated);
    await saveAllTrips(updated);
    setEditingId(null);
    setSaving(false);
    showToast('Trip updated.');
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Remove this trip from the database permanently?')) return;
    await dbDeleteTrip(eventId);
    setAllTrips(prev => prev.filter(t => t.eventId !== eventId));
    showToast('Trip deleted.');
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) { showToast('No trips to export.', 'error'); return; }
    const headers = ['Date', 'Event', 'Destination', 'Miles (Round Trip)', 'Cost (£)'];
    const rows = filtered.map(t => [
      new Date(t.date).toLocaleDateString('en-GB'),
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.destinationAddress || t.destination || '').replace(/"/g, '""')}"`,
      t.roundTripMiles != null ? t.roundTripMiles : '',
      t.cost != null ? Number(t.cost).toFixed(2) : '',
    ]);
    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      ['TOTAL', '', '', totals.miles.toFixed(1), `£${totals.cost.toFixed(2)}`].join(','),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mileage_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} trips.`);
  };

  return (
    <>
      <div className="app-background" />

      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
          </div>
        </div>
      )}

      <div className="app-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>

        {/* Page header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Trip Database</h1>
          <p className="sub-heading">All confirmed business trips. Edit or delete any record.</p>
        </div>

        {/* Filters */}
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'This Month', value: 'this_month' },
              { label: 'Last Month', value: 'last_month' },
              { label: 'This Tax Year', value: 'this_tax_year' },
              { label: 'Last Tax Year', value: 'last_tax_year' },
            ].map(p => (
              <button
                key={p.value}
                className="btn btn-sm btn-secondary"
                onClick={() => applyPreset(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 280px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ flex: 1 }}
              />
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <input
              type="text"
              placeholder="Search trips..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: '1 1 200px' }}
            />
          </div>
        </div>

        {/* Summary + export */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card stat-item" style={{ padding: '1.25rem' }}>
            <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Total Miles</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--accent)' }}>
              {totals.miles.toFixed(1)}
            </div>
          </div>
          <div className="glass-card stat-item" style={{ padding: '1.25rem' }}>
            <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Total Cost</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#10b981' }}>
              £{totals.cost.toFixed(2)}
            </div>
          </div>
          <div className="glass-card stat-item" style={{ padding: '1.25rem' }}>
            <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Trips</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f59e0b' }}>
              {totals.count}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            ⬇️ Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="glass-card animate-in" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              Loading trips...
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No trips found</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {allTrips.length === 0
                  ? 'No business trips in the database yet.'
                  : 'Try adjusting the date range or search term.'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', paddingBottom: editingId ? '180px' : 0 }}>
              <table className="trip-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Destination</th>
                    <th>Miles</th>
                    <th>Cost</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((trip, i) => {
                    const isEditing = editingId === trip.eventId;
                    return (
                      <tr key={trip.eventId || i}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="trip-date">{formatDate(trip.date)}</span>
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.title}
                              onChange={e => setEditValues(p => ({ ...p, title: e.target.value }))}
                              style={{ width: '100%', minWidth: '160px' }}
                            />
                          ) : (
                            <div className="trip-event-name">{trip.title}</div>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <AddressAutocomplete
                              value={editValues.destinationAddress}
                              onChange={val => setEditValues(p => ({ ...p, destinationAddress: val }))}
                              placeholder="Type destination..."
                              autoFocus
                            />
                          ) : (
                            <span className="trip-journey">
                              {trip.destinationAddress || trip.destination || <span style={{ color: 'var(--muted)' }}>Not set</span>}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="trip-miles">{trip.roundTripMiles != null ? trip.roundTripMiles : '—'}</span>
                        </td>
                        <td>
                          <span className="trip-cost">£{trip.cost != null ? Number(trip.cost).toFixed(2) : '0.00'}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {isEditing ? (
                              <>
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleEditSave(trip.eventId)}
                                  disabled={saving}
                                >
                                  {saving ? '...' : '💾'}
                                </button>
                                <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>✕</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-sm btn-secondary" onClick={() => handleEditStart(trip)}>✏️</button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(trip.eventId)}>🗑️</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div style={{ textAlign: 'right', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
            Showing {filtered.length} of {allTrips.length} trips · HMRC rate £{MILEAGE_RATE}/mile
          </div>
        )}
      </div>
    </>
  );
}
