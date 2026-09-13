import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const strapiRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password }),
    });

    const data = await strapiRes.json();

    if (!strapiRes.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Login failed' },
        { status: strapiRes.status }
      );
    }

    // Check approval status before granting a session
    const profileRes = await fetch(`${STRAPI_URL}/api/my-profile`, {
      headers: { Authorization: `Bearer ${data.jwt}` },
    });
    const profileData = await profileRes.json();
    const approvalStatus = profileData.user?.approvalStatus;

    if (approvalStatus === 'pending') {
      return NextResponse.json(
        { error: 'Your account is awaiting admin approval.' },
        { status: 403 }
      );
    }

    if (approvalStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Your account access has been denied. Contact the administrator.' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ user: data.user });

    response.cookies.set('jwt', data.jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
