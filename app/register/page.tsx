"use client";

import { useEffect, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function RegisterPage() {
  // ======================
  // STATE & HOOKS
  // ======================
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("kasir");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Token-related states (invite token dari URL)
  const [inviteTokenValid, setInviteTokenValid] = useState<boolean | null>(null);
  const [inviteEmployee, setInviteEmployee] = useState<any>(null);

  // Opsi generate token manual
  const [generateToken, setGenerateToken] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromURL = searchParams?.get("token");

  // ======================
  // FUNGSI: Generate Token Manual
  // ======================
  const generateManualToken = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let token = "";
    for (let i = 0; i < 50; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  };

  // ======================
  // EFFECT: Verifikasi Token dari URL
  // ======================
  useEffect(() => {
    // Jika tidak ada token di URL, berarti pendaftaran biasa
    if (!tokenFromURL) {
      setInviteTokenValid(null);
      return;
    }

    // Verifikasi token ke API (opsional)
    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/verify-invite?token=${tokenFromURL}`);
        if (!res.ok) {
          setInviteTokenValid(false);
          return;
        }
        const data = await res.json();
        setInviteTokenValid(true);
        setInviteEmployee(data.employee);
        // Contoh: Anda bisa auto-isi email dari data.employee.email
      } catch (error) {
        setInviteTokenValid(false);
      }
    };

    verifyToken();
  }, [tokenFromURL]);

  // ======================
  // VALIDASI INPUT
  // ======================
  const validateInput = () => {
    if (username.length < 3 || username.length > 20) {
      toast.error("Username harus 3-20 karakter");
      return false;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      toast.error("Format email tidak valid");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password harus minimal 6 karakter");
      return false;
    }
    return true;
  };

  // ======================
  // SUBMIT REGISTER
  // ======================
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validateInput()) return;
    setLoading(true);

    try {
      // Generate token manual jika user mencentang checkbox
      const manualToken = generateToken ? generateManualToken() : null;

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          role,
          // Token dari URL (jika ada)
          token: tokenFromURL,
          // Token manual (jika user mencentang "Generate Token")
          manualToken,
        }),
      });

      const data = await res.json();
      console.log("Response dari server:", data); // Debugging

      if (res.ok) {
        toast.success("Registrasi berhasil, silakan login!");
        setTimeout(() => router.push(`/portal`), 1500);
      } else {
        setErrorMessage(data.message || "Registrasi gagal");
        toast.error(data.message || "Registrasi gagal");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan, coba lagi nanti");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // RENDER
  // ======================
  // Jika tokenFromURL ada, tapi belum dipastikan valid/invalid
  if (tokenFromURL && inviteTokenValid === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p>Memeriksa token...</p>
      </div>
    );
  }

  // Jika tokenFromURL ada dan invalid
  if (tokenFromURL && inviteTokenValid === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-red-500">Token undangan tidak valid atau sudah digunakan.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/login2.png')" }}>
      <ToastContainer />
      <div className="relative w-full max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-lg md:max-w-lg lg:max-w-xl">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">✕</button>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Register</h2>
        <p className="text-sm text-center text-gray-600 mb-6">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500">
            Log In
          </a>
        </p>
        {errorMessage && <p className="text-center text-red-500 mb-4">{errorMessage}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input type="text" className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type={showPassword ? "text" : "password"} className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="absolute top-9 right-2 text-gray-600" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* Jika Anda mau role di-set otomatis dari token, 
              Anda bisa menyembunyikan ini saat token valid. */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <div className="flex items-center mt-1">
              <label className="mr-4 flex items-center text-sm font-medium text-gray-700">
                <input type="radio" value="kasir" checked={role === "kasir"} onChange={(e) => setRole(e.target.value)} className="mr-1" />
                Kasir
              </label>
              <label className="flex items-center text-sm font-medium text-gray-700">
                <input type="radio" value="manager" checked={role === "manager"} onChange={(e) => setRole(e.target.value)} className="mr-1" />
                Manager
              </label>
            </div>
          </div>

          {/* Checkbox Generate Token */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Generate Token?</label>
            <div className="flex items-center mt-1">
              <label className="mr-4 flex items-center text-sm font-medium text-gray-700">
                <input type="checkbox" checked={generateToken} onChange={(e) => setGenerateToken(e.target.checked)} className="mr-1" />
                Generate Token
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
            {loading ? "Processing..." : "Register"}
          </button>
        </form>

        <div className="my-4 text-center text-gray-500">OR</div>
        <button className="text-black w-full flex items-center justify-center p-2 border rounded-lg hover:bg-gray-200 transition">
          <FcGoogle className="text-xl mr-2" /> Register with Google
        </button>
      </div>
    </div>
  );
}
