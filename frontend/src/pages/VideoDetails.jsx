import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import HashtagManager from "../components/HashtagManager";
import ClipCard from "../components/ClipCard";
import api from "../api";

const VideoDetails = () => {
  const { filename } = useParams();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState("");
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch original video URL
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

  // Fetch generated clips
  useEffect(() => {
    const fetchClips = async () => {
      try {
        const response = await api.get(`http://127.0.0.1:8000/get-clips/`, {
          params: { filename },
        });
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

  // Delete a clip
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

  // Download helper for the full video
  const handleDownloadVideo = async () => {
    try {
      const response = await fetch(videoUrl, { mode: "cors" });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("❌ Download failed:", error);
      toast.error("❌ Failed to download file.");
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

      {/* Original Video */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl">
        {videoUrl ? (
          <video className="w-full h-auto rounded-lg" controls>
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <p className="text-gray-500 text-center">No video found.</p>
        )}

        <h2 className="text-center text-xl mt-4 font-semibold">{filename || "No Video"}</h2>

        {/* Hashtag Manager for Main Video */}
        {filename && <HashtagManager filename={filename} />}

        {videoUrl && (
          <button
            onClick={handleDownloadVideo}
            className="mt-4 block w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md text-white text-center transition"
          >
            Download Original Video
          </button>
        )}
      </div>

      {/* Clips Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl mt-6">
        <h3 className="text-center text-lg font-semibold">Generated Clips</h3>

        {loading ? (
          <p className="text-gray-400 text-center">Loading clips...</p>
        ) : error ? (
          <p className="text-red-400 text-center">{error}</p>
        ) : clips.length === 0 ? (
          <p className="text-gray-400 text-center">No clips available for this video.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {clips.map((clip, index) => (
              <ClipCard 
                key={clip.clip_id} 
                clip={clip} 
                index={index} 
                onDelete={handleDeleteClip} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDetails;