import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const CUSTOMER_ROUTES = ['/menu', '/history', '/paybill', '/profile'];
const OWNER_ROUTES    = ['/owner'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res = NextResponse.next({ request: req });
            res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  const isCustomerRoute = CUSTOMER_ROUTES.some(r => path.startsWith(r));
  const isOwnerRoute    = OWNER_ROUTES.some(r => path.startsWith(r));
  const isProtected     = isCustomerRoute || isOwnerRoute;

  // Not logged in → login
  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    if (isOwnerRoute    && role !== 'owner')    return NextResponse.redirect(new URL('/menu',            req.url));
    if (isCustomerRoute && role !== 'customer') return NextResponse.redirect(new URL('/owner/customers', req.url));
  }

  // Already logged in, hitting /login → redirect home
  if (path === '/login' && user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const dest = profile?.role === 'owner' ? '/owner/customers' : '/menu';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};