// import { useState } from "react";
// import api from "../api";

// const AuthPage = ({ onAuthSuccess }) => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [isLogin, setIsLogin] = useState(true);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const endpoint = isLogin ? "/auth/login" : "/auth/register";

//     try {
//       const response = await api.post(endpoint, { email, password });

//       if (isLogin) {
//         const token = response.data.access_token;
//         localStorage.setItem("access_token", token);
//         onAuthSuccess(); // redirect to dashboard, etc.
//       } else {
//         alert("Registration successful. You can now log in.");
//         setIsLogin(true);
//       }
//     } catch (err) {
//       console.error("Auth error:", err);
//       alert(err.response?.data?.detail || "Something went wrong");
//     }
//   };

//   return (
//     <div className="p-6 max-w-sm mx-auto bg-gray-900 text-white rounded-xl">
//       <h2 className="text-2xl font-bold mb-4">{isLogin ? "Login" : "Register"}</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <input
//           className="w-full p-2 rounded bg-gray-800 border border-gray-600"
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           required
//         />
//         <input
//           className="w-full p-2 rounded bg-gray-800 border border-gray-600"
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//         />
//         <button className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded" type="submit">
//           {isLogin ? "Login" : "Register"}
//         </button>
//       </form>
//       <button
//         className="mt-4 text-sm text-blue-400 hover:underline"
//         onClick={() => setIsLogin(!isLogin)}
//       >
//         {isLogin ? "Need to create an account?" : "Already have an account?"}
//       </button>
//     </div>
//   );
// };

// export default AuthPage;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const AuthPage = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "/auth/login" : "/auth/register";

    try {
      const response = await api.post(endpoint, { email, password });

      if (isLogin) {
        const token = response.data.access_token;
        localStorage.setItem("access_token", token);
        onAuthSuccess(); // optional
        navigate("/dashboard"); // ✅ Redirect
      } else {
        alert("Registration successful. You can now log in.");
        setIsLogin(true);
      }
    } catch (err) {
      console.error("Auth error:", err);
      alert(err?.response?.data?.detail || "Something went wrong");
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto bg-gray-900 text-white rounded-xl">
      <h2 className="text-2xl font-bold mb-4">{isLogin ? "Login" : "Register"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-2 rounded bg-gray-800 border border-gray-600"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full p-2 rounded bg-gray-800 border border-gray-600"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded" type="submit">
          {isLogin ? "Login" : "Register"}
        </button>
      </form>
      <button
        className="mt-4 text-sm text-blue-400 hover:underline"
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? "Need to create an account?" : "Already have an account?"}
      </button>
    </div>
  );
};

export default AuthPage;

