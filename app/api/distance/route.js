import { NextResponse } from 'next/server';
import { calculateRoundTrip } from '@/lib/distance';

export async function POST(request) {
  try {
    const { destination } = await request.json();

    if (!destination) {
      return NextResponse.json(
        { error: 'destination is required' },
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
