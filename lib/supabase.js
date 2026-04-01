import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only initialize if we have the variables, otherwise it will error on createClient
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// DNS SAFE: Short timeout to prevent mobile browser crashes on hanging connections
const DB_TIMEOUT = 2500; // 2.5 seconds

/**
 * Helper to ensure a promise finishes within a certain time
 */
async function withTimeout(promise, fallbackValue = null) {
  if (!supabase) return fallbackValue;
  
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({ error: new Error('Database connection timed out'), data: null }), DB_TIMEOUT);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (result && result.error) {
      console.warn('DB Warning:', result.error.message);
      return { data: fallbackValue, error: result.error };
    }
    return result;
  } catch (err) {
    return { data: fallbackValue, error: err };
  }
}

// ── Trips ──────────────────────────────────────────────────

export async function loadTrips() {
  if (!supabase) return loadTripsFromLocal();
  
  const { data, error } = await withTimeout(
    supabase.from('trips').select('*').order('date', { ascending: false }),
    []
  );
  
  if (error || !data || data.length === 0) {
    // FALLBACK: If DB is unreachable or empty, try local storage
    return loadTripsFromLocal();
  }
  
  const trips = data.map(row => ({
    eventId: row.event_id,
    title: row.title,
    date: row.date,
    description: row.description,
    location: row.location,
    classification: row.classification,
    confidence: row.confidence,
    reasoning: row.reasoning,
    source: row.source,
    suggestedDestination: row.suggested_destination,
    destination: row.destination,
    destinationAddress: row.destination_address,
    roundTripMiles: row.round_trip_miles != null ? Number(row.round_trip_miles) : null,
    cost: row.cost != null ? Number(row.cost) : null,
    duration: row.duration,
  }));
  
  // Update local storage so we have a fresh backup
  saveTripsToLocal(trips);
  return trips;
}

function loadTripsFromLocal() {
  if (typeof window === 'undefined') return [];
  const local = localStorage.getItem('mileage_trips');
  return local ? JSON.parse(local) : [];
}

function saveTripsToLocal(trips) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mileage_trips', JSON.stringify(trips));
}

export async function saveAllTrips(trips) {
  // Always save to local storage immediately (Zero Latency)
  saveTripsToLocal(trips);
  
  if (!supabase) return;

  const rows = trips.map(trip => ({
    event_id: trip.eventId,
    title: trip.title,
    date: trip.date,
    description: trip.description || '',
    location: trip.location || '',
    classification: trip.classification,
    confidence: trip.confidence,
    reasoning: trip.reasoning,
    source: trip.source,
    suggested_destination: trip.suggestedDestination,
    destination: trip.destination,
    destination_address: trip.destinationAddress,
    round_trip_miles: trip.roundTripMiles,
    cost: trip.cost,
    duration: trip.duration,
    updated_at: new Date().toISOString(),
  }));

  // Fire and forget (don't let DB slow down the UI)
  withTimeout(supabase.from('trips').upsert(rows, { onConflict: 'event_id' }));
}

export async function deleteTrip(eventId) {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('mileage_trips');
    if (local) {
      const trips = JSON.parse(local).filter(t => t.eventId !== eventId);
      localStorage.setItem('mileage_trips', JSON.stringify(trips));
    }
  }

  if (!supabase) return;
  withTimeout(supabase.from('trips').delete().eq('event_id', eventId));
}

export async function clearAllTrips() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mileage_trips');
  }

  if (!supabase) return;
  withTimeout(supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
}

// ── Destination Cache ──────────────────────────────────────

export async function loadDestinationCache() {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('destination_cache');
    if (local) return JSON.parse(local);
  }
  
  if (!supabase) return {};

  const { data, error } = await withTimeout(supabase.from('destination_cache').select('*'), []);
  if (error || !data) return {};

  const cache = {};
  data.forEach(row => {
    cache[row.cache_key] = {
      address: row.address,
      miles: row.miles != null ? Number(row.miles) : null,
      duration: row.duration,
    };
  });
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('destination_cache', JSON.stringify(cache));
  }
  return cache;
}

