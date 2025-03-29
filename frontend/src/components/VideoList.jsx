import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const VideoList = ({ videos, setVideos }) => {
  const navigate = useNavigate();

  const handleDelete = async (filename) => {
    const confirm = window.confirm(`Are you sure you want to delete "${filename}"?`);
    if (!confirm) return;

    try {
      const res = await axios.delete("http://127.0.0.1:8000/video/", {
        params: { filename },
      });

      if (res.status === 200 && res.data?.message) {
        setVideos((prev) => prev.filter((video) => video.filename !== filename));
        toast.success(res.data.message); // ✅ Success toast
      } else {
        console.error("Unexpected response:", res);
        toast.error("Unexpected server response."); // ❌ Error toast
      }
    } catch (error) {
      console.error("❌ Delete failed:", error);
      toast.error("Failed to delete video.");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {videos.length > 0 ? (
        videos.map((video) => (
          <div
            key={video.filename}
            className="bg-gray-800 p-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl relative"

            // className="bg-gray-800 p-4 rounded-lg shadow-lg transition relative"
          >
            <video
              className="w-full h-32 object-cover rounded-lg cursor-pointer"
              controls
              onClick={() => navigate(`/video/${encodeURIComponent(video.filename)}`)}
            >
              <source src={video.s3_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            <p className="text-sm text-center mt-2">{video.filename}</p>

            <button
              onClick={() => handleDelete(video.filename)}
              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
              title="Delete Video"
            >
              Delete
            </button>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center w-full">No videos uploaded yet. 📁</p>
      )}
    </div>
  );
};

export default VideoList;


// import { useNavigate } from "react-router-dom";

// const VideoList = ({ videos }) => {
//   const navigate = useNavigate();

//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
//       {videos.length > 0 ? (
//         videos.map((video) => (
//           <div
//             key={video.filename} 
//             className="bg-gray-800 p-4 rounded-lg shadow-lg cursor-pointer hover:bg-gray-700 transition"
//             onClick={() => navigate(`/video/${encodeURIComponent(video.filename)}`)}
//             tabIndex={0}
//             role="button"
//           >
//             {/* ✅ Use S3 URL */}
//             <video className="w-full h-32 object-cover rounded-lg" controls>
//               <source src={video.s3_url} type="video/mp4" />
//               Your browser does not support the video tag.
//             </video>
//             <p className="text-sm text-center mt-2">{video.filename}</p>
//           </div>
//         ))
//       ) : (
//         <p className="text-gray-500 text-center w-full">No videos uploaded yet. 📁</p>
//       )}
//     </div>
//   );
// };

// export default VideoList;
