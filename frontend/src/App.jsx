

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import VideoDetails from "./pages/VideoDetails";

const App = () => {
  return (
    <Router>
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
