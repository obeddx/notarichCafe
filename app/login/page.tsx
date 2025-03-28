"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  // Jika ada query parameter role, maka lockedRole akan digunakan untuk validasi akses
  const lockedRole = searchParams?.get("role") || "";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok) {
        // Jika lockedRole disediakan, validasi kecocokan role (menggunakan lowercase untuk konsistensi)
        if (lockedRole && data.user.role.toLowerCase() !== lockedRole.toLowerCase()) {
          setErrorMessage(`Akun Anda tidak memiliki akses sebagai ${lockedRole}`);
          setLoading(false);
          return;
        }

        // Simpan data user ke sessionStorage untuk keperluan aplikasi
        sessionStorage.setItem("user", JSON.stringify(data.user));
        sessionStorage.setItem("role", JSON.stringify(data.user.role));

        // Redirect berdasarkan role locked atau berdasarkan role user
        if (lockedRole.toLowerCase() === "manager") {
          toast.success("Login berhasil!");
          setTimeout(() => router.push(`/manager/dashboard`), 1500);
        } else if (lockedRole.toLowerCase() === "kasir") {
          toast.success("Login berhasil!");
          setTimeout(() => router.push(`/cashier/kasir`), 1500);
        } else {
          toast.success("Login berhasil !");
          setTimeout(() => router.push(`/`), 1500);
        }
      } else {
        toast.error("Login gagal!");
        setErrorMessage(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("An error occurred while logging in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/login2.png')" }}>
      <div className="relative w-full max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-lg md:max-w-lg lg:max-w-xl">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">✕</button>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Log In {lockedRole && lockedRole.toLowerCase()}</h2>
        <p className="text-sm text-center text-gray-600 mb-6">
          Don’t have an account?{" "}
          <a href="/register" className="text-blue-500">
            Create an account
          </a>
        </p>

        {errorMessage && <p className="text-center text-red-500 mb-4">{errorMessage}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input type="text" className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type={showPassword ? "text" : "password"} className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="absolute top-9 right-2 text-gray-600" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <div className="my-4 text-center text-gray-500">OR</div>
        <button className="text-black w-full flex items-center justify-center p-2 border rounded-lg hover:bg-gray-200 transition">
          <FcGoogle className="text-xl mr-2" /> Log In with Google
        </button>
      </div>
    </div>
  );
}
