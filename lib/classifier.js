import { GoogleGenerativeAI } from '@google/generative-ai';

const CLASSIFICATION_PROMPT = `You are a business mileage classification assistant for a professional who works in events/hospitality (e.g., weddings, corporate events, venue visits). 

Classify each event as "business", "personal", or "needs_review".
An event is "business" if it clearly relates to a professional engagement, client meeting, venue visit, or event service.
An event is "personal" if it's clearly for leisure, personal chores, or family.
An event is "needs_review" ONLY if it is truly ambiguous and you need the user's help to decide. Use "needs_review" if you have less than 70% confidence.

Rules:
1. For weddings, corporate galas, and venue site visits, classify as "business".
2. For descriptions like "gym", "shopping", "holiday", classify as "personal".
3. Try to identify a likely destination address or venue name from the "Title", "Location", or "Description".
4. If a destination is found, include it in "suggestedDestination".

Return ONLY a JSON array of objects with this format:
[
  { 
    "eventId": "id", 
    "classification": "business" | "personal" | "needs_review", 
    "suggestedDestination": "string or null", 
    "confidence": number (0-100),
    "reason": "short explanation" 
  }
]`;

import { classifyWithEngine } from './learning-engine';

/**
 * Classifies a batch of calendar events using the Layered Engine + Gemini AI
 */
export async function classifyEvents(events, memory = [], customKeywords = null) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  
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

  // Process remaining with AI in batches
  const BATCH_SIZE = 10;
  const aiEvents = needsAI.map(r => r.event);
  const batches = [];
  for (let i = 0; i < aiEvents.length; i += BATCH_SIZE) {
    batches.push(aiEvents.slice(i, i + BATCH_SIZE));
  }

  // ... rest of AI logic ...
  const configs = [
    { model: 'gemini-1.5-flash', version: 'v1' },
    { model: 'gemini-1.5-flash', version: 'v1beta' }
  ];

  const aiResults = await Promise.all(batches.map(async (batch, batchIdx) => {
    const eventsText = batch.map((e) => 
      `ID: ${e.id}\nTitle: ${e.title}\nDescription: ${e.description}\nLocation: ${e.location}\nDate: ${e.date}`
    ).join('\n---\n');

    const prompt = `${CLASSIFICATION_PROMPT}\n\nHere are the calendar events to classify:\n\n${eventsText}`;

    let lastError = null;

    for (const config of configs) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: config.model,
          generationConfig: { 
            temperature: 0,
            responseMimeType: "application/json"
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        }, { apiVersion: config.version });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]).map(r => ({
            ...r,
            source: 'AI Inference',
            reasoning: r.reason || 'AI concluded based on context'
          }));
        } else {
          lastError = 'No JSON array found in response';
        }
      } catch (err) {
        lastError = err.message || err.toString();
        console.error(`--- AI BATCH FAILED ---`);
        console.error(`Model: ${config.model}`);
        console.error(`Error:`, err);
      }
    }
    
    return batch.map(e => ({
      eventId: e.id,
      classification: 'needs_review',
      confidence: 0,
      reasoning: `AI Failed: ${lastError || 'Unknown Error'}`,
      source: 'System'
    }));
  }));

  return [...alreadyClassified, ...aiResults.flat()];
}
