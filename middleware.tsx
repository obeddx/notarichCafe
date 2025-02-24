// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/manager")) {
    const managerCookie = req.cookies.get("manager")?.value;

    if (!managerCookie) {
      return redirectToLogin(req);
    }

    // Panggil API Route untuk validasi
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validateUser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userToken: managerCookie, role: "manager" }),
    });

    if (!response.ok) {
      return redirectToLogin(req);
    }
  }

  if (pathname.startsWith("/cashier")) {
    const kasirCookie = req.cookies.get("kasir")?.value;

    if (!kasirCookie) {
      return redirectToLogin(req);
    }

    // Panggil API Route untuk validasi
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validateUser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userToken: kasirCookie, role: "kasir" }),
    });

    if (!response.ok) {
      return redirectToLogin(req);
    }
  }

  // Lanjutkan jika validasi berhasil
  return NextResponse.next();
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/portal";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/manager/:path*", "/cashier/:path*"],
};