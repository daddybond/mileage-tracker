import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
The user just manually confirmed that the following calendar event was a 'Business' event. 
Your goal is to extract the 1 or 2 core keywords (client name, professional venue, or project title) that triggered this decision, so the app can learn from it for the future.

Calendar Event:
Title: "${title}"
Description: "${(description || '').substring(0, 200)}"

Return ONLY a valid JSON array of lowercase strings representing the core keywords.
Example: ["adam", "starbucks"]
Do NOT return generic words like "meeting", "lunch", "call", "with", "the". Focus exclusively on proper nouns or specific industry identifiers.
If the title is literally "Business Meeting", return [].
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const responseText = result.response.text();
    let keywords = [];

    try {
      keywords = JSON.parse(responseText);
      if (!Array.isArray(keywords)) keywords = [];
    } catch (e) {
      console.error('Failed to parse Gemini response', responseText);
    }

    // Filter out obvious noise
    const stopWords = ['meeting', 'lunch', 'call', 'dinner', 'breakfast', 'with', 'the', 'a', 'an', 'at'];
    keywords = keywords.filter(k => typeof k === 'string' && k.length > 2 && !stopWords.includes(k.toLowerCase()));

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error('API Learn Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
