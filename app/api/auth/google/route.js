import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initiate Google auth', details: error.message },
      { status: 500 }
    );
  }
}