export async function saveCacheEntry(key, value) {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('destination_cache');
    const cache = local ? JSON.parse(local) : {};
    cache[key] = value;
    localStorage.setItem('destination_cache', JSON.stringify(cache));
  }

  if (!supabase) return;
  withTimeout(supabase.from('destination_cache').upsert({
    cache_key: key,
    address: value.address || value,
    miles: value.miles,
    duration: value.duration,
  }, { onConflict: 'cache_key' }));
}

// ── Learning Memory ────────────────────────────────────────

export async function loadLearningMemory() {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('learning_memory');
    if (local) return JSON.parse(local);
  }

  if (!supabase) return [];

  const { data, error } = await withTimeout(
    supabase.from('learning_memory').select('*').order('created_at', { ascending: false }),
    []
  );

  if (error || !data) return [];
  
  const memory = data.map(row => ({
    title: row.title,
    classification: row.classification,
    destination: row.destination,
  }));

  if (typeof window !== 'undefined') {
    localStorage.setItem('learning_memory', JSON.stringify(memory));
  }
  return memory;
}

export async function saveMemoryEntry(entry) {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('learning_memory');
    const memory = local ? JSON.parse(local) : [];
    memory.unshift(entry);
    localStorage.setItem('learning_memory', JSON.stringify(memory.slice(0, 100)));
  }

  if (!supabase) return;
  withTimeout(supabase.from('learning_memory').insert({
    title: entry.title,
    classification: entry.classification,
    destination: entry.destination,
  }));
}

export async function clearLearningMemory() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('learning_memory');
  }

  if (!supabase) return;
  withTimeout(supabase.from('learning_memory').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
}

// ── Custom Keywords (App Settings) ─────────────────────────

function normaliseKeywords(kw) {
  if (!kw) return null;
  // If it was saved as a flat array (old bug), wrap it into the correct shape
  if (Array.isArray(kw)) return { business: kw, personal: [] };
  if (typeof kw === 'object' && !Array.isArray(kw.business)) return null;
  return kw;
}

export async function loadCustomKeywords() {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('custom_keywords');
    if (local) return normaliseKeywords(JSON.parse(local));
  }

  if (!supabase) return null;

  const { data } = await withTimeout(
    supabase.from('app_settings').select('custom_keywords').eq('id', 1).maybeSingle()
  );

  const keywords = normaliseKeywords(data?.custom_keywords || null);
  if (keywords && typeof window !== 'undefined') {
    localStorage.setItem('custom_keywords', JSON.stringify(keywords));
  }
  return keywords;
}

export async function saveCustomKeywords(keywords) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_keywords', JSON.stringify(keywords));
  }

  if (!supabase) return;
  withTimeout(supabase.from('app_settings').upsert({
    id: 1,
    custom_keywords: keywords,
    updated_at: new Date().toISOString(),
  }));
}

// ── Migration: localStorage → Supabase ────────────────────

export async function migrateFromLocalStorage() {
  if (typeof window === 'undefined') return false;
  
  let migrated = false;

  try {
    // Migrate trips
    const localTrips = localStorage.getItem('mileage_trips');
    if (localTrips) {
      const trips = JSON.parse(localTrips);
      if (trips.length > 0) {
        await saveAllTrips(trips);
        migrated = true;
      }
    }

    // Migrate destination cache  
    const localCache = localStorage.getItem('destination_cache');
    if (localCache) {
      const cache = JSON.parse(localCache);
      const entries = Object.entries(cache);
      for (const [key, value] of entries) {
        await saveCacheEntry(key, value);
      }
      if (entries.length > 0) migrated = true;
    }

    // Migrate learning memory
    const localMemory = localStorage.getItem('learning_memory');
    if (localMemory) {
      const memory = JSON.parse(localMemory);
      for (const entry of memory) {
        await saveMemoryEntry(entry);
      }
      if (memory.length > 0) migrated = true;
    }

    // Mark migration as complete
    if (migrated) {
      localStorage.setItem('supabase_migrated', 'true');
    }
  } catch (e) {
    console.error('Migration failed:', e);
  }

  return migrated;
}
