import { useState } from "react";
import axios from "axios";
import { FaUpload, FaMagic, FaGoogleDrive, FaLink } from "react-icons/fa";
import { toast } from "react-toastify";

const Upload = ({ refreshVideos }) => {
  const [file, setFile] = useState(null);
  const [videoLink, setVideoLink] = useState("");
  const [loading, setLoading] = useState(false);

  const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/mkv"];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (selectedFile) {
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error("❌ Invalid file type. Please upload a valid video.");
        setFile(null);
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return null;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`✅ Upload Successful: ${response.data.filename}`);
      refreshVideos();
      return response.data.filename;
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("❌ Upload failed. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateAiClips = async () => {
    if (!file && !videoLink) {
      toast.error("❌ Please upload a file or enter a video link.");
      return;
    }

    setLoading(true);

    let filename = file ? await handleUpload() : videoLink;

    if (!filename) {
      setLoading(false);
      return;
    }

    try {
      await axios.post("http://127.0.0.1:8000/generate-ai-clips/", { filename });
      toast.success("✅ AI Clips Generated!");
      refreshVideos();
    } catch (error) {
      console.error("AI Clip Generation Failed:", error);
      toast.error("❌ AI Clip generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 shadow-lg rounded-lg p-6 w-full max-w-xl text-white">
      {/* Video Link Input */}
      <div className="mb-4">
        <div className="flex items-center gap-2 bg-gray-800 p-3 rounded-md border border-gray-700">
          <FaLink />
          <input
            type="text"
            placeholder="Enter video link"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            className="w-full bg-transparent text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Upload & Google Drive Buttons */}
      <div className="flex justify-between mb-4">
        <label
          htmlFor="fileInput"
          className="cursor-pointer flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700 transition"
        >
          <FaUpload /> Upload
          <input type="file" id="fileInput" className="hidden" onChange={handleFileChange} />
        </label>

        <button className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700 transition">
          <FaGoogleDrive /> Google Drive
        </button>
      </div>

      {/* Generate AI Clips Button */}
      <button
        onClick={generateAiClips}
        className="w-full py-3 text-black bg-white rounded-md font-semibold text-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading ? "Processing..." : <><FaMagic /> Get AI Clips</>}
      </button>
    </div>
  );
};

export default Upload;


// import { useState } from "react";
// import axios from "axios";
// import { FaUpload, FaMagic, FaGoogleDrive, FaLink } from "react-icons/fa";

// const Upload = ({ refreshVideos }) => {
//   const [file, setFile] = useState(null);
//   const [videoLink, setVideoLink] = useState("");
//   const [message, setMessage] = useState("");
//   const [loading, setLoading] = useState(false);

//   const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/mkv"];

//   const handleFileChange = (event) => {
//     const selectedFile = event.target.files[0];

//     if (selectedFile) {
//       if (!allowedTypes.includes(selectedFile.type)) {
//         setMessage("❌ Invalid file type. Please upload a valid video.");
//         setFile(null);
//         return;
//       }

//       setMessage("");
//       setFile(selectedFile);
//     }
//   };

//   const handleUpload = async () => {
//     if (!file) return null;

//     setLoading(true);
//     const formData = new FormData();
//     formData.append("file", file);

//     try {
//       const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });

//       setMessage(`✅ Upload Successful: ${response.data.filename}`);
//       refreshVideos();
//       return response.data.filename;
//     } catch (error) {
//       console.error("Upload failed:", error);
//       setMessage("❌ Upload failed. Please try again.");
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const generateAiClips = async () => {
//     if (!file && !videoLink) {
//       setMessage("❌ Please upload a file or enter a video link.");
//       return;
//     }

//     setLoading(true);

//     let filename = file ? await handleUpload() : videoLink;

//     if (!filename) {
//       setLoading(false);
//       return;
//     }

//     try {
//       await axios.post("http://127.0.0.1:8000/generate-ai-clips/", { filename });
//       setMessage("✅ AI Clips Generated!");
//       refreshVideos();
//     } catch (error) {
//       console.error("AI Clip Generation Failed:", error);
//       setMessage("❌ AI Clip generation failed. Try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="bg-gray-900 shadow-lg rounded-lg p-6 w-full max-w-xl text-white">
//       {/* Video Link Input */}
//       <div className="mb-4">
//         <div className="flex items-center gap-2 bg-gray-800 p-3 rounded-md border border-gray-700">
//           <FaLink />
//           <input
//             type="text"
//             placeholder="Enter video link"
//             value={videoLink}
//             onChange={(e) => setVideoLink(e.target.value)}
//             className="w-full bg-transparent text-white focus:outline-none"
//           />
//         </div>
//       </div>

//       {/* Upload & Google Drive Buttons */}
//       <div className="flex justify-between mb-4">
//         <label
//           htmlFor="fileInput"
//           className="cursor-pointer flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700 transition"
//         >
//           <FaUpload /> Upload
//           <input type="file" id="fileInput" className="hidden" onChange={handleFileChange} />
//         </label>

//         <button className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700 transition">
//           <FaGoogleDrive /> Google Drive
//         </button>
//       </div>

//       {/* Generate AI Clips Button */}
//       <button
//         onClick={generateAiClips}
//         className="w-full py-3 text-black bg-white rounded-md font-semibold text-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
//         disabled={loading}
//       >
//         {loading ? "Processing..." : <><FaMagic /> Get AI Clips</>}
//       </button>


//       {/* Status Message */}
//       {message && (
//         <p className={`mt-4 text-sm text-center ${message.includes("❌") ? "text-red-500" : "text-green-500"}`}>
//           {message}
//         </p>
//       )}
//     </div>
//   );
// };

// export default Upload;
