import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Definisikan tipe untuk roleAccessMapping
type RoleAccessMapping = {
  [key: string]: string[];
};

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  // Validasi untuk rute /menu
  if (pathname.startsWith("/menu")) {
    const tableParam = searchParams.get("table");

    // Jika tidak ada parameter table, redirect ke scan
    if (!tableParam) {
      return redirectToScan(req, "Silakan scan QR code terlebih dahulu");
    }

    // Pemeriksaan sederhana untuk memastikan tableParam terlihat seperti string terenkripsi
    // String terenkripsi AES biasanya lebih panjang dari nomor biasa dan mengandung karakter khusus
    const isLikelyEncrypted = tableParam.length > 10 && /[^0-9]/.test(tableParam);
    if (!isLikelyEncrypted) {
      return redirectToScan(req, "Parameter table tidak valid. Harap scan QR code.");
    }

    // Jika lolos pemeriksaan, lanjutkan ke halaman menu
    // Dekripsi akan ditangani di file menu
    return NextResponse.next();
  }

  // Panggil endpoint API untuk mendapatkan role config
  const roleConfigResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/roleConfig`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!roleConfigResponse.ok) {
    console.error("Gagal mengambil role config:", await roleConfigResponse.text());
    return redirectToLogin(req, "Gagal memuat konfigurasi role");
  }

  const roleAccessMapping: RoleAccessMapping = await roleConfigResponse.json();

  let validToken: string | null = null;
  let detectedRole: string | null = null;

  for (const role of Object.keys(roleAccessMapping)) {
    const cookieValue = req.cookies.get(role)?.value;
    if (cookieValue) {
      try {
        validToken = decodeURIComponent(cookieValue);
        detectedRole = role;
        break;
      } catch (error) {
        console.error(`Gagal mendecode cookie untuk role ${role}:`, error);
      }
    }
  }

  if (!validToken || !detectedRole) {
    return redirectToLogin(req, "Cookie untuk role tidak ditemukan");
  }

  const allowedPaths: string[] = roleAccessMapping[detectedRole] || [];
  const isAllowed = allowedPaths.some((allowedPath: string) => pathname.startsWith(allowedPath));

  if (!isAllowed) {
    return redirectToLogin(req, "Akses ditolak untuk role anda");
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validateUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

function redirectToScan(req: NextRequest, errorInfo: string = "") {
  const url = req.nextUrl.clone();
  url.pathname = "/scan";
  url.searchParams.set("from", req.nextUrl.pathname);
  if (errorInfo) {
    url.searchParams.set("error", errorInfo);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/manager/:path*", "/cashier/:path*"],
};
