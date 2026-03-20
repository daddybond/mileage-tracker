import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET(request) {
  try {
    // Dynamically construct redirect URI based on the current domain
    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/api/auth/google/callback`;
    
    console.log('--- DEBUG: GOOGLE AUTH INIT ---');
    console.log('Origin:', origin);
    console.log('Redirect URI:', redirectUri);
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 15) + '...');
    
    const url = getAuthUrl(redirectUri);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initiate Google auth', details: error.message },
      { status: 500 }
    );
  }
}
