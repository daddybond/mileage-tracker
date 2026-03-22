import { useMemo, memo } from 'react';

const SummaryBar = memo(function SummaryBar({ trips, onDownload, onSave, onRetrieve }) {
  const { totalMiles, totalCost, businessCount, personalCount } = useMemo(() => {
    const businessTrips = trips.filter(t => t.classification === 'business' && t.roundTripMiles);
    const miles = businessTrips.reduce((sum, t) => sum + (Number(t.roundTripMiles) || 0), 0);
    const cost = businessTrips.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);
    const pCount = trips.filter(t => t.classification === 'personal').length;
    
    return {
      totalMiles: Number(miles) || 0,
      totalCost: Number(cost) || 0,
      businessCount: businessTrips.length,
      personalCount: pCount
    };
  }, [trips]);

  return (
    <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
      <div className="glass-card stat-item" style={{ padding: '1.25rem' }}>
        <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Total Miles</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--accent)' }}>
          {(totalMiles || 0).toFixed(1)}
        </div>
      </div>
      <div className="glass-card stat-item" style={{ padding: '1.25rem', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
        <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Mileage Cost</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--success)' }}>
          £{(totalCost || 0).toFixed(2)}
        </div>
      </div>
      <div className="glass-card stat-item" style={{ padding: '1.25rem', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
        <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Business</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f59e0b' }}>
          {businessCount}
        </div>
      </div>
      <div className="glass-card stat-item" style={{ padding: '1.25rem', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
        <div className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Personal</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#a855f7' }}>
          {personalCount}
        </div>
      </div>
      
      <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button className="btn-primary" onClick={onDownload} style={{ flex: '1 1 120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span>⬇️</span> CSV
        </button>
        <button className="btn-primary" onClick={onSave} style={{ flex: '1 1 120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent)', border: 'none' }}>
          <span>☁️</span> Push to Cloud
        </button>
        <button className="btn-primary" onClick={onRetrieve} style={{ flex: '1 1 120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span>🔄</span> Pull from Cloud
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
          HMRC Official Rate: £0.45 / mile
        </span>
      </div>
    </div>
  );
});

export default SummaryBar;
