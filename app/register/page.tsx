// "use client";

// import { useEffect, useState, FormEvent } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { FcGoogle } from "react-icons/fc";
// import { FaEye, FaEyeSlash } from "react-icons/fa";

// interface RoleType {
//   id: number;
//   name: string;
// }

// export default function RegisterPage() {
//   const [username, setUsername] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [role, setRole] = useState("");
//   const [availableRoles, setAvailableRoles] = useState<RoleType[]>([]);
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState("");

//   const [inviteTokenValid, setInviteTokenValid] = useState<boolean | null>(null);
//   const [inviteEmployee, setInviteEmployee] = useState<any>(null);

//   const isInviteFlow = !!(inviteTokenValid && inviteEmployee);

//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const tokenFromURL = searchParams?.get("token");

//   const generateManualToken = () => {
//     const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
//     let token = "";
//     for (let i = 0; i < 50; i++) {
//       token += characters.charAt(Math.floor(Math.random() * characters.length));
//     }
//     return token;
//   };

//   useEffect(() => {
//     if (!tokenFromURL) {
//       setInviteTokenValid(null);
//       return;
//     }

//     const verifyToken = async () => {
//       try {
//         const res = await fetch(`/api/verify-invite?token=${tokenFromURL}`);
//         if (!res.ok) {
//           setInviteTokenValid(false);
//           return;
//         }
//         const data = await res.json();
//         setInviteTokenValid(true);
//         setInviteEmployee(data.employee);
//       } catch (error) {
//         setInviteTokenValid(false);
//       }
//     };

//     verifyToken();
//   }, [tokenFromURL]);

//   useEffect(() => {
//     const fetchRoles = async () => {
//       try {
//         const res = await fetch("/api/employeeRoles");
//         if (!res.ok) {
//           throw new Error("Gagal mengambil data role");
//         }
//         const data = await res.json();
//         setAvailableRoles(data);
//       } catch (error: any) {
//         console.error(error);
//         toast.error("Gagal mengambil data role");
//       }
//     };

//     if (!isInviteFlow) {
//       fetchRoles();
//     }
//   }, [isInviteFlow]);

//   useEffect(() => {
//     if (inviteEmployee) {
//       setEmail(inviteEmployee.email || "");
//       if (inviteEmployee.role?.name) {
//         setRole(inviteEmployee.role.name);
//       }
//     }
//   }, [inviteEmployee]);

//   const validateInput = () => {
//     if (username.length < 3 || username.length > 20) {
//       toast.error("Username harus 3-20 karakter");
//       return false;
//     }
//     const emailRegex = /\S+@\S+\.\S+/;
//     if (!emailRegex.test(email)) {
//       toast.error("Format email tidak valid");
//       return false;
//     }
//     if (password.length < 6) {
//       toast.error("Password harus minimal 6 karakter");
//       return false;
//     }
//     if (!role) {
//       toast.error("Role belum dipilih");
//       return false;
//     }
//     return true;
//   };

//   const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setErrorMessage("");

//     if (!validateInput()) return;
//     setLoading(true);

//     try {
//       const userToken = generateManualToken(); // Selalu generate token baru

//       const res = await fetch("/api/register", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           username,
//           email,
//           password,
//           role,
//           inviteToken: tokenFromURL, // Untuk verifikasi invite
//           userToken, // Token yang akan disimpan
//         }),
//       });

//       const data = await res.json();
//       console.log("Response dari server:", data);

//       if (res.ok) {
//         toast.success("Registrasi berhasil, silakan login!");
//         setTimeout(() => router.push(`/portal`), 1500);
//       } else {
//         setErrorMessage(data.message || "Registrasi gagal");
//         toast.error(data.message || "Registrasi gagal");
//       }
//     } catch (error) {
//       toast.error("Terjadi kesalahan, coba lagi nanti");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (tokenFromURL && inviteTokenValid === null) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-100">
//         <p>Memeriksa token...</p>
//       </div>
//     );
//   }

//   if (tokenFromURL && inviteTokenValid === false) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-100">
//         <p className="text-red-500">Token undangan tidak valid atau sudah digunakan.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/login2.png')" }}>
//       <ToastContainer />
//       <div className="relative w-full max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-lg md:max-w-lg lg:max-w-xl">
//         <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">✕</button>
//         <h2 className="text-2xl font-bold text-center mb-4 text-black">Register</h2>
//         <p className="text-sm text-center text-gray-600 mb-6">
//           Already have an account?{" "}
//           <a href="/login" className="text-blue-500">
//             Log In
//           </a>
//         </p>
//         {errorMessage && <p className="text-center text-red-500 mb-4">{errorMessage}</p>}

