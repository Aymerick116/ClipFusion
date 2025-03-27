import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import VideoDetails from "./pages/VideoDetails";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";



const App = () => {
  return (
    <Router>
       <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="flex min-h-screen bg-black text-white">
        <Sidebar />
        <div className="flex-1 w-full p-6">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/video/:filename" element={<VideoDetails />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
