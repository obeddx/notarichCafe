// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Periksa apakah URL yang diakses berawalan /manager atau /kasir
  if (
    req.nextUrl.pathname.startsWith("/manager") ||
    req.nextUrl.pathname.startsWith("/cashier")
  ) {
    // Cek apakah ada cookie "user"
    const userCookie = req.cookies.get("user");
    if (!userCookie) {
      // Jika tidak ada, redirect ke halaman login
      const url = req.nextUrl.clone();
      url.pathname = "/portal";
      url.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  // Jika sudah login atau bukan halaman /manager dan /kasir, lanjutkan
  return NextResponse.next();
}

// Atur matcher agar middleware berjalan untuk rute /manager/* dan /kasir/*
export const config = {
  matcher: ["/manager/:path*", "/cashier/:path*"],
};
