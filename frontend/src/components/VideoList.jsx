import { useEffect, useState } from "react";
import axios from "axios";

const VideoList = () => {
  const [videos, setVideos] = useState([]);
  const [transcripts, setTranscripts] = useState({});
  const [loading, setLoading] = useState({}); // Track loading state per video
  const [showTranscripts, setShowTranscripts] = useState({}); // Toggle state

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/videos/").then((res) => setVideos(res.data.videos));
  }, []);

  const fetchTranscript = async (video) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/transcript/?filename=${video}`);
      return response.data.transcript;
    } catch (error) {
      console.warn(`No existing transcript for ${video}. Generating new one...`, error);
      return null; // If no transcript exists, return null
    }
  };

  const handleTranscribe = async (video) => {
    setLoading((prev) => ({ ...prev, [video]: true })); // Show loading state

    // Check if transcript exists in the DB first
    const existingTranscript = await fetchTranscript(video);

    if (existingTranscript) {
      setTranscripts((prev) => ({ ...prev, [video]: existingTranscript }));
    } else {
      // If no transcript exists, request Whisper API & save it in DB
      try {
        const response = await axios.post(`http://127.0.0.1:8000/transcribe/?filename=${video}`);
        const transcriptText = response.data.transcript.text;

        setTranscripts((prev) => ({ ...prev, [video]: transcriptText }));
      } catch (error) {
        console.error("Error generating transcript:", error);
      }
    }

    setLoading((prev) => ({ ...prev, [video]: false })); // Hide loading state
  };

  const toggleTranscript = (video) => {
    setShowTranscripts((prev) => ({ ...prev, [video]: !prev[video] }));
  };

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">📂 Uploaded Videos</h2>

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video, index) => (
            <div key={index} className="bg-white shadow-md rounded-lg p-3 flex flex-col items-center">
              
              {/* Video Preview */}
              <div className="w-full h-32 bg-gray-300 rounded-lg flex items-center justify-center">
                <video className="w-full h-full object-cover rounded-lg" controls>
                  <source src={`http://127.0.0.1:8000/uploads/${video}`} type="video/mp4" />
                </video>
              </div>

              {/* Generate Transcript Button */}
              <button
                className="mt-3 bg-blue-500 text-white px-4 py-1 rounded-md text-xs font-semibold transition hover:bg-blue-600 active:scale-95"
                onClick={() => handleTranscribe(video)}
                disabled={loading[video]}
              >
                {loading[video] ? "Checking..." : "Get Transcript"}
              </button>

              {/* Toggle Transcript Button */}
              {transcripts[video] && (
                <button
                  className="mt-1 text-xs text-gray-600 hover:text-gray-900 transition-all duration-300"
                  onClick={() => toggleTranscript(video)}
                >
                  {showTranscripts[video] ? "Hide ⬆️" : "Show ⬇️"}
                </button>
              )}

              {/* Transcript Display */}
              {showTranscripts[video] && transcripts[video] && (
                <p className="mt-2 p-2 bg-gray-100 rounded-md text-gray-800 text-xs border-l-4 border-blue-500 shadow-md w-full text-left">
                  {transcripts[video]}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center">No videos uploaded yet. 📁</p>
      )}
    </div>
  );
};

export default VideoList;
