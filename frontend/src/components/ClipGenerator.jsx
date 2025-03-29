import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function ClipGenerator() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [timestamps, setTimestamps] = useState([{ start: "", end: "" }]);
  const [clips, setClips] = useState([]);
  const [aiClips, setAiClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const clipRefs = useRef({});
  const aiClipRefs = useRef({});

  useEffect(() => {
    axios
      .get("http://localhost:8000/videos/")
      .then((res) => setVideos(res.data.videos || []))
      .catch((err) => console.error("Error fetching videos:", err));
  }, []);

  // Effect to handle subtitle visibility when toggled
  useEffect(() => {
    // Handle manual clips' subtitles
    Object.values(clipRefs.current).forEach(videoElement => {
      if (videoElement) {
        const tracks = videoElement.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = subtitlesEnabled ? 'showing' : 'hidden';
        }
      }
    });

    // Handle AI clips' subtitles
    Object.values(aiClipRefs.current).forEach(videoElement => {
      if (videoElement) {
        const tracks = videoElement.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = subtitlesEnabled ? 'showing' : 'hidden';
        }
      }
    });
  }, [subtitlesEnabled]);

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

  const generateAiClips = async () => {
    if (!selectedVideo) return;

    setLoadingAi(true);
    try {
      const res = await axios.post("http://localhost:8000/generate-ai-clips/", {
        filename: selectedVideo,
      });
      setAiClips(res.data.clips || []);
    } catch (err) {
      console.error("Error generating AI clips:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Toggle subtitles on/off
  const toggleSubtitles = () => {
    setSubtitlesEnabled(prev => !prev);
  };

  // Fetch transcript for a clip to generate subtitle tracks
  const fetchTranscriptForClip = async (videoFilename, startTime, endTime) => {
    try {
      const response = await axios.get(`http://localhost:8000/transcript/`, {
        params: { filename: videoFilename }
      });
      
      if (response.data && response.data.transcript) {
        // Parse the transcript JSON string
        const transcriptData = JSON.parse(response.data.transcript);
        const segments = transcriptData.segments || [];
        
        // Filter segments to only include those within the clip's time range
        return segments.filter(seg => 
          parseFloat(seg.start) >= startTime && 
          parseFloat(seg.end) <= endTime
        );
      }
      return [];
    } catch (error) {
      console.error("Error fetching transcript for clip:", error);
      return [];
    }
  };

  // Create a WebVTT subtitle blob URL from transcript segments
  const createSubtitleBlobUrl = (segments) => {
    if (!segments || segments.length === 0) return null;
    
    let vttContent = "WEBVTT\n\n";
    
    segments.forEach((segment, index) => {
      const startTime = formatVttTime(parseFloat(segment.start));
      const endTime = formatVttTime(parseFloat(segment.end));
      vttContent += `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
    });
    
    const blob = new Blob([vttContent], { type: "text/vtt" });
    return URL.createObjectURL(blob);
  };
  
  // Format time for WebVTT (HH:MM:SS.mmm)
  const formatVttTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">🎬 Clip Generator</h2>

      <div className="flex justify-between items-center mb-4">
        <label className="block font-semibold">Select Video:</label>
        <button
          onClick={toggleSubtitles}
          className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-600 transition"
        >
          {subtitlesEnabled ? "CC ON" : "CC OFF"}
        </button>
      </div>

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

      {/* Manual Clip Timestamp Input */}
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

      {/* Clip Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={generateClips}
          disabled={!selectedVideo || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Manual Clips"}
        </button>

        <button
          onClick={generateAiClips}
          disabled={!selectedVideo || loadingAi}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loadingAi ? "Thinking..." : "✨ Generate AI Clips"}
        </button>
      </div>

      {/* Manual Clips Section */}
      {clips.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">🧾 Manual Clips:</h3>
          <div className="space-y-4">
            {clips.map((clip) => (
              <div key={clip.clip_index} className="relative">
                <p className="text-sm text-gray-700 mb-1">
                  Clip {clip.clip_index}: {clip.start}s - {clip.end}s
                </p>
                <div className="relative">
                  <video
                    ref={el => clipRefs.current[clip.clip_index] = el}
                    controls
                    className="w-full rounded shadow"
                    onLoadedData={async () => {
                      // Fetch transcript segments for this clip
                      const segments = await fetchTranscriptForClip(
                        selectedVideo, 
                        parseFloat(clip.start), 
                        parseFloat(clip.end)
                      );
                      
                      if (segments.length > 0) {
                        const subtitleUrl = createSubtitleBlobUrl(segments);
                        const videoElement = clipRefs.current[clip.clip_index];
                        
                        if (subtitleUrl && videoElement) {
                          // Remove existing tracks
                          while (videoElement.firstChild) {
                            if (videoElement.firstChild.tagName === 'TRACK') {
                              videoElement.removeChild(videoElement.firstChild);
                            } else {
                              break;
                            }
                          }
                          
                          // Add the new subtitle track
                          const track = document.createElement('track');
                          track.kind = 'subtitles';
                          track.label = 'English';
                          track.srclang = 'en';
                          track.src = subtitleUrl;
                          videoElement.appendChild(track);
                          
                          // Set the mode based on current state
                          if (videoElement.textTracks[0]) {
                            videoElement.textTracks[0].mode = subtitlesEnabled ? 'showing' : 'hidden';
                          }
                        }
                      }
                    }}
                  >
                    <source
                      src={`http://localhost:8000${clip.clip_url}?t=${Date.now()}`}
                      type="video/mp4"
                    />
                  </video>
                  
                  {/* Small CC toggle button */}
                  <button
                    onClick={toggleSubtitles}
                    className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded-full hover:bg-opacity-80"
                  >
                    {subtitlesEnabled ? "CC ON" : "CC OFF"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Clips Section */}
      {aiClips.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">✨ AI Highlights:</h3>
          <div className="space-y-6">
            {aiClips.map((clip) => (
              <div key={clip.clip_index}>
                <div className="relative">
                  <video
                    ref={el => aiClipRefs.current[clip.clip_index] = el}
                    controls
                    className="w-full rounded shadow mb-2"
                    onLoadedData={async () => {
                      // Fetch transcript segments for this AI clip
                      const segments = await fetchTranscriptForClip(
                        selectedVideo, 
                        parseFloat(clip.start), 
                        parseFloat(clip.end)
                      );
                      
                      if (segments.length > 0) {
                        const subtitleUrl = createSubtitleBlobUrl(segments);
                        const videoElement = aiClipRefs.current[clip.clip_index];
                        
                        if (subtitleUrl && videoElement) {
                          // Remove existing tracks
                          while (videoElement.firstChild) {
                            if (videoElement.firstChild.tagName === 'TRACK') {
                              videoElement.removeChild(videoElement.firstChild);
                            } else {
                              break;
                            }
                          }
                          
                          // Add the new subtitle track
                          const track = document.createElement('track');
                          track.kind = 'subtitles';
                          track.label = 'English';
                          track.srclang = 'en';
                          track.src = subtitleUrl;
                          videoElement.appendChild(track);
                          
                          // Set the mode based on current state
                          if (videoElement.textTracks[0]) {
                            videoElement.textTracks[0].mode = subtitlesEnabled ? 'showing' : 'hidden';
                          }
                        }
                      }
                    }}
                  >
                    <source
                      src={`http://localhost:8000${clip.clip_url}?t=${Date.now()}`}
                      type="video/mp4"
                    />
                  </video>
                  
                  {/* Small CC toggle button */}
                  <button
                    onClick={toggleSubtitles}
                    className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded-full hover:bg-opacity-80"
                  >
                    {subtitlesEnabled ? "CC ON" : "CC OFF"}
                  </button>
                </div>
                
                <p className="italic text-gray-800 text-sm">
                  "{clip.text}"
                </p>
                <p className="text-xs text-gray-500">
                  Time: {clip.start}s – {clip.end}s
                </p>
                <a
                  href={`http://localhost:8000${clip.clip_url}`}
                  download
                  className="inline-block mt-1 text-sm text-indigo-600 hover:underline"
                >
                  ⬇️ Download AI Clip
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}