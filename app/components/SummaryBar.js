'use client';

export default function SummaryBar({ trips, onDownload, onSave, onRetrieve }) {
  const businessTrips = trips.filter(t => t.classification === 'business' && t.roundTripMiles);
  const totalMiles = businessTrips.reduce((sum, t) => sum + (t.roundTripMiles || 0), 0);
  const totalCost = businessTrips.reduce((sum, t) => sum + (t.cost || 0), 0);
  const pendingCount = trips.filter(t => t.classification === 'business' && !t.destination).length;
  const personalCount = trips.filter(t => t.classification === 'personal').length;

  return (
    <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
      <div className="glass-card stat-item" style={{ padding: '1.25rem' }}>
        <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Total Miles</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--accent)' }}>
          {totalMiles.toFixed(1)}
        </div>
      </div>
      <div className="glass-card stat-item" style={{ padding: '1.25rem', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
        <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Mileage Cost</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--success)' }}>
          £{totalCost.toFixed(2)}
        </div>
      </div>
      <div className="glass-card stat-item" style={{ padding: '1.25rem', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
        <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Business</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f59e0b' }}>
          {businessTrips.length}
        </div>
      </div>
      <div className="glass-card stat-item" style={{ padding: '1.25rem', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
        <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Personal</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#a855f7' }}>
          {personalCount}
        </div>
      </div>
      
      <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', display: 'flex', gap: '0.75rem' }}>
        <button className="btn-primary" onClick={onDownload} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span>⬇️</span> CSV
        </button>
        <button className="btn-primary" onClick={onSave} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span>☁️</span> Save
        </button>
        <button className="btn-primary" onClick={onRetrieve} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span>🔄</span> Pull
        </button>
      </div>
    </div>
  );
}
