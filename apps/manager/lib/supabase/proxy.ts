import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (!claims && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (claims && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  } catch {
    if (pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }
}
