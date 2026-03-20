import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google-auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?auth_error=no_code', request.url)
    );
  }

  try {
    // Force HTTPS for the redirect URI on Vercel
    let { origin } = new URL(request.url);
    if (origin.startsWith('http://') && !origin.includes('localhost')) {
      origin = origin.replace('http://', 'https://');
    }
    const redirectUri = `${origin}/api/auth/google/callback`;

    const tokens = await getTokensFromCode(code, redirectUri);

    // Store tokens in an HTTP-only cookie (encrypted in production)
    const cookieStore = await cookies();
    cookieStore.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.redirect(new URL('/?auth_success=true', request.url));
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}
