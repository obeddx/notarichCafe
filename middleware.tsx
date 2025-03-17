import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Untuk rute /manager, izinkan role "manager" dan "owner"
  if (pathname.startsWith("/manager")) {
    const allowedRoles = ["manager", "owner"];
    let validToken: string | null = null;
    let detectedRole: string | null = null;

    for (const roleName of allowedRoles) {
      const cookieValue = req.cookies.get(roleName)?.value;
      if (cookieValue) {
        try {
          validToken = decodeURIComponent(cookieValue);
          detectedRole = roleName;
          break;
        } catch (error) {
          console.error(`Gagal mendecode cookie ${roleName}:`, error);
        }
      }
    }

    if (!validToken || !detectedRole) {
      return redirectToLogin(req, "Cookie untuk role manager/owner tidak ditemukan");
    }

    // Validasi token melalui API validateUser
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validateUser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userToken: validToken, role: detectedRole }),
    });

    if (!response.ok) {
      let errorMessage = "Validasi gagal";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (err) {
        console.error("Gagal membaca error response:", err);
      }
      return redirectToLogin(req, errorMessage);
    }
  }

  // Untuk rute /cashier
  if (pathname.startsWith("/cashier")) {
    const allowedRoles = ["kasir", "manager", "owner"];
    let validToken: string | null = null;
    let detectedRole: string | null = null;

    for (const roleName of allowedRoles) {
      const cookieValue = req.cookies.get(roleName)?.value;
      if (cookieValue) {
        try {
          validToken = decodeURIComponent(cookieValue);
          detectedRole = roleName;
          break;
        } catch (error) {
          console.error(`Gagal mendecode cookie ${roleName}:`, error);
        }
      }
    }

    if (!validToken || !detectedRole) {
      return redirectToLogin(req, "Cookie untuk kasir/manager tidak ditemukan");
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validateUser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userToken: validToken, role: detectedRole }),
    });

    if (!response.ok) {
      let errorMessage = "Validasi gagal";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (err) {
        console.error("Gagal membaca error response:", err);
      }
      return redirectToLogin(req, errorMessage);
    }
  }

  // Lanjutkan jika validasi berhasil
  return NextResponse.next();
}

function redirectToLogin(req: NextRequest, errorInfo: string = "") {
  const url = req.nextUrl.clone();
  url.pathname = "/portal";
  url.searchParams.set("from", req.nextUrl.pathname);
  if (errorInfo) {
    url.searchParams.set("error", errorInfo);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/manager/:path*", "/cashier/:path*"],
};
