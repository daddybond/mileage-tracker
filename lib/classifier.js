import { GoogleGenerativeAI } from '@google/generative-ai';

const CLASSIFICATION_PROMPT = `You are a business mileage classification assistant for a professional who works in events/hospitality (e.g., weddings, corporate events, venue visits). 

Classify each event as "business", "ignored", or "needs_review".
An event is "business" if it clearly relates to a professional engagement, client meeting, venue, photography, or event service.
An event is "ignored" if it's clearly for leisure, personal chores, family, health ("doctor", "dentist"), or admin like "pay day".
An event is "needs_review" ONLY if it is truly ambiguous. Use "needs_review" if you have < 70% confidence.

Rules:
1. For weddings, corporate galas, client meetings, and venue site visits, classify as "business".
2. For descriptions like "gym", "shopping", "holiday", "doctor", "dentist", "pay day", classify as "ignored".
3. Extract the implicit destination address or venue name from the "Title", "Location", or "Description" text.
   - CRITICAL: Strip out people's names (e.g. "Carl", "Adam") or irrelevant words. If Title says "Carl GB beds", output strictly "GB beds".
4. If an implicit destination is found, include it exactly as written in "extractedDestination".
5. CRITICAL: The user's primary "studio" is located at "Wood Street Mill, James Street, Darwen BB3 1AS". If the text mentions "studio" (e.g. "hire studio", "studio shoot"), you MUST set the extractedDestination to "Wood Street Mill, James Street, Darwen BB3 1AS".

Return ONLY a JSON array of objects with this format:
[
  { 
    "eventId": "id", 
    "classification": "business" | "ignored" | "needs_review", 
    "extractedDestination": "string or null", 
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
    { model: 'gemini-2.5-flash', version: 'v1beta' },
    { model: 'gemini-2.0-flash', version: 'v1beta' },
    { model: 'gemini-flash-latest', version: 'v1beta' },
    { model: 'gemini-pro-latest', version: 'v1beta' }
  ];

  const memoryContext = memory.length > 0 
    ? memory.slice(0, 50).map(m => `"${m.title}" -> ${m.classification}`).join('\n')
    : "No historic data yet.";

  const dynamicPrompt = `${CLASSIFICATION_PROMPT}\n\nUSER'S PAST DECISIONS for specific names (USE THIS AS CONTEXT):\n${memoryContext}`;

  const aiResults = await Promise.all(batches.map(async (batch, batchIdx) => {
    const eventsText = batch.map((e) => 
      `ID: ${e.id}\nTitle: "${e.title}"\nLocation: "${e.location || 'None'}"\nDescription: "${(e.description || '').substring(0, 300)}"`
    ).join('\n---\n');

    const prompt = `${dynamicPrompt}\n\nHere are the calendar events to classify:\n\n${eventsText}`;

    let lastError = null;

    for (const config of configs) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: config.model,
          generationConfig: { 
            temperature: 0
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
            reasoning: r.reason || 'AI concluded based on context',
            destination: r.extractedDestination || r.suggestedDestination || null
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
