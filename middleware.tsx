// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Periksa apakah URL yang diakses mengandung /manager
  if (req.nextUrl.pathname.startsWith("/manager")) {
    // Cek apakah ada cookie "user"
    const userCookie = req.cookies.get("user");
    if (!userCookie) {
      // Jika tidak ada, redirect ke halaman login
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  // Jika sudah login atau bukan halaman /manager, lanjutkan
  return NextResponse.next();
}

// Atur matcher agar middleware hanya berjalan untuk rute /manager/*
export const config = {
  matcher: ["/manager/:path*"],
};
