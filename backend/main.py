from fastapi import FastAPI, UploadFile, File, HTTPException, Query
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from services.video_processing import extract_audio
from services.transcription import transcribe_audio
import os


app = FastAPI()

UPLOAD_FOLDER = "uploads"

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allow requests from your React app
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Serve the "uploads" folder as static files (to access videos directly)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def read_root():
    return {"/": "return the root of the API"}

@app.post("/upload/")
async def upload_video(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)  # Ensure uploads folder exists
    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    return {"filename": file.filename, "message": "Upload Successful"}

@app.get("/videos/")
def list_videos():
    """Returns a list of uploaded video filenames."""
    video_folder = "uploads"
    
    # Ensure folder exists
    os.makedirs(video_folder, exist_ok=True)

    # Get all video files (filter common video formats)
    video_extensions = (".mp4", ".mov", ".avi", ".mkv")
    videos = [f for f in os.listdir(video_folder) if f.endswith(video_extensions)]
    
    return {"videos": videos}

@app.post("/transcribe/")
async def transcribe_video(filename: str = Query(..., description="Filename of the uploaded video")):
    """Extracts audio and transcribes the given video file."""
    video_path = os.path.join(UPLOAD_FOLDER, filename)

    # Ensure video exists
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"❌ Video not found: {filename}")

    # Extract audio
    audio_path = extract_audio(filename)

    # Transcribe audio
    transcript = transcribe_audio(os.path.basename(audio_path))

    return {
        "filename": filename,
        "transcript": transcript
    }



if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000) # ✅ Fixed the host IP







