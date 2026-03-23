import { classifyWithEngine } from './learning-engine';

/**
 * Classifies a batch of calendar events using the Local Engine (Layers 1 & 2)
 * Bypasses AI to enforce manual classification for ambiguous events
 */
export async function classifyEvents(events, memory = [], customKeywords = null) {
  
  // Layer 1 & 2: Local Engine (Rules & Memory) - Process all first
  const initialResults = events.map(event => {
    return {
      event,
      result: classifyWithEngine(event, memory, customKeywords)
    };
  });

  // Identify events that still need Layer 3/4 (AI Inference)
  const needsAI = initialResults.filter(r => r.result.classification === null);
  const alreadyClassified = initialResults.filter(r => r.result.classification !== null).map(r => ({
    eventId: r.event.id,
    ...r.result
  }));

  if (needsAI.length === 0) return alreadyClassified;

  // Any event that does not match local rules is sent straight to manual review
  const manualReviewResults = needsAI.map(r => ({
    eventId: r.event.id,
    classification: 'needs_review',
    confidence: 0,
    reasoning: 'Sent to manual review',
    source: 'System',
    destination: r.result.suggestedDestination || null
  }));

  return [...alreadyClassified, ...manualReviewResults];
}
