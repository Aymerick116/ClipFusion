

import { useParams, useNavigate } from "react-router-dom";

const VideoDetails = () => {
  const { filename } = useParams();  // Change from videoName to filename
  const navigate = useNavigate();

  console.log("Video Filename:", filename); // Debugging

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-blue-500 rounded-lg shadow hover:bg-blue-600 transition"
      >
        ← Back
      </button>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl">
        {filename ? (
          <video className="w-full h-auto rounded-lg" controls>
            <source src={`http://127.0.0.1:8000/uploads/${filename}`} type="video/mp4" />
          </video>
        ) : (
          <p className="text-gray-500 text-center">No video found.</p>
        )}
        <h2 className="text-center text-xl mt-4 font-semibold">{filename || "No Video"}</h2>
      </div>
    </div>
  );
};

export default VideoDetails;

