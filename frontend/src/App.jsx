import Upload from "./components/Upload";
import VideoList from "./components/VideoList";
import ClipGenerator from "./components/ClipGenerator";

function App() {
  return (
    <div className="bg-black text-white min-h-screen">

      {/* Header / Navbar */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between px-6 py-4 lg:px-8">
          {/* Logo */}
          <div className="flex lg:flex-1">
            <a href="#" class="-m-1.5 p-1.5">
              <span className="sr-only">ClipFusion</span>
              <img
                className="h-8 w-auto"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                alt="ClipFusion Logo"
              />
            </a>
          </div>
          {/* Navigation Links */}
          <div className="hidden lg:flex lg:gap-x-10">
            <a href="#" className="text-sm font-semibold text-gray-300 hover:text-white">Product</a>
            <a href="#" className="text-sm font-semibold text-gray-300 hover:text-white">Features</a>
            <a href="#" className="text-sm font-semibold text-gray-300 hover:text-white">Pricing</a>
            <a href="#" className="text-sm font-semibold text-gray-300 hover:text-white">About</a>
          </div>
          {/* Login Button */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <a href="#" className="text-sm font-semibold text-gray-300 hover:text-white">
              Log in <span aria-hidden="true">→</span>
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="relative isolate px-6 pt-24 lg:px-8 text-center">
        <h1 className="text-5xl font-extrabold text-white tracking-tight sm:text-6xl">
          AI-Powered Video Clipping
        </h1>
        <p className="mt-4 text-lg text-gray-300 sm:text-xl max-w-2xl mx-auto">
          Transform long videos into viral shorts in seconds with AI.
        </p>

        {/* Upload Buttons */}
        <div className="mt-6 flex justify-center space-x-4">
          <button className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-md hover:bg-indigo-500 transition">
            🎬 Get Free Clips
          </button>
          <button className="rounded-full bg-gray-700 px-5 py-2 text-sm font-medium text-white shadow-md hover:bg-gray-600 transition">
            📂 Upload Files
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto mt-10">
        <div className="bg-gray-900 shadow-lg rounded-lg p-3 w-full flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-gray-300 text-center mb-2">
            Upload Your Video
          </h2>

          {/* Centering Upload Component Properly */}
          <div className="w-full flex items-center justify-center">
            <Upload />
          </div>
        </div>
      </div>


      {/* Video List Section */}
      <div className="bg-gray-900 shadow-lg rounded-lg p-4 w-full max-w-3xl mx-auto mt-6">
        <h2 className="text-lg font-semibold text-gray-300 text-center mb-3">
          Your Uploaded Videos
        </h2>
        <VideoList />
      </div>

      <div className="bg-gray-900 shadow-lg rounded-lg p-4 w-full max-w-3xl mx-auto mt-6">
        <ClipGenerator/>
      </div>

    </div>
  );
}

export default App;
