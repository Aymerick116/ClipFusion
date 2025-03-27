import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const VideoDetails = () => {
  const { filename } = useParams(); // Get filename from URL params
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState("");
  const [clips, setClips] = useState([]); // Store fetched clips
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("Fetching details for video:", filename); // Debugging

  // Fetch Video URL
  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/videos/");
        const video = response.data.find(v => v.filename === filename);
        
        if (video) {
          setVideoUrl(video.s3_url);
        } else {
          console.error("Video not found in database");
        }
      } catch (error) {
        console.error("Error fetching video details:", error);
      }
    };

    fetchVideoUrl();
  }, [filename]);

  // Fetch Clips Associated with Video
  useEffect(() => {
    const fetchClips = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/get-clips/`, {
          params: { filename },
        });

        console.log("Fetched Clips:", response.data); // Debugging
        setClips(response.data.clips || []);
      } catch (err) {
        console.error("Error fetching clips:", err);
        setError("Failed to load clips.");
      } finally {
        setLoading(false);
      }
    };

    if (filename) fetchClips();
  }, [filename]);

  // Delete a single clip
  const handleDeleteClip = async (clipId) => {
    const confirm = window.confirm("Are you sure you want to delete this clip?");
    if (!confirm) return;

    try {
      const res = await axios.delete("http://127.0.0.1:8000/clip/", {
        params: { clip_id: clipId },
      });

      if (res.status === 200) {
        setClips((prev) => prev.filter((clip) => clip.clip_id !== clipId));
        toast.success("✅ Clip deleted.");
      } else {
        toast.error("❌ Failed to delete clip.");
      }
    } catch (err) {
      console.error("Clip deletion error:", err);
      toast.error("❌ Server error while deleting.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-blue-500 rounded-lg shadow hover:bg-blue-600 transition"
      >
        ← Back
      </button>

      {/* Video Player */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl">
        {videoUrl ? (
          <video className="w-full h-auto rounded-lg" controls>
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <p className="text-gray-500 text-center">No video found.</p>
        )}
        <h2 className="text-center text-xl mt-4 font-semibold">{filename || "No Video"}</h2>
      </div>

      {/* Display Clips Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl mt-6">
        <h3 className="text-center text-lg font-semibold">Generated Clips</h3>

        {loading ? (
          <p className="text-gray-400 text-center">Loading clips...</p>
        ) : error ? (
          <p className="text-red-400 text-center">{error}</p>
        ) : clips.length === 0 ? (
          <p className="text-gray-400 text-center">No clips available for this video.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {clips.map((clip, index) => (
              <li
                key={clip.clip_id}
                className="bg-gray-700 p-4 rounded-lg shadow relative transition-all duration-200 hover:shadow-2xl"
              >
                <video className="w-full h-auto rounded-lg" controls>
                  <source src={clip.clip_url} type="video/mp4" />
                </video>
                <p className="text-gray-300 mt-2 text-center">
                  Clip {index + 1}: {clip.start_time}s - {clip.end_time}s
                </p>

                {/* 🔴 Regular Delete Button */}
                <button
                  onClick={() => handleDeleteClip(clip.clip_id)}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default VideoDetails;


//   const { filename } = useParams(); // Get filename from URL params
//   const navigate = useNavigate();
//   const [videoUrl, setVideoUrl] = useState("");
//   const [clips, setClips] = useState([]); // Store fetched clips
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   console.log("Fetching details for video:", filename); // Debugging

//   // Fetch Video URL
//   useEffect(() => {
//     const fetchVideoUrl = async () => {
//       try {
//         const response = await axios.get("http://127.0.0.1:8000/videos/");
//         const video = response.data.find(v => v.filename === filename);
        
//         if (video) {
//           setVideoUrl(video.s3_url);
//         } else {
//           console.error("Video not found in database");
//         }
//       } catch (error) {
//         console.error("Error fetching video details:", error);
//       }
//     };

//     fetchVideoUrl();
//   }, [filename]);

//   // Fetch Clips Associated with Video
//   useEffect(() => {
//     const fetchClips = async () => {
//       try {
//         const response = await axios.get(`http://127.0.0.1:8000/get-clips/`, {
//           params: { filename }, // Send filename as a query param
//         });

//         console.log("Fetched Clips:", response.data); // Debugging
//         setClips(response.data.clips || []);
//       } catch (err) {
//         console.error("Error fetching clips:", err);
//         setError("Failed to load clips.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (filename) fetchClips();
//   }, [filename]);

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
//       {/* Back Button */}
//       <button
//         onClick={() => navigate(-1)}
//         className="mb-4 px-4 py-2 bg-blue-500 rounded-lg shadow hover:bg-blue-600 transition"
//       >
//         ← Back
//       </button>

//       {/* Video Player */}
//       <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl">
//         {videoUrl ? (
//           <video className="w-full h-auto rounded-lg" controls>
//             <source src={videoUrl} type="video/mp4" />
//           </video>
//         ) : (
//           <p className="text-gray-500 text-center">No video found.</p>
//         )}
//         <h2 className="text-center text-xl mt-4 font-semibold">{filename || "No Video"}</h2>
//       </div>

//       {/* Display Clips Section */}
//       <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl mt-6">
//         <h3 className="text-center text-lg font-semibold">Generated Clips</h3>

//         {loading ? (
//           <p className="text-gray-400 text-center">Loading clips...</p>
//         ) : error ? (
//           <p className="text-red-400 text-center">{error}</p>
//         ) : clips.length === 0 ? (
//           <p className="text-gray-400 text-center">No clips available for this video.</p>
//         ) : (
//           <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//             {clips.map((clip, index) => (
//               <li key={clip.clip_id} className="bg-gray-700 p-4 rounded-lg shadow">
//                 <video className="w-full h-auto rounded-lg" controls>
//                   <source src={clip.clip_url} type="video/mp4" />
//                 </video>
//                 <p className="text-gray-300 mt-2 text-center">
//                   Clip {index + 1}: {clip.start_time}s - {clip.end_time}s
//                 </p>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// };

// export default VideoDetails;

