// pages/api/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const isProduction = process.env.NODE_ENV === "production";

    // Daftar semua kemungkinan nama cookie berdasarkan login.ts
    const possibleCookies = ["user", "kasir", "manager"];

    // Buat array cookie yang akan dihapus
    const cookiesToDelete = possibleCookies.map((cookieName) => `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isProduction ? "; Secure" : ""}`);

    // Set header untuk menghapus semua cookie yang mungkin ada
    res.setHeader("Set-Cookie", cookiesToDelete);

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error logging out:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
