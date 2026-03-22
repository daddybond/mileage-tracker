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

  const filteredTrips = trips.filter(t => {
    const d = t.date || '';
    if (!startDate || !endDate) return true;
    return d >= startDate && d <= endDate;
  });

  return (
    <>
      <SummaryBar 
        trips={filteredTrips} 
        onDownload={onDownload} 
        onSave={onSave}
        onRetrieve={onRetrieve}
      />
      <TripTable 
        trips={filteredTrips} 
        onRequestDestination={onRequestDestination}
        onReviewTrip={onReviewTrip}
        onTripUpdate={onTripUpdate}
      />
    </>
  );
}
