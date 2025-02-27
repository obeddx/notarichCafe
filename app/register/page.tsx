"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("kasir");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [generateToken, setGenerateToken] = useState(false);

  const router = useRouter();

  const generateManualToken = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    let token = "";
    for (let i = 0; i < 50; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  };

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validateInput()) return;
    setLoading(true);

    try {
      // Generate token manual jika opsi dipilih
      const token = generateToken ? generateManualToken() : null;

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role, token }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Registrasi berhasil, silakan login!");
        if (data.token) {
          toast.info(`Token Anda: ${data.token}`);
        }
        setTimeout(() => router.push(`/login?role=${data.role}`), 1500);
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
