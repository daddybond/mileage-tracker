import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET(request) {
  try {
    // Dynamically construct redirect URI based on the current domain
    // Force HTTPS for the redirect URI on Vercel
    let { origin } = new URL(request.url);
    if (origin.startsWith('http://') && !origin.includes('localhost')) {
      origin = origin.replace('http://', 'https://');
    }
    const redirectUri = `${origin}/api/auth/google/callback`;
    
    console.log('--- DEBUG: GOOGLE AUTH INIT ---');
    console.log('Final Redirect URI:', redirectUri);
    
    const url = getAuthUrl(redirectUri);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initiate Google auth', details: error.message },
      { status: 500 }
    );
  }
}
