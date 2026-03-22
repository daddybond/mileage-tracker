'use client';

import { useState, useEffect, useCallback } from 'react';
// Components removed for dynamic import
import DestinationPrompt from './components/DestinationPrompt';
import DateRangeSelector from './components/DateRangeSelector';
import AuthButton from './components/AuthButton';
import LearningSettings from './components/LearningSettings';
import ManualTripModal from './components/ManualTripModal';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('./components/Dashboard'), { ssr: false });
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
  const [isMounted, setIsMounted] = useState(false);

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
    setIsMounted(true);
  }, []);

  // Sync trips to Supabase with debounce to avoid memory spikes
  useEffect(() => {
    if (trips.length === 0) return;
    
    const handler = setTimeout(() => {
      saveAllTrips(trips);
    }, 2000); // 2s debounce

    return () => clearTimeout(handler);
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
  // Auto-sync intervals (Render-safe version)
  useEffect(() => {
    let interval;
    if (isAutoSync && authenticated) {
      interval = setInterval(() => {
        // Only trigger if not already processing to avoid double-overlap
        if (!processing) {
          analysePeriod();
          setLastSync(new Date());
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => clearInterval(interval);
  }, [isAutoSync, authenticated]); // Removed 'processing' from deps

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
      // Append cache buster to ensure local browser cache doesn't swallow the GET request
      const eventsRes = await fetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`);
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
      
      const freshEvents = events.filter(e => {
        const existing = trips.find(t => t.eventId === e.id);
        if (!existing) return true; // Brand new
        if (existing.classification === 'needs_review') return true; // Let AI try again
        return false; // It's 'business', or 'ignored'. PROTECT IT.
      });

      const activeWindowIds = new Set(events.map(e => e.id));
      const activeInWindow = trips.filter(t => activeWindowIds.has(t.eventId));
      const bCount = activeInWindow.filter(t => t.classification === 'business').length;
      const iCount = activeInWindow.filter(t => t.classification === 'personal' || t.classification === 'ignored').length;

      if (freshEvents.length === 0) {
        addToast(`All ${events.length} events are protected. Found ${bCount} business trips and ${iCount} ignored personal trips.`, 'success');
        setProcessing(false);
        setProgress({ step: '', percent: 0 });
        return;
      }

      setProgress({ step: `Classifying ${freshEvents.length} new/unresolved events with AI...`, percent: 30 });

      const recentBusiness = trips
        .filter(t => t.classification === 'business')
        .slice(0, 50)
        .map(t => ({ 
          title: t.title, 
          classification: 'business', 
          destination: t.destinationAddress || t.destination || t.location 
        }));
        
      // Deduplicate memory entries
      const combinedMemory = [...learningMemory, ...recentBusiness].reduce((acc, current) => {
        const x = acc.find(item => item.title === current.title);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      // Step 2: Classify events with memory (Sequential Client-Side Batching to prevent Vercel 10s timeouts)
      const classifications = [];
      const CHUNK_SIZE = 15;
      
      for (let i = 0; i < freshEvents.length; i += CHUNK_SIZE) {
        const chunk = freshEvents.slice(i, i + CHUNK_SIZE);
        setProgress({ step: `Classifying AI Batch ${Math.floor(i/CHUNK_SIZE) + 1} of ${Math.ceil(freshEvents.length/CHUNK_SIZE)}...`, percent: 30 + Math.floor((i/freshEvents.length) * 20) });
        
        try {
          // THROTTLE: If not the first chunk, sleep for 8 seconds to rigidly adhere to the 15 RPM model quota
          if (i > 0) await new Promise(r => setTimeout(r, 8000));
          
          const classifyRes = await fetch('/api/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              events: chunk, 
              memory: combinedMemory,
              customKeywords: customKeywords
            }),
          });
          
          if (!classifyRes.ok) {
            console.error(`Batch ${Math.floor(i/CHUNK_SIZE) + 1} failed, continuing to next.`);
            continue;
          }
          
          const { classifications: batchClassifications } = await classifyRes.json();
          classifications.push(...batchClassifications);
        } catch (chunkErr) {
          console.error(`Batch ${Math.floor(i/CHUNK_SIZE) + 1} fatal error:`, chunkErr);
        }
      }

      if (classifications.length === 0 && freshEvents.length > 0) {
        throw new Error('All AI classification batches failed or timed out.');
      }

      // Merge event data with classifications using a Map for O(N) performance
      const eventMap = new Map(freshEvents.map(e => [e.id, e]));
      const mergedTrips = classifications.map((c) => {
        const event = eventMap.get(c.eventId);
        
        const baseTrip = {
          eventId: c.eventId,
          classification: c.classification || 'needs_review',
          confidence: c.confidence || 0,
          reasoning: c.reasoning || '',
          source: c.source || 'AI',
          title: event?.title || 'Unknown Event',
          date: event?.date || '',
          description: (event?.description || '').substring(0, 250),
          location: event?.location || '',
          destination: c.destination || c.suggestedDestination || null,
          roundTripMiles: 0,
          cost: 0,
          duration: ''
        };

        if (baseTrip.classification === 'business' && !baseTrip.destination) {
          if (destinationCache[baseTrip.title]) {
            baseTrip.destination = destinationCache[baseTrip.title];
          }
        }
        return baseTrip;
      });

      // Step 3: Fast Bulk Distance Calculation (Server-Side Parallel)
      const businessWithDest = mergedTrips.filter(t => t.classification === 'business' && t.destination);
      
      if (businessWithDest.length > 0) {
        setProgress({ step: `Calculating total mileage for ${businessWithDest.length} journeys...`, percent: 60 });
        
        // Skip existing results to save API tokens and time
        const toCalculate = businessWithDest.filter(trip => {
          const existing = trips.find(t => t.eventId === trip.eventId);
          if (existing && existing.roundTripMiles > 0 && existing.destination === trip.destination) {
            trip.roundTripMiles = existing.roundTripMiles;
            trip.cost = existing.cost;
            trip.destinationAddress = existing.destinationAddress;
            trip.duration = existing.duration;
            return false;
          }
          return true;
        });

        if (toCalculate.length > 0) {
          const bulkRes = await fetch('/api/distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinations: toCalculate.map(t => t.destination) }),
          });

          if (bulkRes.ok) {
            const { results } = await bulkRes.json();
            // Map results back to trips
            toCalculate.forEach((trip, idx) => {
              const res = results[idx];
              if (res) {
                trip.roundTripMiles = res.roundTripMiles;
                trip.cost = res.cost;
                trip.destinationAddress = res.destinationAddress;
                trip.duration = res.duration;
              }
            });
          }
        }
      }
      
      setProgress({ step: 'Finalizing...', percent: 95 });

      // Step 4: Final Batch Update (Memory Safe)
      setTrips(prev => {
        // Create one shallow copy to mutate safely (avoids multiple copies in memory)
        const nextTrips = [...prev]; 
        
        for (let i = 0; i < mergedTrips.length; i++) {
          const newTrip = mergedTrips[i];
          
          // SOFT-BAN: Personal or ignored trips are silenced, but kept in state so they aren't downloaded again
          if (newTrip.classification === 'personal' || newTrip.classification === 'ignored') {
            const existingIndex = nextTrips.findIndex(t => t.eventId === newTrip.eventId);
            if (existingIndex >= 0) {
              nextTrips[existingIndex] = { ...nextTrips[existingIndex], classification: 'ignored' };
            } else {
              nextTrips.push({ ...newTrip, classification: 'ignored' });
            }
            continue; // Move to next
          }

          const existingIndex = nextTrips.findIndex(t => t.eventId === newTrip.eventId);

          if (existingIndex >= 0) {
            const existing = nextTrips[existingIndex];
            const hasBetterMileage = (newTrip.roundTripMiles > 0 && (!existing.roundTripMiles || existing.roundTripMiles === 0));
            const hasBetterDesc = (newTrip.description && !existing.description);
            
            if (hasBetterMileage || hasBetterDesc || newTrip.classification !== existing.classification) {
              // Explicit assignment to save memory
              nextTrips[existingIndex] = {
                ...existing,
                classification: newTrip.classification,
                description: newTrip.description || existing.description,
                roundTripMiles: newTrip.roundTripMiles || existing.roundTripMiles,
                cost: newTrip.cost || existing.cost,
                destination: newTrip.destination || existing.destination,
                destinationAddress: newTrip.destinationAddress || existing.destinationAddress,
                duration: newTrip.duration || existing.duration
              };
            }
          } else {
            nextTrips.push(newTrip);
          }
        }
        
        // Sort in-place to avoid creating yet another array copy
        return nextTrips.sort((a, b) => {
          const dA = new Date(a?.date || 0).getTime() || 0;
          const dB = new Date(b?.date || 0).getTime() || 0;
          return dB - dA;
        });
      });
      setProgress({ step: 'Complete!', percent: 100 });

      // Get true totals for just the actively analyzed window (including shielded items)
      const windowIds = new Set(events.map(e => e.id));
      setTrips(prev => {
        const activeInWindow = prev.filter(t => windowIds.has(t.eventId));
        const businessCount = activeInWindow.filter(t => t.classification === 'business').length;
        const reviewCount = activeInWindow.filter(t => t.classification === 'needs_review').length;
        const autoFilledCount = mergedTrips.filter(t => t.isAutoFilled).length;
        
        let msg = `Found ${businessCount} business trips and ${reviewCount} to review in this period.`;
        if (autoFilledCount > 0) {
          msg += ` ${autoFilledCount} locations remembered from past visits!`;
        }
        
        addToast(msg, 'success');
        return prev; // We're only using setTrips here to safely access the newest state without race conditions
      });
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
      try {
        const tripToUpdate = trips.find(t => t.eventId === eventId);
        if (tripToUpdate) {
          const ignoredTrip = { ...tripToUpdate, classification: 'ignored' };
          setTrips(prev => prev.map(t => t.eventId === eventId ? ignoredTrip : t));
          saveAllTrips([ignoredTrip]); // Push soft-ban lock to DB
        }
        addToast('Journey permanently ignored.', 'info');
      } catch (err) {
        console.error('Failed to ignore trip:', err);
        addToast('Failed to ignore trip.', 'error');
      }
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

    // 🔥 Auto-Learn Dynamic Custom Keywords!
    if (newClassification === 'business') {
      try {
        const learnRes = await fetch('/api/learn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: tripToUpdate.title, description: tripToUpdate.description })
        });
        if (learnRes.ok) {
          const { keywords } = await learnRes.json();
          if (keywords && keywords.length > 0) {
            setCustomKeywords(prevKWs => {
              const existingKWs = prevKWs || [];
              const newKWs = [...new Set([...existingKWs, ...keywords])];
              saveCustomKeywords(newKWs);
              return newKWs;
            });
            setTimeout(() => addToast(`Learned new keyword: ${keywords.join(', ')}`, 'success'), 1500);
          }
        }
      } catch (err) {
        console.warn('Background learning failed', err);
      }
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

  const handleManualSave = async () => {
    try {
      addToast('Cloud Sync: Saving...', 'success');
      await saveAllTrips(trips);
      addToast('All data backed up to Supabase!', 'success');
    } catch (e) {
      addToast('Save failed.', 'error');
    }
  };

  const handleManualRetrieve = async () => {
    try {
      addToast('Cloud Sync: Fetching...', 'success');
      const dbTrips = await loadTrips();
      if (dbTrips.length > 0) {
        setTrips(dbTrips.sort((a, b) => new Date(b.date) - new Date(a.date)));
        addToast(`Restored ${dbTrips.length} journeys from cloud.`, 'success');
      } else {
        addToast('No saved data found in cloud.', 'warning');
      }
    } catch (e) {
      addToast('Fetch failed.', 'error');
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to delete ALL data permanently?')) {
      try {
        await clearAllTrips();
        await clearLearningMemory();
        setTrips([]);
        setLearningMemory([]);
        setDestinationCache({});
        if (typeof window !== 'undefined') {
          localStorage.removeItem('destination_cache');
        }
        addToast('All data has been fully wiped.', 'success');
      } catch (err) {
        console.error('Clear data error:', err);
        addToast('Failed to clear data.', 'error');
      }
    }
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

      <div className="app-container" style={{ padding: '0 1rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <header className="app-header" style={{ textAlign: 'center', padding: '3rem 0 2rem' }}>
          <div className="app-logo" style={{ marginBottom: '0.5rem' }}>
            <div className="app-logo-icon" style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.5))' }}>🚗</div>
            <h1>Mileage Tracker</h1>
          </div>
          <p className="sub-heading">
            Automated business mileage calculations <br className="mobile-only" /> from your Google Calendar
          </p>
        </header>

        {/* Auth & Controls */}
        <div className="controls-bar" style={{ marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div className="card-header">
              <div className="card-title">
                <span className="card-title-icon">📅</span>
                Google Calendar
              </div>
              <div className="mobile-stack" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                <AuthButton authenticated={authenticated} loading={authLoading} />
                {authenticated && (
                  <button 
                    className="glass-pill"
                    onClick={() => setShowSettings(true)}
                    style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }}
                  >
                    ⚙️ Settings
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
                  className="btn btn-primary"
                  onClick={() => setShowManualModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
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
                {lastSync && !isNaN(lastSync.getTime()) && (
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
          <div className="glass-card animate-in" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div className="auth-section">
              <span className="auth-icon" style={{ fontSize: '4rem', display: 'block', marginBottom: '1.5rem' }}>🔐</span>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Connect Your Calendar</h2>
              <p className="sub-heading" style={{ marginBottom: '2rem', maxWidth: '300px', margin: '0 auto 2rem' }}>
                Link your Google Calendar to automatically detect business trips <br/> and track your expenses at 45p per mile.
              </p>
              <div style={{ maxWidth: '280px', margin: '0 auto' }}>
                <AuthButton authenticated={false} loading={false} />
              </div>
            </div>
          </div>
        )}

        {/* Dashboard content (only when authenticated) */}
        {authenticated && (
          <Dashboard 
            trips={trips}
            startDate={startDate}
            endDate={endDate}
            onDownload={handleDownloadReport}
            onSave={handleManualSave}
            onRetrieve={handleManualRetrieve}
            onRequestDestination={setPromptTrip}
            onReviewTrip={handleReviewTrip}
            onTripUpdate={handleTripUpdate}
          />
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
