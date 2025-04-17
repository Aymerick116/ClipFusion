
// import { useEffect, useState } from "react";
// import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
// import Sidebar from "./components/Sidebar";
// import Dashboard from "./pages/Dashboard";
// import VideoDetails from "./pages/VideoDetails";
// import AuthPage from "./pages/AuthPage";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const ProtectedRoute = ({ children }) => {
//   const token = localStorage.getItem("access_token");
//   return token ? children : <Navigate to="/" />;
// };

// const Layout = ({ children }) => (
//   <div className="flex min-h-screen bg-black text-white">
//     <Sidebar />
//     <div className="flex-1 w-full p-6">{children}</div>
//   </div>
// );

// const App = () => {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem("access_token");
//     setIsAuthenticated(!!token);
//   }, []);

//   return (
//     <Router>
//       <ToastContainer position="top-right" autoClose={3000} />
//       <Routes>
//         <Route
//           path="/"
//           element={<AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />}
//         />

//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute>
//               <Layout>
//                 <Dashboard />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/video/:filename"
//           element={
//             <ProtectedRoute>
//               <Layout>
//                 <VideoDetails />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />
//       </Routes>
//     </Router>
//   );
// };

// export default App;
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import VideoDetails from "./pages/VideoDetails";
import AuthPage from "./pages/AuthPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// 🔐 Protects routes from unauthenticated users
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  return token ? children : <Navigate to="/" />;
};

// 🧱 Shared layout with sidebar + main content styling
const Layout = ({ children }) => (
  <div className="flex min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-950 text-white">
    <Sidebar />
    <main className="flex-1 w-full p-6 bg-gray-900 rounded-lg shadow-inner m-4 overflow-y-auto">
      {children}
    </main>
  </div>
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Routes>
          {/* AuthPage takes full screen, centered */}
          <Route
            path="/"
            element={
              <div className="flex items-center justify-center min-h-screen">
                <AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />
              </div>
            }
          />

          {/* Protected Routes with shared layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/video/:filename"
            element={
              <ProtectedRoute>
                <Layout>
                  <VideoDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
