import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticatedClient } from '@/lib/google-auth';
import { fetchCalendarEvents } from '@/lib/calendar';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  if (!startDateParam || !endDateParam) {
    return NextResponse.json(
      { error: 'startDate and endDate query parameters are required (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_tokens');

  if (!tokensCookie) {
    return NextResponse.json(
      { error: 'Not authenticated. Please connect Google Calendar first.' },
      { status: 401 }
    );
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);
    const auth = getAuthenticatedClient(tokens);

    // Build date range from params
    const timeMin = new Date(startDateParam + 'T00:00:00').toISOString();
    const timeMax = new Date(endDateParam + 'T23:59:59').toISOString();

    const events = await fetchCalendarEvents(auth, timeMin, timeMax);

    return NextResponse.json({ events, count: events.length });
  } catch (err) {
    console.error('Calendar fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: err.message },
      { status: 500 }
    );
  }
}
