import { NextResponse } from 'next/server';

/**
 * Proxy for Google Places API (New) Autocomplete
 * Endpoint: https://places.googleapis.com/v1/places:autocomplete
 */
export async function POST(request) {
  try {
    const { input } = await request.json();

    if (!input) {
      return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Maps API key not configured' }, { status: 500 });
    }

    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: input,
        includedRegionCodes: ['gb'], // Restrict to UK
        // Optional: locationBias could be added here if we had user's lat/lng
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Places API (New) error:', response.status, data);
      return NextResponse.json({ 
        error: 'Places API error', 
        details: data.error?.message || 'Unknown error' 
      }, { status: response.status });
    }

    // Map suggestions to our existing frontend format
    const predictions = (data.suggestions || []).map(s => {
      const p = s.placePrediction;
      return {
        id: p.placeId,
        description: p.text.text,
        main_text: p.structuredFormat?.mainText?.text || p.text.text,
        secondary_text: p.structuredFormat?.secondaryText?.text || ''
      };
    });

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error('Autocomplete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
