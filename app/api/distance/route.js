import { NextResponse } from 'next/server';
import { calculateRoundTrip, calculateBulkRoundTrips } from '@/lib/distance';

export async function POST(request) {
  try {
    const body = await request.json();
    const { destination, destinations } = body;

    // Handle Bulk Request
    if (destinations && Array.isArray(destinations)) {
      const results = await calculateBulkRoundTrips(destinations);
      return NextResponse.json({ results });
    }

    // Handle Single Request (Backward compatibility)
    if (!destination) {
      return NextResponse.json(
        { error: 'destination or destinations array is required' },
        { status: 400 }
      );
    }

    const result = await calculateRoundTrip(destination);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Distance calculation error:', err);
    return NextResponse.json(
      { error: 'Failed to calculate distance', details: err.message },
      { status: 500 }
    );
  }
}
