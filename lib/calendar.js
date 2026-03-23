import { google } from 'googleapis';

/**
 * Fetch calendar events for a given date range.
 * @param {object} auth - Authenticated OAuth2 client
 * @param {string} timeMin - ISO date string (start)
 * @param {string} timeMax - ISO date string (end)
 * @returns {Array} Sanitised event list
 */
export async function fetchCalendarEvents(auth, timeMin, timeMax) {
  const calendar = google.calendar({ version: 'v3', auth });

  let allEvents = [];
  let pageToken = undefined;

  do {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });
    
    allEvents = allEvents.concat(response.data.items || []);
    pageToken = response.data.nextPageToken;
    
    // Safety break to prevent infinite loops on massive calendars
    if (allEvents.length >= 2500) break;
  } while (pageToken);

  const events = allEvents;

  return events.map((event) => ({
    id: event.id,
    title: event.summary || 'Untitled Event',
    description: (event.description || '').substring(0, 200), // Server-side diet to prevent mobile OOM
    location: event.location || '',
    date: event.start?.dateTime || event.start?.date || '',
    endDate: event.end?.dateTime || event.end?.date || '',
    allDay: !event.start?.dateTime,
  }));
}
