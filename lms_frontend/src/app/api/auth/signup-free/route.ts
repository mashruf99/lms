import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * POST /api/auth/signup-free
 *
 * Public signup with no payment. Two server-side steps:
 *   1. Register with Strapi (auto-approved, no admin verification)
 *   2. Immediately log in to obtain a JWT and set it as httpOnly cookie
 *
 * Client only sees the final user object. The JWT never touches the browser.
 */
export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    // ─── Step 1: create the account (no payment required) ───
    const registerRes = await fetch(`${STRAPI_URL}/api/auth/register-free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      return NextResponse.json(
        { error: registerData.error || 'Signup failed' },
        { status: registerRes.status }
      );
    }

    // ─── Step 2: immediately log in to issue the JWT cookie ───
    const loginRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password }),
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok) {
      // Registration worked but login didn't — rare, but we surface it clearly.
      return NextResponse.json(
        {
          error:
            'Account created, but automatic login failed. Please log in manually.',
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ user: loginData.user });

    response.cookies.set('jwt', loginData.jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error('[signup-free] error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
