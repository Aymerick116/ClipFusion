import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const VideoDetails = () => {
  const { filename } = useParams();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState("");
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const mainVideoRef = useRef(null);
  const clipRefs = useRef({});

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
        const response = await axios.get(`http://127.0.0.1:8000/get-clips/`, {
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

  // Effect to handle subtitle visibility whenever the toggle changes
  useEffect(() => {
    // Handle main video subtitles
    if (mainVideoRef.current) {
      const tracks = mainVideoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = subtitlesEnabled ? 'showing' : 'hidden';
      }
    }

    // Handle clip video subtitles
    Object.values(clipRefs.current).forEach(videoElement => {
      if (videoElement) {
        const tracks = videoElement.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = subtitlesEnabled ? 'showing' : 'hidden';
        }
      }
    });
  }, [subtitlesEnabled]);

  // Toggle subtitles on/off
  const toggleSubtitles = () => {
    setSubtitlesEnabled(prev => !prev);
    toast.info(`Subtitles ${!subtitlesEnabled ? 'enabled' : 'disabled'}`);
  };

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

  // Download helper (for clips or full video)
  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url, { mode: "cors" });
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

  // Fetch transcript for a video to generate subtitle tracks
  const fetchTranscriptForSubtitles = async (videoId) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/transcript/`, {
        params: { filename }
      });
      
      if (response.data && response.data.transcript) {
        // Parse the transcript JSON string
        const transcriptData = JSON.parse(response.data.transcript);
        // Return the segments which contain timing and text
        return transcriptData.segments || [];
      }
    } catch (error) {
      console.error("Error fetching transcript for subtitles:", error);
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
          <div className="relative">
            <video 
              ref={mainVideoRef}
              className="w-full h-auto rounded-lg" 
              controls
              onLoadedData={async () => {
                // Fetch transcript and create subtitle track once video is loaded
                const segments = await fetchTranscriptForSubtitles(filename);
                if (segments.length > 0) {
                  const subtitleUrl = createSubtitleBlobUrl(segments);
                  if (subtitleUrl && mainVideoRef.current) {
                    // Remove any existing tracks
                    while (mainVideoRef.current.firstChild) {
                      if (mainVideoRef.current.firstChild.tagName === 'TRACK') {
                        mainVideoRef.current.removeChild(mainVideoRef.current.firstChild);
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
                    track.default = subtitlesEnabled;
                    mainVideoRef.current.appendChild(track);
                    
                    // Set the mode based on current state
                    if (mainVideoRef.current.textTracks[0]) {
                      mainVideoRef.current.textTracks[0].mode = subtitlesEnabled ? 'showing' : 'hidden';
                    }
                  }
                }
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {/* Subtitle Toggle Button */}
            <button
              onClick={toggleSubtitles}
              className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-70 text-white px-3 py-1 rounded-full text-sm hover:bg-opacity-90 transition-all"
            >
              {subtitlesEnabled ? "CC ON" : "CC OFF"}
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-center">No video found.</p>
        )}

        <h2 className="text-center text-xl mt-4 font-semibold">{filename || "No Video"}</h2>

        {videoUrl && (
          <button
            onClick={() => handleDownload(videoUrl, filename)}
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
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {clips.map((clip, index) => (
              <li
                key={clip.clip_id}
                className="bg-gray-700 p-4 rounded-lg shadow relative transition-all duration-200 hover:shadow-2xl"
              >
                <div className="relative">
                  <video 
                    ref={el => clipRefs.current[clip.clip_id] = el}
                    className="w-full h-auto rounded-lg" 
                    controls
                    onLoadedData={async () => {
                      // Similar approach for clips - add subtitle track
                      const segments = await fetchTranscriptForSubtitles(filename);
                      if (segments.length > 0) {
                        // Filter segments to only include those within the clip's time range
                        const clipSegments = segments.filter(seg => 
                          parseFloat(seg.start) >= clip.start_time && 
                          parseFloat(seg.end) <= clip.end_time
                        );
                        
                        if (clipSegments.length > 0) {
                          const subtitleUrl = createSubtitleBlobUrl(clipSegments);
                          const videoElement = clipRefs.current[clip.clip_id];
                          
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
                            track.default = subtitlesEnabled;
                            videoElement.appendChild(track);
                            
                            // Set the mode based on current state
                            if (videoElement.textTracks[0]) {
                              videoElement.textTracks[0].mode = subtitlesEnabled ? 'showing' : 'hidden';
                            }
                          }
                        }
                      }
                    }}
                  >
                    <source src={clip.clip_url} type="video/mp4" />
                  </video>
                  
                  {/* Subtitle Toggle Button for Clip */}
                  <button
                    onClick={toggleSubtitles}
                    className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-70 text-white px-2 py-0.5 rounded-full text-xs hover:bg-opacity-90 transition-all"
                  >
                    {subtitlesEnabled ? "CC ON" : "CC OFF"}
                  </button>
                </div>

                <p className="text-gray-300 mt-2 text-center">
                  Clip {index + 1}: {clip.start_time}s - {clip.end_time}s
                </p>

                {/* Download Clip */}
                <button
                  onClick={() => handleDownload(clip.clip_url, `clip_${index + 1}.mp4`)}
                  className="mt-2 w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md text-white text-sm transition"
                >
                  Download Clip
                </button>

                {/* Delete Clip */}
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