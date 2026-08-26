import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const jwt = request.cookies.get('jwt')?.value;

  if (!jwt) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const strapiRes = await fetch(`${STRAPI_URL}/api/users/me?populate=role`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!strapiRes.ok) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await strapiRes.json();
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
