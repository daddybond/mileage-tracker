/**
 * Smarter AI Classification Engine
 * Layers: 1. Hard Rules (Keywords) 2. Memory (Learned Patterns) 3. AI Fallback (Gemini)
 */

export const DEFAULT_INDICATORS = {
  business: [
    'shoot', 'client', 'headshots', 'delivery', 'consultation', 'studio', 
    'invoice', 'meeting', 'forbes', 'ribble cycles', 'tarox', 'visit', 
    'site visit', 'wedding', 'event', 'workshop'
  ],
  personal: [
    'school', 'parents evening', 'dentist', 'birthday', 'doctor', 'family', 
    'blossom', 'gym', 'shopping', 'holiday', 'pharmacy', 'personal'
  ]
};

/**
 * Fuzzy match a string against a list of terms
 */
function findMatches(text, terms) {
  if (!text) return [];
  const normalizedText = text.toLowerCase();
  return terms.filter(term => normalizedText.includes(term.toLowerCase()));
}

/**
 * Calculate similarity between two strings (simple Jaccard index on words)
 */
function getSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const w1 = new Set(s1.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const w2 = new Set(s2.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  if (w1.size === 0 || w2.size === 0) return 0;
  
  const intersection = new Set([...w1].filter(x => w2.has(x)));
  return (intersection.size / Math.max(w1.size, w2.size)) * 100;
}

/**
 * Layered Classification logic
 */
export function classifyWithEngine(event, memory = [], customKeywords = null) {
  const indicators = customKeywords || DEFAULT_INDICATORS;
  const textToScale = `${event.title} ${event.description} ${event.location}`.toLowerCase();
  
  // LAYER 0: Magic Keywords (Hard Triggers)
  if (textToScale.includes('#biz') || textToScale.includes('#mileage')) {
    return {
      classification: 'business',
      confidence: 100,
      reasoning: `Magic Keyword trigger found: #biz / #mileage`,
      source: 'Magic Trigger',
      suggestedDestination: event.location || null
    };
  }
  
  // LAYER 1: Hard Rules (Keywords)
  // We prioritize Personal matches to avoid privacy intrusions / unwanted business tracking
  const persMatches = findMatches(textToScale, indicators.personal);
  if (persMatches.length > 0) {
    return {
      classification: 'personal',
      confidence: 100,
      reasoning: `Match found in personal keywords: ${persMatches[0]}`,
      source: 'Rule Match',
      suggestedDestination: null
    };
  }

  const bizMatches = findMatches(textToScale, indicators.business);

  // Location Mapping (Prioritize actual location field from Calendar)
  let suggestedDestination = event.location || null;
  
  if (textToScale.includes('studio') || textToScale.includes('wood street mill')) {
    suggestedDestination = 'Wood Street Mill, Wood St, Darwen BB3 1AS';
  }

  if (bizMatches.length > 0) {
    return {
      classification: 'business',
      confidence: 90 + Math.min(bizMatches.length * 2, 10),
      reasoning: `Match found in business keywords: ${bizMatches[0]}${event.location ? ' (using calendar location)' : ''}`,
      source: 'Rule Match',
      suggestedDestination
    };
  }

  // LAYER 2: Memory (Learned Patterns)
  let bestMatch = null;
  let maxSimilarity = 0;

  memory.forEach(past => {
    const et = (event.title || '').toLowerCase();
    const pt = (past.title || '').toLowerCase();
    
    // Check for exact title match first
    if (et && pt && et === pt) {
      maxSimilarity = 100;
      bestMatch = past;
    } else {
      const similarity = getSimilarity(event.title || '', past.title || '');
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = past;
      }
    }
  });

  if (maxSimilarity >= 85) {
    return {
      classification: bestMatch.classification,
      confidence: Math.round(maxSimilarity),
      reasoning: `Learned from your past decision on "${bestMatch.title}"`,
      source: 'Learned Pattern',
      suggestedDestination: bestMatch.destination || suggestedDestination
    };
  }

  // LAYER 3: No match — send to manual review
  return {
    classification: null,
    confidence: 0,
    reasoning: 'No matching patterns found',
    source: 'Manual Review',
    suggestedDestination
  };
}
