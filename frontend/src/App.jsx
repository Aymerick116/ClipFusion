// import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
// import Sidebar from "./components/Sidebar";
// import Dashboard from "./pages/Dashboard";
// import VideoDetails from "./pages/VideoDetails";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";



// const App = () => {
//   return (
//     <Router>
//        <ToastContainer position="top-right" autoClose={3000} />
      
//       <div className="flex min-h-screen bg-black text-white">
//         <Sidebar />
//         <div className="flex-1 w-full p-6">
//           <Routes>
//             <Route path="/dashboard" element={<Dashboard />} />
//             <Route path="/" element={<Dashboard />} />
//             <Route path="/video/:filename" element={<VideoDetails />} />
//           </Routes>
//         </div>
//       </div>
//     </Router>
//   );
// };

// export default App;

// App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import VideoDetails from "./pages/VideoDetails";
import AuthPage from "./pages/AuthPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  return token ? children : <Navigate to="/" />;
};

const Layout = ({ children }) => (
  <div className="flex min-h-screen bg-black text-white">
    <Sidebar />
    <div className="flex-1 w-full p-6">{children}</div>
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
      <Routes>
        <Route
          path="/"
          element={<AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />}
        />

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
    </Router>
  );
};

export default App;
