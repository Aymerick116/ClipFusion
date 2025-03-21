import { useState } from "react";
import axios from "axios";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  // Allowed video MIME types
  const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/mkv"];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (selectedFile) {
      if (!allowedTypes.includes(selectedFile.type)) {
        setMessage("❌ Invalid file type. Please upload a video (MP4, MOV, AVI, MKV).");
        setFile(null);
        return;
      }
      
      setMessage(""); // Clear any previous error messages
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("❌ Please select a valid video file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(`✅ Upload Successful: ${response.data.filename}`);
    } catch (error) {
      console.error("Upload failed:", error);
      setMessage("❌ Upload failed. Please try again.");
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 w-80 flex flex-col items-center justify-items-center">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 text-center">Upload Video</h2>
      
      {/* File Upload Input - Centered */}
      <div className="border border-gray-300 rounded-md p-4 w-full flex flex-col items-center justify-items-center text-center cursor-pointer hover:border-blue-500 transition">
        <input
          type="file"
          accept="video/*"
          className="hidden"
          id="fileInput"
          onChange={handleFileChange}
        />
        <label htmlFor="fileInput" className="block text-gray-600 cursor-pointer text-sm">
          {file ? (
            <span className="text-green-600 font-medium">{file.name}</span>
          ) : (
            <span className="text-gray-500">Click to upload a video</span>
          )}
        </label>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file}
        className={`w-full mt-3 py-1.5 rounded-md text-sm font-semibold transition ${
          file
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        Upload
      </button>

      {/* Status Message */}
      {message && (
        <p
          className={`mt-2 text-xs text-center ${
            message.includes("❌") ? "text-red-500" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default Upload;
