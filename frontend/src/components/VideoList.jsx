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

  const handleTranscribe = async (video) => {
    setLoading((prev) => ({ ...prev, [video]: true })); // Show loading state

    try {
      const response = await axios.post(`http://127.0.0.1:8000/transcribe/?filename=${video}`);
      const transcriptText = response.data.transcript.text;

      setTranscripts((prev) => ({ ...prev, [video]: transcriptText }));
    } catch (error) {
      console.error("Error fetching transcript:", error);
    }

    setLoading((prev) => ({ ...prev, [video]: false })); // Hide loading state
  };

  const toggleTranscript = (video) => {
    setShowTranscripts((prev) => ({ ...prev, [video]: !prev[video] }));
  };

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📂 Uploaded Videos</h2>
      {videos.length > 0 ? (
        <ul className="space-y-6">
          {videos.map((video, index) => (
            <li key={index} className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center transition-transform transform hover:scale-105">
              <video width="350" className="rounded-md shadow-lg" controls>
                <source src={`http://127.0.0.1:8000/uploads/${video}`} type="video/mp4" />
              </video>

              {/* Generate Transcript Button */}
              <button
                className="mt-3 bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:bg-blue-700 hover:scale-105 active:scale-95"
                onClick={() => handleTranscribe(video)}
                disabled={loading[video]}
              >
                {loading[video] ? "Generating..." : "Generate Transcript"}
              </button>

              {/* Toggle Transcript Button (Only Show if Transcript Exists) */}
              {transcripts[video] && (
                <button
                  className="mt-2 text-sm text-gray-600 hover:text-gray-900 transition-all duration-300"
                  onClick={() => toggleTranscript(video)}
                >
                  {showTranscripts[video] ? "Hide Transcript ⬆️" : "Show Transcript ⬇️"}
                </button>
              )}

              {/* Transcript Display (Hidden Until Toggled) */}
              {showTranscripts[video] && transcripts[video] && (
                <p className="mt-3 p-4 bg-gray-100 rounded-lg text-gray-800 text-sm border-l-4 border-blue-500 shadow-md w-full text-left">
                  {transcripts[video]}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">No videos uploaded yet. 📁</p>
      )}
    </div>
  );
};

export default VideoList;
