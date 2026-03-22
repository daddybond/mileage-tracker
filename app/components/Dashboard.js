import { useState } from 'react';
import SummaryBar from './SummaryBar';
import TripTable from './TripTable';

export default function Dashboard({ 
  trips, 
  startDate, 
  endDate, 
  onDownload, 
  onSave, 
  onRetrieve, 
  onRequestDestination, 
  onReviewTrip, 
  onTripUpdate 
}) {
  const [visibleCount, setVisibleCount] = useState(3);

  const filteredTrips = trips.filter(t => {
    const d = t.date || '';
    if (!startDate || !endDate) return true;
    return d >= startDate && d <= endDate;
  });

  const slicedTrips = filteredTrips.slice(0, visibleCount);

  return (
    <>
      <SummaryBar 
        trips={filteredTrips} 
        onDownload={onDownload} 
        onSave={onSave}
        onRetrieve={onRetrieve}
      />
      <TripTable 
        trips={slicedTrips} 
        onRequestDestination={onRequestDestination}
        onReviewTrip={onReviewTrip}
        onTripUpdate={onTripUpdate}
      />
      {filteredTrips.length > visibleCount && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="btn btn-primary"
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.75rem 2rem',
              fontSize: '0.9rem'
            }}
          >
            Show {filteredTrips.length - visibleCount} More Journeys
          </button>
        </div>
      )}
    </>
  );
}
