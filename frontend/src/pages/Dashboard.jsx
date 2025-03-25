import { useState, useEffect } from "react";
import Upload from "../components/Upload";
import VideoList from "../components/VideoList";
import axios from "axios";
import { FaUpload, FaFolderOpen } from "react-icons/fa";

const Dashboard = () => {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/videos/")
      .then((res) => setVideos(res.data.videos || []))
      .catch((error) => console.error("Error fetching videos:", error));
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center p-8 bg-gray-900 min-h-screen">
      <div className="w-full max-w-6xl">
        {/* Upload Section */}
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 flex flex-col items-center mb-10 w-full">
          <h2 className="text-2xl font-semibold text-center mb-4 flex items-center gap-2">
            <FaUpload /> Upload & Generate Clips
          </h2>
          <Upload refreshVideos={() => {}} />
        </div>

        {/* Video List Section */}
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 w-full">
          <h2 className="text-2xl font-semibold text-center mb-4 flex items-center gap-2">
            <FaFolderOpen /> Your Projects
          </h2>
          <VideoList videos={videos} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
