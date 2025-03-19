import { useEffect, useState } from "react";
import axios from "axios";

const VideoList = () => {
  const [videos, setVideos] = useState([]);

  // Fetch video list from FastAPI
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/videos/")
      .then((res) => setVideos(res.data.videos))
      .catch((err) => console.error("Error fetching videos:", err));
  }, []);

  return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Uploaded Videos</h2>

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-md">
              <video controls className="w-full rounded-md">
                <source src={`http://127.0.0.1:8000/uploads/${video}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <p className="text-sm text-gray-600 mt-2">{video}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No videos uploaded yet.</p>
      )}
    </div>
  );
};

export default VideoList;
