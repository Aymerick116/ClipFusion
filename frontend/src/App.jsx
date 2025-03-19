import Upload from "./components/Upload";
import VideoList from "./components/VideoList";

function App() {
  return (
    // <div className="h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
    //   {/* Header Section */}
    //   <h1 className="text-3xl font-bold text-gray-800">🎥 AI Video Processing Tool</h1>
    //   <p className="text-gray-600 text-md text-center max-w-lg">
    //     Upload your video, let AI analyze it, and preview the best clips.
    //   </p>

    //   {/* Upload Section (Centered & Slightly Larger than Upload Component) */}
    //   <div className="bg-white shadow-md rounded-lg p-4 w-1/3 min-w-[300px] min-h-[200px] flex flex-col items-center justify-center mt-4">
    //     <h2 className="text-lg font-semibold text-gray-700 text-center">Upload Video</h2>
    //     <Upload />
    //   </div>

    //   {/* Video List Section (Below Upload Section) */}
    //   <div className="flex flex-col items-center justify-center w-full max-w-5xl mt-6">
    //     <div className="bg-white shadow-md rounded-lg p-4 w-2/3">
    //       <h2 className="text-lg font-semibold text-gray-700 text-center">Your Uploaded Videos</h2>
    //       <VideoList />
    //     </div>
    //   </div>
    // </div>
    <div className="relative h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {/* Header Section - Fixed Position & No Overlapping */}
      <div className="absolute top-0 left-0 w-full bg-gray-100 pt-6 z-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-gray-800">🎥 AI Video Processing Tool</h1>
        <p className="text-gray-600 text-md text-center max-w-lg">
          Upload your video, let AI analyze it, and preview the best clips.
        </p>
      </div>

      {/* Upload & Video Sections (Pushed Below the Header) */}
      <div className="flex flex-col items-center justify-center w-full max-w-5xl mt-28">
        {/* Upload Section */}
        <div className="bg-white shadow-md rounded-lg p-4 w-1/3  flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-gray-700 text-center">Upload Video</h2>
          <Upload />
        </div>

        {/* Video List Section */}
        <div className="bg-white shadow-md rounded-lg p-4 w-2/3 mt-6">
          <h2 className="text-lg font-semibold text-gray-700 text-center">Your Uploaded Videos</h2>
          <VideoList />
        </div>
      </div>
    </div>

  );
}

export default App;
