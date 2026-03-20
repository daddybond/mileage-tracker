import { NextResponse } from 'next/server';
import { classifyEvents } from '@/lib/classifier';

export async function POST(request) {
  try {
    const { events, memory, customKeywords } = await request.json();

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'events array is required' },
        { status: 400 }
      );
    }

    const classifications = await classifyEvents(events, memory, customKeywords);
    return NextResponse.json({ classifications });
  } catch (err) {
    console.error('Classification error:', err);
    return NextResponse.json(
      { error: 'Failed to classify events', details: err.message },
      { status: 500 }
    );
  }
}
