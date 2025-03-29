import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaHashtag, FaPlus, FaMagic, FaTimes } from "react-icons/fa";

const HashtagManager = ({ filename, videoType = "video" }) => {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newHashtag, setNewHashtag] = useState("");

  // Fetch hashtags when component mounts
  useEffect(() => {
    if (filename) {
      fetchHashtags();
    }
  }, [filename]);

  // Fetch hashtags for the current video
  const fetchHashtags = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/video-hashtags/", {
        params: { filename },
      });
      setHashtags(response.data.hashtags || []);
    } catch (error) {
      console.error("Error fetching hashtags:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI hashtags
  const generateHashtags = async () => {
    setGenerating(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/generate-hashtags/", {
        filename,
      });
      setHashtags(response.data.hashtags || []);
      toast.success("✅ AI hashtags generated!");
    } catch (error) {
      console.error("Error generating hashtags:", error);
      toast.error("❌ Failed to generate hashtags.");
    } finally {
      setGenerating(false);
    }
  };

  // Add a custom hashtag
  const addHashtag = async () => {
    if (!newHashtag.trim()) return;

    const cleanedTag = newHashtag.trim().replace(/^#/, "").toLowerCase();
    
    // Check if hashtag already exists
    if (hashtags.includes(cleanedTag)) {
      toast.info("Hashtag already exists");
      setNewHashtag("");
      return;
    }

    try {
      await axios.post("http://127.0.0.1:8000/add-video-hashtag/", {
        filename,
        hashtag: cleanedTag,
      });
      
      // Update local state
      setHashtags([...hashtags, cleanedTag]);
      setNewHashtag("");
      toast.success(`Added #${cleanedTag}`);
    } catch (error) {
      console.error("Error adding hashtag:", error);
      toast.error("Failed to add hashtag");
    }
  };

  // Remove a hashtag
  const removeHashtag = async (tag) => {
    try {
      await axios.delete("http://127.0.0.1:8000/remove-video-hashtag/", {
        params: { filename, hashtag: tag },
      });
      
      // Update local state
      setHashtags(hashtags.filter((t) => t !== tag));
      toast.success(`Removed #${tag}`);
    } catch (error) {
      console.error("Error removing hashtag:", error);
      toast.error("Failed to remove hashtag");
    }
  };

  // Handle the enter key for adding hashtags
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      addHashtag();
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <FaHashtag /> Hashtags
        </h3>
        
        <button
          onClick={generateHashtags}
          disabled={generating}
          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded flex items-center gap-1 transition"
        >
          <FaMagic /> {generating ? "Generating..." : "AI Generate"}
        </button>
      </div>

      {/* Hashtag display */}
      <div className="flex flex-wrap gap-2 mb-3">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading hashtags...</p>
        ) : hashtags.length === 0 ? (
          <p className="text-gray-400 text-sm">No hashtags yet. Generate or add some!</p>
        ) : (
          hashtags.map((tag) => (
            <div
              key={tag}
              className="bg-gray-700 rounded-full px-3 py-1 text-sm flex items-center gap-1 group"
            >
              #{tag}
              <button
                onClick={() => removeHashtag(tag)}
                className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                aria-label={`Remove hashtag ${tag}`}
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add hashtag input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-gray-400">
            <FaHashtag size={14} />
          </span>
          <input
            type="text"
            value={newHashtag}
            onChange={(e) => setNewHashtag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add hashtag"
            className="bg-gray-700 text-white w-full pl-8 pr-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={addHashtag}
          disabled={!newHashtag.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded disabled:opacity-50 transition"
        >
          <FaPlus size={14} />
        </button>
      </div>
    </div>
  );
};

export default HashtagManager;