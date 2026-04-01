import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET(request) {
  try {
    const { origin } = new URL(request.url);
    const dynamicRedirectUri = `${origin}/api/auth/google/callback`;
    const url = getAuthUrl(process.env.OAUTH_REDIRECT_URI || dynamicRedirectUri);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initiate Google auth', details: error.message },
      { status: 500 }
    );
  }
}
