import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const apiBase = () => (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

async function proxy(request: Request, segments: string[]) {
  const path = segments.join('/');
  const url = `${apiBase()}/${path}${new URL(request.url).search}`;
  const store = await cookies();
  const token = store.get('tc_session')?.value;
  const headers = new Headers(request.headers);
  headers.delete('host');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
  });
  const location = res.headers.get('Location');
  if (location && res.status >= 300 && res.status < 400) {
    return NextResponse.redirect(location, res.status);
  }
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path);
}
