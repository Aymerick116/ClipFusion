import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaHashtag } from "react-icons/fa";

const VideoList = ({ videos, setVideos }) => {
  const navigate = useNavigate();
  // Store hashtags for each video
  const [videoHashtags, setVideoHashtags] = useState({});
  const [loadingHashtags, setLoadingHashtags] = useState(false);

  // Fetch hashtags for all videos when the component mounts or videos change
  useEffect(() => {
    const fetchAllHashtags = async () => {
      if (!videos.length) return;

      setLoadingHashtags(true);
      const tagsObject = {};

      try {
        // Fetch hashtags for each video
        await Promise.all(
          videos.map(async (video) => {
            try {
              const response = await axios.get("http://127.0.0.1:8000/video-hashtags/", {
                params: { filename: video.filename },
              });
              tagsObject[video.filename] = response.data.hashtags || [];
            } catch (error) {
              console.error(`Error fetching hashtags for ${video.filename}:`, error);
              tagsObject[video.filename] = [];
            }
          })
        );

        setVideoHashtags(tagsObject);
      } catch (error) {
        console.error("Error fetching hashtags:", error);
      } finally {
        setLoadingHashtags(false);
      }
    };

    fetchAllHashtags();
  }, [videos]);

  const handleDelete = async (filename) => {
    const confirm = window.confirm(`Are you sure you want to delete "${filename}"?`);
    if (!confirm) return;

    try {
      const res = await axios.delete("http://127.0.0.1:8000/video/", {
        params: { filename },
      });

      if (res.status === 200 && res.data?.message) {
        setVideos((prev) => prev.filter((video) => video.filename !== filename));
        toast.success(res.data.message);
      } else {
        console.error("Unexpected response:", res);
        toast.error("Unexpected server response.");
      }
    } catch (error) {
      console.error("❌ Delete failed:", error);
      toast.error("Failed to delete video.");
    }
  };

  // Generate hashtags for a video
  const generateHashtagsForVideo = async (filename, e) => {
    e.stopPropagation(); // Prevent navigation when clicking the hashtag button
    
    try {
      const response = await axios.post("http://127.0.0.1:8000/generate-hashtags/", {
        filename,
      });
      
      // Update the hashtags for this video
      setVideoHashtags(prev => ({
        ...prev,
        [filename]: response.data.hashtags || []
      }));
      
      toast.success("Hashtags generated!");
    } catch (error) {
      console.error("Error generating hashtags:", error);
      toast.error("Failed to generate hashtags");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {videos.length > 0 ? (
        videos.map((video) => (
          <div
            key={video.filename}
            className="bg-gray-800 p-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl relative"
          >
            {/* Video Preview */}
            <video
              className="w-full h-32 object-cover rounded-lg cursor-pointer"
              onClick={() => navigate(`/video/${encodeURIComponent(video.filename)}`)}
            >
              <source src={video.s3_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Video Filename */}
            <p className="text-sm text-center mt-2 mb-1">{video.filename}</p>
            
            {/* Hashtags Section */}
            <div className="mt-2 mb-2 min-h-10">
              {videoHashtags[video.filename]?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {videoHashtags[video.filename].slice(0, 3).map((tag) => (
                    <span 
                      key={tag} 
                      className="bg-gray-700 text-xs px-2 py-1 rounded-full text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                  {videoHashtags[video.filename].length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{videoHashtags[video.filename].length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    onClick={(e) => generateHashtagsForVideo(video.filename, e)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <FaHashtag /> Generate hashtags
                  </button>
                </div>
              )}
            </div>

            {/* Delete Button */}
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