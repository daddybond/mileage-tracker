import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET(request) {
  try {
    // If OAUTH_REDIRECT_URI is set in Vercel, the lib will use it automatically.
    // Otherwise, we calculate it dynamically here as a backup.
    const { origin } = new URL(request.url);
    const dynamicRedirectUri = origin.replace('http://', 'https://') + '/api/auth/google/callback';
    
    console.log('--- DEBUG: GOOGLE AUTH INIT ---');
    console.log('Dynamic Discovery URI:', dynamicRedirectUri);
    console.log('Using OAUTH_REDIRECT_URI if set:', !!process.env.OAUTH_REDIRECT_URI);
    
    const url = getAuthUrl(process.env.OAUTH_REDIRECT_URI || dynamicRedirectUri);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initiate Google auth', details: error.message },
      { status: 500 }
    );
  }
}
