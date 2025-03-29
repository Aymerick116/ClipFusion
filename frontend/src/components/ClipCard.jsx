import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaHashtag, FaDownload, FaTrash } from "react-icons/fa";

const ClipCard = ({ clip, index, onDelete }) => {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch hashtags for this clip
    const fetchHashtags = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/clip-hashtags/", {
          params: { clip_id: clip.clip_id },
        });
        setHashtags(response.data.hashtags || []);
      } catch (error) {
        console.error("Error fetching clip hashtags:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHashtags();
  }, [clip.clip_id]);

  // Handle downloading a clip
  const handleDownload = async () => {
    try {
      const response = await fetch(clip.clip_url, { mode: "cors" });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `clip_${index + 1}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("❌ Download failed:", error);
      toast.error("❌ Failed to download file.");
    }
  };

  // Generate hashtags for this clip
  const generateHashtags = async () => {
    setLoading(true);
    try {
      // This endpoint doesn't exist yet, but would be similar to the video hashtag generation
      const response = await axios.post("http://127.0.0.1:8000/generate-clip-hashtags/", {
        clip_id: clip.clip_id,
      });
      setHashtags(response.data.hashtags || []);
      toast.success("Hashtags generated!");
    } catch (error) {
      console.error("Error generating hashtags:", error);
      toast.error("Failed to generate hashtags");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg shadow relative transition-all duration-200 hover:shadow-2xl">
      {/* Video Player */}
      <video className="w-full h-auto rounded-lg" controls>
        <source src={clip.clip_url} type="video/mp4" />
      </video>

      {/* Clip Info */}
      <div className="mt-2 text-center">
        <p className="text-gray-300">
          Clip {index + 1}: {Math.round(clip.start_time)}s - {Math.round(clip.end_time)}s
        </p>
      </div>

      {/* Hashtags Display */}
      <div className="mt-2 mb-3">
        {loading ? (
          <div className="flex justify-center">
            <span className="text-gray-400 text-xs">Loading hashtags...</span>
          </div>
        ) : hashtags.length > 0 ? (
          <div className="flex flex-wrap gap-1 justify-center">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-600 text-xs px-2 py-1 rounded-full text-gray-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={generateHashtags}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <FaHashtag /> Generate hashtags
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md text-white text-sm transition"
        >
          <FaDownload size={14} /> Download
        </button>

        {/* Delete Button */}
        <button
          onClick={() => onDelete(clip.clip_id)}
          className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md text-white text-sm transition"
        >
          <FaTrash size={14} />
        </button>
      </div>
    </div>
  );
};

export default ClipCard;