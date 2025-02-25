// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/manager")) {
    const managerCookie = req.cookies.get("manager")?.value;
    let decodedManagerCookie: string | null = null;
    if (managerCookie) {
      try {
        decodedManagerCookie = decodeURIComponent(managerCookie);
      } catch (error) {
        console.error("Gagal mendecode cookie manager:", error);
        // Jika decode gagal, anggap cookie tidak valid
        decodedManagerCookie = null;
      }
    }

    if (!decodedManagerCookie) {
      return redirectToLogin(req, "Cookie manager tidak ditemukan");
    }

    // Panggil API Route untuk validasi menggunakan token yang sudah didecode
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/validateUser`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userToken: decodedManagerCookie, role: "manager" }),
      }
    );

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

  if (pathname.startsWith("/cashier")) {
    // Ambil cookie untuk kasir dan manager
    const kasirCookie = req.cookies.get("kasir")?.value;
    const managerCookie = req.cookies.get("manager")?.value;

    let decodedKasirCookie: string | null = null;
    let decodedManagerCookie: string | null = null;

    if (kasirCookie) {
      try {
        decodedKasirCookie = decodeURIComponent(kasirCookie);
      } catch (error) {
        console.error("Gagal mendecode cookie kasir:", error);
        decodedKasirCookie = null;
      }
    }
    if (managerCookie) {
      try {
        decodedManagerCookie = decodeURIComponent(managerCookie);
      } catch (error) {
        console.error("Gagal mendecode cookie manager:", error);
        decodedManagerCookie = null;
      }
    }

    if (!decodedKasirCookie && !decodedManagerCookie) {
      return redirectToLogin(req, "Cookie kasir atau manager tidak ditemukan");
    }

    // Tentukan userToken dan role berdasarkan cookie yang ada
    const userToken = decodedKasirCookie || decodedManagerCookie;
    const role = decodedKasirCookie ? "kasir" : "manager";

    // Panggil API Route untuk validasi
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/validateUser`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userToken, role }),
      }
    );

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
