'use client';

import { useState, useEffect, useCallback } from 'react';
import SummaryBar from './components/SummaryBar';
import TripTable from './components/TripTable';
import DestinationPrompt from './components/DestinationPrompt';
import DateRangeSelector from './components/DateRangeSelector';
import AuthButton from './components/AuthButton';
import LearningSettings from './components/LearningSettings';
import ManualTripModal from './components/ManualTripModal';
import {
  loadTrips, saveAllTrips, deleteTrip as dbDeleteTrip, clearAllTrips,
  loadDestinationCache, saveCacheEntry,
  loadLearningMemory, saveMemoryEntry, clearLearningMemory,
  loadCustomKeywords, saveCustomKeywords,
  migrateFromLocalStorage
} from '../lib/supabase';

export default function Home() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [destinationCache, setDestinationCache] = useState({});
  const [learningMemory, setLearningMemory] = useState([]);
  const [customKeywords, setCustomKeywords] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ step: '', percent: 0 });
  const [promptTrip, setPromptTrip] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Load data from Supabase on mount (with localStorage migration)
  useEffect(() => {
    async function initData() {
      // Check if we need to migrate from localStorage
      const alreadyMigrated = localStorage.getItem('supabase_migrated');
      if (!alreadyMigrated) {
        const didMigrate = await migrateFromLocalStorage();
        if (didMigrate) {
          addToast('Data migrated to cloud storage!', 'success');
        }
      }

      // Load everything from Supabase
      const [dbTrips, dbCache, dbMemory, dbKeywords] = await Promise.all([
        loadTrips(),
        loadDestinationCache(),
        loadLearningMemory(),
        loadCustomKeywords()
      ]);

      if (dbTrips.length > 0) setTrips(dbTrips);
      if (Object.keys(dbCache).length > 0) setDestinationCache(dbCache);
      if (dbMemory.length > 0) setLearningMemory(dbMemory);
      if (dbKeywords) setCustomKeywords(dbKeywords);

      // Initialize dates if empty
      if (!startDate) {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(firstOfMonth.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
      }
    }

    initData();
    checkAuth();
  }, []);

  // Sync trips to Supabase when they change
  useEffect(() => {
    if (trips.length > 0) {
      saveAllTrips(trips);
    }
  }, [trips]);

  // Sync learning memory to Supabase when it changes
  useEffect(() => {
    // We save individual entries when they're added, not the whole array
  }, [learningMemory]);

  // Sync keywords to Supabase when they change
  useEffect(() => {
    if (customKeywords) {
      saveCustomKeywords(customKeywords);
    }
  }, [customKeywords]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);
  
  // Auto-Sync Polling (every 5 minutes)
  useEffect(() => {
    let interval;
    if (isAutoSync && authenticated && !processing) {
      interval = setInterval(() => {
        handleAnalysePeriod();
        setLastSync(new Date());
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => clearInterval(interval);
  }, [isAutoSync, authenticated, processing]);

  const addToast = (message, type = 'success') => {
    setToasts(prev => [...prev, { message, type, id: Date.now() }]);
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setAuthenticated(data.authenticated);
    } catch {
      setAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDateChange = (newStart, newEnd) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  /**
   * Main pipeline: fetch events → classify → calculate distances
   */
  const analysePeriod = useCallback(async () => {
    setProcessing(true);
    setProgress({ step: 'Fetching calendar events...', percent: 10 });

    try {
      // Step 1: Fetch calendar events
      const eventsRes = await fetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`);
      if (!eventsRes.ok) {
        const err = await eventsRes.json();
        throw new Error(err.error || 'Failed to fetch events');
      }
      const { events } = await eventsRes.json();

      if (events.length === 0) {
        addToast('No events found for this date range', 'error');
        setProcessing(false);
        setProgress({ step: '', percent: 0 });
        return;
      }

      setProgress({ step: `Classifying ${events.length} events with AI...`, percent: 30 });

      // Step 2: Classify events with memory
      const classifyRes = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          events, 
          memory: learningMemory,
          customKeywords: customKeywords
        }),
      });
      if (!classifyRes.ok) {
        const err = await classifyRes.json();
        throw new Error(err.error || 'Failed to classify events');
      }
      const { classifications } = await classifyRes.json();

      // Merge event data with classifications and AUTO-FILL from cache
      const mergedTrips = classifications.map((c) => {
        const event = events.find(e => e.id === c.eventId);
        const baseTrip = {
          ...c,
          title: event?.title || 'Unknown Event',
          date: event?.date || '',
          description: event?.description || '',
          location: event?.location || '',
          destination: c.suggestedDestination || null, // Auto-apply AI suggestion
        };

        // If it's business and lacks a destination, try the cache
        if (baseTrip.classification === 'business' && !baseTrip.destination) {
          if (destinationCache[baseTrip.title]) {
            baseTrip.destination = destinationCache[baseTrip.title];
            baseTrip.isAutoFilled = true;
          }
        }

        return baseTrip;
      });

      setProgress({ step: 'Calculating distances for business trips...', percent: 60 });

      // Step 3: Calculate distances for trips with destinations
      const businessWithDest = mergedTrips.filter(
        t => t.classification === 'business' && t.destination
      );

      let completed = 0;
      for (const trip of businessWithDest) {
        // Optimization: Don't re-calculate if we already have it in the state
        const existing = trips.find(t => t.eventId === trip.eventId);
        if (existing && existing.roundTripMiles > 0 && existing.destination === trip.destination) {
          trip.roundTripMiles = existing.roundTripMiles;
          trip.cost = existing.cost;
          trip.destinationAddress = existing.destinationAddress;
          trip.duration = existing.duration;
          completed++;
          continue;
        }

        try {
          const distRes = await fetch('/api/distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination: trip.destination }),
          });

          if (distRes.ok) {
            const dist = await distRes.json();
            trip.roundTripMiles = dist.roundTripMiles;
            trip.cost = dist.cost;
            trip.destinationAddress = dist.destinationAddress;
            trip.duration = dist.duration;
          }
        } catch (err) {
          console.error(`Distance calc failed for ${trip.destination}:`, err);
        }

        completed++;
        const pct = 60 + (completed / businessWithDest.length) * 35;
        setProgress({ step: `Calculating distances (${completed}/${businessWithDest.length})...`, percent: pct });
      }

      // MERGE LOGIC: Keep existing trips and add/update with new analysis
      setTrips(prev => {
        const updatedTrips = [...prev];
        mergedTrips.forEach(newTrip => {
          const existingIndex = updatedTrips.findIndex(t => t.eventId === newTrip.eventId);
          if (existingIndex >= 0) {
            // Prioritize non-zero mileage or updated destinations
            const existing = updatedTrips[existingIndex];
            const hasBetterMileage = (newTrip.roundTripMiles > 0 && (existing.roundTripMiles === 0 || !existing.roundTripMiles));
            const hasBetterDestination = (newTrip.suggestedDestination && newTrip.suggestedDestination !== existing.destination);
            
            if (hasBetterMileage || hasBetterDestination) {
              updatedTrips[existingIndex] = { ...existing, ...newTrip };
            }
          } else {
            updatedTrips.push(newTrip);
          }
        });
        // Sort by date descending
        return updatedTrips.sort((a, b) => new Date(b.date) - new Date(a.date));
      });
      setProgress({ step: 'Complete!', percent: 100 });

      const businessCount = mergedTrips.filter(t => t.classification === 'business').length;
      const reviewCount = mergedTrips.filter(t => t.classification === 'needs_review').length;
      const autoFilledCount = mergedTrips.filter(t => t.isAutoFilled).length;
      
      let msg = `Found ${businessCount} business trips and ${reviewCount} to review.`;
      if (autoFilledCount > 0) {
        msg += ` ${autoFilledCount} locations remembered from past visits!`;
      }
      
      addToast(msg, 'success');
      setLastSync(new Date());

    } catch (err) {
      console.error('Analysis error:', err);
      addToast(err.message || 'An error occurred during analysis', 'error');
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress({ step: '', percent: 0 }), 2000);
    }
  }, [startDate, endDate]);

  /**
   * Handle destination submission from the prompt modal
   */
  const handleDownloadReport = () => {
    const businessTrips = trips.filter(t => t.classification === 'business');
    if (businessTrips.length === 0) {
      addToast('No business trips to export yet.', 'error');
      return;
    }

    const headers = ['Date', 'Event', 'Destination', 'Miles (Round Trip)', 'Cost (£)'];
    const rows = businessTrips.map(t => [
      new Date(t.date).toLocaleDateString('en-GB'),
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.destinationAddress || t.destination || 'Not set').replace(/"/g, '""')}"`,
      t.roundTripMiles != null ? t.roundTripMiles : '',
      t.cost != null ? t.cost.toFixed(2) : ''
    ]);

    const totalMiles = businessTrips.reduce((sum, t) => sum + (Number(t.roundTripMiles) || 0), 0);
    const totalCost = businessTrips.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '', // Empty line
      ['TOTAL', '', '', totalMiles.toFixed(1), `£${totalCost.toFixed(2)}`].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mileage_report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${businessTrips.length} business trips.`, 'success');
  };

  const handleDestinationSubmit = async (trip, destination) => {
    try {
      const distRes = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination }),
      });

      if (!distRes.ok) {
        const err = await distRes.json();
        throw new Error(err.error || 'Failed to calculate distance');
      }

      const dist = await distRes.json();

      // Update destination cache
      saveCacheEntry(trip.title, {
        address: destination,
        miles: dist.roundTripMiles,
        duration: dist.duration,
      });
      setDestinationCache(prev => ({
        ...prev,
        [trip.title]: destination
      }));

      setTrips(prev =>
        prev.map(t => {
          if (t.eventId === trip.eventId) {
            return {
              ...t,
              destination,
              roundTripMiles: dist.roundTripMiles,
              cost: dist.cost,
              destinationAddress: dist.destinationAddress,
              duration: dist.duration,
            };
          }
          return t;
        })
      );

      addToast(`Added ${dist.roundTripMiles} mile round trip to ${dist.destinationAddress}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to calculate distance', 'error');
    } finally {
      setPromptTrip(null);
    }
  };

  /**
   * Handle user manual review of "needs_review" trips
   */
  const handleReviewTrip = async (eventId, newClassification) => {
    if (newClassification === 'delete') {
      dbDeleteTrip(eventId); // Remove from Supabase
      setTrips(prev => prev.filter(t => t.eventId !== eventId));
      addToast('Trip removed.', 'success');
      return;
    }

    const tripToUpdate = trips.find(t => t.eventId === eventId);
    if (!tripToUpdate) return;

    // Save decision to memory for learning
    const memoryEntry = { title: tripToUpdate.title, classification: newClassification };
    const exists = learningMemory.find(p => p.title === tripToUpdate.title);
    if (!exists) {
      saveMemoryEntry(memoryEntry); // Persist to Supabase
      setLearningMemory(prev => [...prev, memoryEntry]);
    }

    if (newClassification === 'personal') {
      setTrips(prev => prev.map(t => t.eventId === eventId ? { ...t, classification: 'personal' } : t));
      addToast('Marked as personal event.', 'success');
      return;
    }

    if (newClassification === 'business_no_travel') {
      setTrips(prev => prev.map(t => t.eventId === eventId ? { 
        ...t, 
        classification: 'business', 
        destination: 'No Travel Required',
        destinationAddress: 'Wood Street Mill, Darwen',
        roundTripMiles: 0,
        cost: 0,
        reasoning: 'Marked as business with no travel'
      } : t));
      addToast('Marked as business (no travel).', 'success');
      return;
    }

    if (newClassification === 'needs_review') {
      setTrips(prev => prev.map(t => t.eventId === eventId ? { 
        ...t, 
        classification: 'needs_review',
        roundTripMiles: null,
        cost: null,
        destination: null,
        destinationAddress: null
      } : t));
      addToast('Moved back to review.', 'success');
      return;
    }

    // It is a business trip
    const destToUse = tripToUpdate.destination || tripToUpdate.location;
    
    if (destToUse) {
      // Optimistic update to move it to the business table immediately
      setTrips(prev => prev.map(t => t.eventId === eventId ? { ...t, classification: 'business', destination: destToUse } : t));
      
      try {
        const distRes = await fetch('/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: destToUse }),
        });

        if (distRes.ok) {
          const dist = await distRes.json();
          setTrips(prev => prev.map(t => t.eventId === eventId ? {
            ...t,
            roundTripMiles: dist.roundTripMiles,
            cost: dist.cost,
            destinationAddress: dist.destinationAddress,
            duration: dist.duration,
          } : t));
          addToast(`Added ${dist.roundTripMiles} mile round trip to ${dist.destinationAddress}`, 'success');
        } else {
          addToast('Could not calculate destination automatically. Click "Add destination".', 'error');
        }
      } catch (err) {
        addToast('Distance calculation failed.', 'error');
      }
    } else {
      // No destination hint at all
      setTrips(prev => prev.map(t => t.eventId === eventId ? { ...t, classification: 'business' } : t));
      addToast('Marked as business trip. Please click "Add destination".', 'success');
    }
  };

  const handleManualTripSubmit = async (manualTrip) => {
    // Optimistically add to UI
    const tripToSave = {
      ...manualTrip,
      roundTripMiles: 0,
      cost: 0,
      destinationAddress: manualTrip.destination,
      reasoning: 'Manually added journey'
    };
    
    setTrips(prev => [tripToSave, ...prev]);
    addToast('Manual journey added! Calculating distance...', 'success');

    try {
      // Calculate distance for the manual trip
      const distRes = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: manualTrip.destination }),
      });

      if (distRes.ok) {
        const dist = await distRes.json();
        const finalTrip = {
          ...tripToSave,
          roundTripMiles: dist.roundTripMiles,
          cost: dist.cost,
          destinationAddress: dist.destinationAddress,
          duration: dist.duration,
        };
        // Update trips set
        setTrips(prev => prev.map(t => t.eventId === manualTrip.eventId ? finalTrip : t));
        // Save to Supabase (saveAllTrips is called by useEffect, but individual saveTrip is safer here)
        // Actually, the saving logic in page.js handles syncing trips to Supabase via useEffect
        addToast(`Added ${dist.roundTripMiles} mile manual trip!`, 'success');
      }
    } catch (err) {
      console.error('Manual trip distance failed', err);
    }
  };

  const handleTripUpdate = async (eventId, updates) => {
    let finalUpdates = { ...updates };
    
    const existingTrip = trips.find(t => t.eventId === eventId);
    if (updates.destinationAddress && updates.destinationAddress !== (existingTrip?.destinationAddress || existingTrip?.destination)) {
      try {
        const distRes = await fetch('/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: updates.destinationAddress }),
        });
        
        if (distRes.ok) {
          const dist = await distRes.json();
          finalUpdates.roundTripMiles = dist.roundTripMiles;
          finalUpdates.cost = dist.cost;
          finalUpdates.destinationAddress = dist.destinationAddress;
          finalUpdates.duration = dist.duration;
        }
      } catch (err) {
        console.error('Update distance failed', err);
      }
    }

    setTrips(prev => prev.map(t => t.eventId === eventId ? { ...t, ...finalUpdates } : t));
    addToast('Trip updated.', 'success');
  };

  const handleClearData = async () => {
    await Promise.all([
      clearAllTrips(),
      clearLearningMemory()
    ]);
    localStorage.removeItem('mileage_trips');
    localStorage.removeItem('destination_cache');
    localStorage.removeItem('learning_memory');
    setTrips([]);
    setDestinationCache({});
    setLearningMemory([]);
    addToast('All data and memory cleared.', 'success');
  };

  return (
    <>
      <div className="app-background"></div>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast--${toast.type}`}>
              {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
            </div>
          ))}
        </div>
      )}

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="app-logo">
            <div className="app-logo-icon">🚗</div>
            <h1 className="app-title">Mileage Tracker</h1>
          </div>
          <p className="app-subtitle">
            Automated business mileage calculations from your Google Calendar
          </p>
        </header>

        {/* Auth & Controls */}
        <div className="controls-bar">
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <span className="card-title-icon">📅</span>
                Google Calendar
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <AuthButton authenticated={authenticated} loading={authLoading} />
                {authenticated && (
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowSettings(true)}
                    title="Configure AI learning and keywords"
                  >
                    ⚙️ AI Settings
                  </button>
                )}
                {trips.length > 0 && (
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={handleClearData}
                    title="Clear all saved data and memory"
                  >
                    🗑️ Clear Data
                  </button>
                )}
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowManualModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  ➕ Add Journey
                </button>
              </div>
            </div>
            {authenticated && (
              <>
                <DateRangeSelector startDate={startDate} endDate={endDate} onChange={handleDateChange} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={analysePeriod}
                    disabled={processing}
                    style={{ flex: 1 }}
                  >
                    {processing ? (
                      <>
                        <span className="spinner"></span>
                        Analysing...
                      </>
                    ) : (
                      <>
                        🔍 Analyse Period
                      </>
                    )}
                  </button>
                  <label className="auto-sync-toggle" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={isAutoSync} 
                      onChange={(e) => setIsAutoSync(e.target.checked)}
                    />
                    <span>Live Sync {isAutoSync && <span className="pulse-dot"></span>}</span>
                  </label>
                </div>
                {lastSync && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'right' }}>
                    Last synced: {lastSync.toLocaleTimeString()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progress.step && (
          <div className="progress-bar-container">
            <div className="progress-bar-label">
              <span>{progress.step}</span>
              <span>{Math.round(progress.percent)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Not authenticated state */}
        {!authLoading && !authenticated && (
          <div className="card">
            <div className="auth-section">
              <span className="auth-icon">🔐</span>
              <h2 className="auth-title">Connect Your Calendar</h2>
              <p className="auth-description">
                Link your Google Calendar to automatically detect business trips,
                calculate mileage, and track your expenses at 45p per mile.
              </p>
              <AuthButton authenticated={false} loading={false} />
            </div>
          </div>
        )}

        {/* Dashboard content (only when authenticated) */}
        {authenticated && (
          <>
            <SummaryBar 
              trips={trips.filter(t => {
                if (!startDate || !endDate) return true;
                return t.date >= startDate && t.date <= endDate;
              })} 
              onDownload={handleDownloadReport} 
            />
            <TripTable 
              trips={trips.filter(t => {
                if (!startDate || !endDate) return true;
                const isWithinRange = t.date >= startDate && t.date <= endDate;
                // ALWAYS show "needs_review" even if out of range? 
                // No, better to keep it consistent with the selected period.
                return isWithinRange;
              })} 
              onRequestDestination={setPromptTrip}
              onReviewTrip={handleReviewTrip}
              onTripUpdate={handleTripUpdate}
            />
          </>
        )}
      </div>

      {/* Destination prompt modal */}
      {promptTrip && (
        <DestinationPrompt
          trip={promptTrip}
          onSubmit={handleDestinationSubmit}
          onCancel={() => setPromptTrip(null)}
        />
      )}

      {/* Learning Settings Modal */}
      {showSettings && (
        <LearningSettings
          customKeywords={customKeywords}
          onSave={(newKeywords) => {
            setCustomKeywords(newKeywords);
            setShowSettings(false);
            addToast('AI classification rules updated!', 'success');
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}
      <ManualTripModal 
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSubmit={handleManualTripSubmit}
      />
    </>
  );
}
