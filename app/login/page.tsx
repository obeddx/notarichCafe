"use client";

import { useState } from "react";
import Image from "next/image";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/login2.png')" }}>
      <div className="relative w-full max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-lg md:max-w-lg lg:max-w-xl">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">✕</button>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Log In</h2>
        <p className="text-sm text-center text-gray-600 mb-6">
          Don’t have an account?{" "}
          <a href="/register" className="text-blue-500">
            Create an account
          </a>
        </p>
        <form>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input type="text" className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type={showPassword ? "text" : "password"} className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="absolute top-9 right-2 text-gray-600" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <button type="submit" className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
            Log In
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
