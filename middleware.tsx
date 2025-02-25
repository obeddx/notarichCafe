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
    // Ambil cookie untuk kasir dan manager
    const kasirCookie = req.cookies.get("kasir")?.value;
    const managerCookie = req.cookies.get("manager")?.value;
  
    // Jika tidak ada cookie sama sekali, redirect ke login
    if (!kasirCookie && !managerCookie) {
      return redirectToLogin(req);
    }
  
    // Tentukan userToken dan role berdasarkan cookie yang ada
    const userToken = kasirCookie || managerCookie;
    const role = kasirCookie ? "kasir" : "manager";
  
    // Panggil API Route untuk validasi
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validateUser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userToken, role }),
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