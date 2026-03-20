'use client';

export default function SummaryBar({ trips, onDownload }) {
  const businessTrips = trips.filter(t => t.classification === 'business' && t.roundTripMiles);
  const totalMiles = businessTrips.reduce((sum, t) => sum + (t.roundTripMiles || 0), 0);
  const totalCost = businessTrips.reduce((sum, t) => sum + (t.cost || 0), 0);
  const pendingCount = trips.filter(t => t.classification === 'business' && !t.destination).length;
  const personalCount = trips.filter(t => t.classification === 'personal').length;

  return (
    <div className="summary-grid">
      <div className="stat-card stat-card--miles">
        <div className="stat-label">Total Miles</div>
        <div className="stat-value stat-value--accent">
          {totalMiles.toFixed(1)}
        </div>
      </div>
      <div className="stat-card stat-card--cost">
        <div className="stat-label">Total Mileage Cost</div>
        <div className="stat-value stat-value--green">
          £{totalCost.toFixed(2)}
        </div>
      </div>
      <div className="stat-card stat-card--trips">
        <div className="stat-label">Business Trips</div>
        <div className="stat-value stat-value--amber">
          {businessTrips.length}
        </div>
      </div>
      <div className="stat-card stat-card--personal">
        <div className="stat-label">Personal Events</div>
        <div className="stat-value stat-value--purple">
          {personalCount}
        </div>
      </div>
      
      {businessTrips.length > 0 && (
        <div className="summary-actions">
          <button className="btn btn-primary" onClick={onDownload}>
            <span className="btn-icon">⬇️</span>
            Download CSV Report
          </button>
        </div>
      )}
    </div>
  );
}
