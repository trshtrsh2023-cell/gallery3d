import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_change_in_production'
);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi  = pathname.startsWith('/api/admin') && pathname !== '/api/admin/login';
  const isPhotoApi  = pathname.startsWith('/api/photos') && request.method !== 'GET';

  if (isAdminPage || isAdminApi || isPhotoApi) {
    const token = request.cookies.get('gallery_admin_token')?.value;

    if (!token) {
      if (isAdminPage) return NextResponse.redirect(new URL('/admin/login', request.url));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {
      if (isAdminPage) return NextResponse.redirect(new URL('/admin/login', request.url));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/photos/:path*'],
};
