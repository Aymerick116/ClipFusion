import { useState, useEffect } from "react";
import axios from "axios";

export default function ClipGenerator() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [timestamps, setTimestamps] = useState([{ start: "", end: "" }]);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch uploaded video filenames
  useEffect(() => {
    axios.get("http://localhost:8000/videos/")
      .then(res => setVideos(res.data.videos || []))
      .catch(err => console.error("Error fetching videos:", err));
  }, []);

  const updateTimestamp = (index, field, value) => {
    const updated = [...timestamps];
    updated[index][field] = value;
    setTimestamps(updated);
  };

  const addTimestamp = () => {
    setTimestamps([...timestamps, { start: "", end: "" }]);
  };

  const generateClips = async () => {
    if (!selectedVideo) return;

    const queryParams = new URLSearchParams();
    queryParams.append("filename", selectedVideo);
    timestamps.forEach(({ start, end }) => {
      if (start && end) {
        queryParams.append("timestamps", start);
        queryParams.append("timestamps", end);
      }
    });

    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:8000/generate-clips/?${queryParams.toString()}`
      );
      setClips(response.data.clips || []);
    } catch (error) {
      console.error("Error generating clips:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">🎬 Clip Generator</h2>

      <label className="block mb-2 font-semibold">Select Video:</label>
      <select
        value={selectedVideo}
        onChange={(e) => setSelectedVideo(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      >
        <option value="">-- Choose a video --</option>
        {videos.map((video) => (
          <option key={video} value={video}>
            {video}
          </option>
        ))}
      </select>

      <div className="space-y-4">
        {timestamps.map((ts, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium">Start Time (s)</label>
              <input
                type="number"
                value={ts.start}
                onChange={(e) => updateTimestamp(index, "start", e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium">End Time (s)</label>
              <input
                type="number"
                value={ts.end}
                onChange={(e) => updateTimestamp(index, "end", e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        ))}

        <button
          onClick={addTimestamp}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add another clip range
        </button>
      </div>

      <button
        onClick={generateClips}
        disabled={!selectedVideo || loading}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Clips"}
      </button>

      {clips.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">🧾 Generated Clips:</h3>
          <div className="space-y-4">
            {clips.map((clip) => (
              <div key={clip.clip_index}>
                <p className="text-sm text-gray-700 mb-1">
                  Clip {clip.clip_index}: {clip.start}s - {clip.end}s
                </p>
                <video controls className="w-full rounded shadow">
                  <source
                    src={`http://localhost:8000${clip.clip_url}`}
                    type="video/mp4"
                  />
                </video>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
