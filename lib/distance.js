import { HOME_ADDRESS, MILEAGE_RATE } from './constants';

const METRES_TO_MILES = 0.000621371;

/**
 * Calculate round-trip driving distance and cost using Google Maps Distance Matrix API.
 * @param {string} destination - The destination address or place name
 * @returns {{ distanceMetres: number, distanceMiles: number, roundTripMiles: number, cost: number, duration: string, destinationAddress: string }}
 */
export async function calculateRoundTrip(destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', HOME_ADDRESS);
  url.searchParams.set('destinations', destination);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('region', 'gb');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Distance Matrix API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`No route found to "${destination}". Status: ${element?.status || 'unknown'}`);
  }

  const distanceMetres = element.distance.value;
  const onewayMiles = distanceMetres * METRES_TO_MILES;
  const roundTripMiles = Math.round(onewayMiles * 2 * 10) / 10; // 1 decimal place
  const cost = Math.round(roundTripMiles * MILEAGE_RATE * 100) / 100;

  return {
    distanceMetres,
    distanceMiles: Math.round(onewayMiles * 10) / 10,
    roundTripMiles,
    cost,
    duration: element.duration.text,
    destinationAddress: data.destination_addresses?.[0] || destination,
    originAddress: data.origin_addresses?.[0] || HOME_ADDRESS,
  };
}
