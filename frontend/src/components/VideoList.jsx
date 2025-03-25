import { useNavigate } from "react-router-dom";

const VideoList = ({ videos }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {videos.length > 0 ? (
        videos.map((video) => (
          <div
            key={video} 
            className="bg-gray-800 p-4 rounded-lg shadow-lg cursor-pointer hover:bg-gray-700 transition"
            onClick={() => navigate(`/video/${encodeURIComponent(video)}`)}
            tabIndex={0}
            role="button"

          >
            <video className="w-full h-32 object-cover rounded-lg" controls>
              <source src={`http://127.0.0.1:8000/uploads/${video}`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <p className="text-sm text-center mt-2">{video}</p>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center w-full">No videos uploaded yet. 📁</p>
      )}
    </div>
  );
};

export default VideoList;
