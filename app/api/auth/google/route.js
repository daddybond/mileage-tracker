import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET(request) {
  try {
    // Dynamically construct redirect URI based on the current domain
    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/api/auth/google/callback`;
    
    const url = getAuthUrl(redirectUri);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initiate Google auth', details: error.message },
      { status: 500 }
    );
  }
}
