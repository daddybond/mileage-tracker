import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Trips ──────────────────────────────────────────────────

export async function loadTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Failed to load trips:', error);
    return [];
  }
  
  // Map DB columns (snake_case) to app format (camelCase)
  return (data || []).map(row => ({
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
}

export async function saveTrip(trip) {
  const row = {
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
  };

  const { error } = await supabase
    .from('trips')
    .upsert(row, { onConflict: 'event_id' });

  if (error) console.error('Failed to save trip:', error);
}

export async function saveAllTrips(trips) {
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

  const { error } = await supabase
    .from('trips')
    .upsert(rows, { onConflict: 'event_id' });

  if (error) console.error('Failed to save trips:', error);
}

export async function deleteTrip(eventId) {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('event_id', eventId);

  if (error) console.error('Failed to delete trip:', error);
}

export async function clearAllTrips() {
  const { error } = await supabase
    .from('trips')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (error) console.error('Failed to clear trips:', error);
}

// ── Destination Cache ──────────────────────────────────────

export async function loadDestinationCache() {
  const { data, error } = await supabase
    .from('destination_cache')
    .select('*');

  if (error) {
    console.error('Failed to load cache:', error);
    return {};
  }

  const cache = {};
  (data || []).forEach(row => {
    cache[row.cache_key] = {
      address: row.address,
      miles: row.miles != null ? Number(row.miles) : null,
      duration: row.duration,
    };
  });
  return cache;
}

export async function saveCacheEntry(key, value) {
  const { error } = await supabase
    .from('destination_cache')
    .upsert({
      cache_key: key,
      address: value.address || value,
      miles: value.miles,
      duration: value.duration,
    }, { onConflict: 'cache_key' });

  if (error) console.error('Failed to save cache entry:', error);
}

// ── Learning Memory ────────────────────────────────────────

export async function loadLearningMemory() {
  const { data, error } = await supabase
    .from('learning_memory')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load memory:', error);
    return [];
  }

  return (data || []).map(row => ({
    title: row.title,
    classification: row.classification,
    destination: row.destination,
  }));
}

export async function saveMemoryEntry(entry) {
  const { error } = await supabase
    .from('learning_memory')
    .insert({
      title: entry.title,
      classification: entry.classification,
      destination: entry.destination,
    });

  if (error) console.error('Failed to save memory:', error);
}

export async function clearLearningMemory() {
  const { error } = await supabase
    .from('learning_memory')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) console.error('Failed to clear memory:', error);
}

// ── Custom Keywords (App Settings) ─────────────────────────

export async function loadCustomKeywords() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('custom_keywords')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Failed to load keywords:', error);
  }

  return data?.custom_keywords || null;
}

export async function saveCustomKeywords(keywords) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      id: 1,
      custom_keywords: keywords,
      updated_at: new Date().toISOString(),
    });

  if (error) console.error('Failed to save keywords:', error);
}

// ── Migration: localStorage → Supabase ────────────────────

export async function migrateFromLocalStorage() {
  let migrated = false;

  // Migrate trips
  const localTrips = localStorage.getItem('mileage_trips');
  if (localTrips) {
    try {
      const trips = JSON.parse(localTrips);
      if (trips.length > 0) {
        await saveAllTrips(trips);
        migrated = true;
        console.log(`Migrated ${trips.length} trips to Supabase`);
      }
    } catch (e) {
      console.error('Failed to migrate trips:', e);
    }
  }

  // Migrate destination cache  
  const localCache = localStorage.getItem('destination_cache');
  if (localCache) {
    try {
      const cache = JSON.parse(localCache);
      const entries = Object.entries(cache);
      for (const [key, value] of entries) {
        await saveCacheEntry(key, value);
      }
      if (entries.length > 0) {
        migrated = true;
        console.log(`Migrated ${entries.length} cache entries to Supabase`);
      }
    } catch (e) {
      console.error('Failed to migrate cache:', e);
    }
  }

  // Migrate learning memory
  const localMemory = localStorage.getItem('learning_memory');
  if (localMemory) {
    try {
      const memory = JSON.parse(localMemory);
      for (const entry of memory) {
        await saveMemoryEntry(entry);
      }
      if (memory.length > 0) {
        migrated = true;
        console.log(`Migrated ${memory.length} memory entries to Supabase`);
      }
    } catch (e) {
      console.error('Failed to migrate memory:', e);
    }
  }

  // Migrate custom keywords
  const localKeywords = localStorage.getItem('custom_keywords');
  if (localKeywords) {
    try {
      const keywords = JSON.parse(localKeywords);
      await saveCustomKeywords(keywords);
      migrated = true;
      console.log('Migrated custom keywords to Supabase');
    } catch (e) {
      console.error('Failed to migrate keywords:', e);
    }
  }

  // Mark migration as complete
  if (migrated) {
    localStorage.setItem('supabase_migrated', 'true');
  }

  return migrated;
}
