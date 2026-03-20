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

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });

  const events = response.data.items || [];

  return events.map((event) => ({
    id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    location: event.location || '',
    date: event.start?.dateTime || event.start?.date || '',
    endDate: event.end?.dateTime || event.end?.date || '',
    allDay: !event.start?.dateTime,
  }));
}
