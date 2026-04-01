import { NextResponse } from 'next/server';

export async function POST(request) {
  const { password, from } = await request.json();

  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const destination = from && from.startsWith('/') ? from : '/';
  const response = NextResponse.json({ ok: true, redirect: destination });

  response.cookies.set('site_auth', 'true', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Expires in 7 days
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
