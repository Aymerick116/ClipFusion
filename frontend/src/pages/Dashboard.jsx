// import { useState, useEffect } from "react";
// import Upload from "../components/Upload";
// import VideoList from "../components/VideoList";
// import axios from "axios";
// import { FaUpload, FaFolderOpen } from "react-icons/fa";

// const Dashboard = () => {
//   const [videos, setVideos] = useState([]);

//   useEffect(() => {
//     axios.get("http://127.0.0.1:8000/videos/")
//       .then((res) => setVideos(res.data.videos || []))
//       .catch((error) => console.error("Error fetching videos:", error));
//   }, []);

//   return (
//     <div className="flex-1 flex flex-col items-center p-8 bg-gray-900 min-h-screen">
//       <div className="w-full max-w-6xl">
//         {/* Upload Section */}
//         <div className="bg-gray-800 shadow-lg rounded-lg p-6 flex flex-col items-center mb-10 w-full">
//           <h2 className="text-2xl font-semibold text-center mb-4 flex items-center gap-2">
//             <FaUpload /> Upload & Generate Clips
//           </h2>
//           <Upload refreshVideos={() => {}} />
//         </div>

//         {/* Video List Section */}
//         <div className="bg-gray-800 shadow-lg rounded-lg p-6 w-full">
//           <h2 className="text-2xl font-semibold text-center mb-4 flex items-center gap-2">
//             <FaFolderOpen /> Your Projects
//           </h2>
//           <VideoList videos={videos} />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;

import { useState, useEffect } from "react";
import Upload from "../components/Upload";
import VideoList from "../components/VideoList";
// import axios from "axios";
import { FaUpload, FaFolderOpen } from "react-icons/fa";
import api from "../api";

const Dashboard = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch videos
  // const fetchVideos = async () => {
  //   try {
  //     const response = await axios.get("http://127.0.0.1:8000/videos/");
  //     console.log("API Response:", response.data); // Debugging

  //     if (Array.isArray(response.data)) {
  //       setVideos(response.data); // Store full video objects (filename + s3_url)
  //     } else {
  //       console.error("Unexpected API response format:", response.data);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching videos:", error);
  //     setError("Failed to load videos.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const fetchVideos = async () => {
    try {
      const response = await api.get("/videos/");
      console.log("API Response:", response.data);
  
      if (Array.isArray(response.data)) {
        setVideos(response.data);
      } else {
        console.error("Unexpected API response format:", response.data);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError("Failed to load videos.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch videos on component mount
  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center p-8 bg-gray-900 min-h-screen text-white">
      <div className="w-full max-w-6xl">
        {/* Upload Section */}
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 flex flex-col items-center mb-10 w-full">
          <h2 className="text-2xl font-semibold text-center mb-4 flex items-center gap-2">
            <FaUpload /> Upload & Generate Clips
          </h2>
          <Upload refreshVideos={fetchVideos} />
        </div>

        {/* Video List Section */}
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 w-full">
          <h2 className="text-2xl font-semibold text-center mb-4 flex items-center gap-2">
            <FaFolderOpen /> Your Projects
          </h2>

          {loading ? (
            <p className="text-gray-400 text-center">Loading videos...</p>
          ) : error ? (
            <p className="text-red-400 text-center">{error}</p>
          ) : videos.length > 0 ? (
            // <VideoList videos={videos} />
            <VideoList videos={videos} setVideos={setVideos} />

          ) : (
            <p className="text-gray-500 text-center w-full">No videos uploaded yet. 📁</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