//         <form onSubmit={handleSubmit}>
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700">Username</label>
//             <input type="text" className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={username} onChange={(e) => setUsername(e.target.value)} required />
//           </div>

//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700">Email</label>
//             <input
//               type="email"
//               className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black"
//               value={email}
//               onChange={(e) => {
//                 if (!isInviteFlow) {
//                   setEmail(e.target.value);
//                 }
//               }}
//               disabled={isInviteFlow}
//               required
//             />
//           </div>

//           <div className="mb-4 relative">
//             <label className="block text-sm font-medium text-gray-700">Password</label>
//             <input type={showPassword ? "text" : "password"} className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black" value={password} onChange={(e) => setPassword(e.target.value)} required />
//             <button type="button" className="absolute top-9 right-2 text-gray-600" onClick={() => setShowPassword(!showPassword)}>
//               {showPassword ? <FaEyeSlash /> : <FaEye />}
//             </button>
//           </div>

//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700">Role</label>
//             {isInviteFlow ? (
//               <input type="text" value={role} className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-black" readOnly />
//             ) : (
//               <select className="w-full mt-1 p-2 border rounded-lg bg-white text-black" value={role} onChange={(e) => setRole(e.target.value)} required>
//                 <option value="">-- Pilih Role --</option>
//                 {availableRoles.map((r) => (
//                   <option key={r.id} value={r.name}>
//                     {r.name}
//                   </option>
//                 ))}
//               </select>
//             )}
//           </div>

//           <button type="submit" disabled={loading} className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
//             {loading ? "Processing..." : "Register"}
//           </button>
//         </form>

//         <div className="my-4 text-center text-gray-500">OR</div>
//         <button className="text-black w-full flex items-center justify-center p-2 border rounded-lg hover:bg-gray-200 transition">
//           <FcGoogle className="text-xl mr-2" /> Register with Google
//         </button>
//       </div>
//     </div>
//   );
// }

"use client";
import { useEffect, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface RoleType {
  id: number;
  name: string;
}

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [availableRoles, setAvailableRoles] = useState<RoleType[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [inviteTokenValid, setInviteTokenValid] = useState<boolean | null>(null);
  const [inviteEmployee, setInviteEmployee] = useState<any>(null);

  const isInviteFlow = !!(inviteTokenValid && inviteEmployee);

  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromURL = searchParams?.get("token");

  // Redirect jika tidak ada token invite
  useEffect(() => {
    if (!tokenFromURL) {
      // Ubah tujuan redirect sesuai kebutuhan (misalnya /portal atau /login)
      router.push("/portal");
    }
  }, [tokenFromURL, router]);

  const generateManualToken = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let token = "";
    for (let i = 0; i < 50; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  };

  useEffect(() => {
    if (!tokenFromURL) {
      setInviteTokenValid(null);
      return;
    }

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
      } catch (error) {
        setInviteTokenValid(false);
      }
    };

    verifyToken();
  }, [tokenFromURL]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch("/api/employeeRoles");
        if (!res.ok) {
          throw new Error("Gagal mengambil data role");
        }
        const data = await res.json();
        setAvailableRoles(data);
      } catch (error: any) {
        console.error(error);
        toast.error("Gagal mengambil data role");
      }
    };

    if (!isInviteFlow) {
      fetchRoles();
    }
  }, [isInviteFlow]);

  useEffect(() => {
    if (inviteEmployee) {
      setEmail(inviteEmployee.email || "");
      if (inviteEmployee.role?.name) {
        setRole(inviteEmployee.role.name);
      }
    }
  }, [inviteEmployee]);

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
    if (!role) {
      toast.error("Role belum dipilih");
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
      const userToken = generateManualToken(); // Selalu generate token baru

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          role,
          inviteToken: tokenFromURL, // Untuk verifikasi invite
          userToken, // Token yang akan disimpan
        }),
      });

      const data = await res.json();
      console.log("Response dari server:", data);

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

  if (tokenFromURL && inviteTokenValid === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p>Memeriksa token...</p>
      </div>
    );
  }

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
            <input
              type="email"
              className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black"
              value={email}
              onChange={(e) => {
                if (!isInviteFlow) {
                  setEmail(e.target.value);
                }
              }}
              disabled={isInviteFlow}
              required
            />
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
            {isInviteFlow ? (
              <input type="text" value={role} className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-black" readOnly />
            ) : (
              <select className="w-full mt-1 p-2 border rounded-lg bg-white text-black" value={role} onChange={(e) => setRole(e.target.value)} required>
                <option value="">-- Pilih Role --</option>
                {availableRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
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
