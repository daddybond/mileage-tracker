import { google } from 'googleapis';
import { GOOGLE_SCOPES } from './constants';

/**
 * Create an OAuth2 client configured with environment credentials.
 */
export function createOAuth2Client(redirectUri) {
  // Priority: 1. Manual override, 2. Strict OAUTH_REDIRECT_URI, 3. GOOGLE_REDIRECT_URI, 4. Dynamic Base URL
  const finalRedirectUri = redirectUri || 
    process.env.OAUTH_REDIRECT_URI || 
    process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    finalRedirectUri
  );
}

/**
 * Generate the Google OAuth consent URL.
 */
export function getAuthUrl(redirectUri) {
  const oauth2Client = createOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent',
  });
}

/**
 * Exchange an authorization code for tokens.
 */
export async function getTokensFromCode(code, redirectUri) {
  const oauth2Client = createOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create an authenticated OAuth2 client from stored tokens.
 */
export function getAuthenticatedClient(tokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}
