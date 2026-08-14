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
        getAll()       { return req.cookies.getAll(); },
        setAll(toSet)  {
          toSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  // Not logged in → redirect to login
  const isProtected =
    CUSTOMER_ROUTES.some(r => path.startsWith(r)) ||
    OWNER_ROUTES.some(r => path.startsWith(r));

  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isProtected) {
    // Fetch role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    // Customer trying to access owner routes
    if (OWNER_ROUTES.some(r => path.startsWith(r)) && role !== 'owner') {
      return NextResponse.redirect(new URL('/menu', req.url));
    }
    // Owner trying to access customer routes
    if (CUSTOMER_ROUTES.some(r => path.startsWith(r)) && role !== 'customer') {
      return NextResponse.redirect(new URL('/owner/customers', req.url));
    }
  }

  // Logged-in user hitting /login → send home
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
