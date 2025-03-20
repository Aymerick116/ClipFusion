import os
import subprocess
from fastapi import HTTPException

print("🚀 Starting video processing script...")  # Debugging print

# Get absolute path of the backend folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Moves up from `services/` to `backend/`
print(f"📂 Base directory: {BASE_DIR}")

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
AUDIO_FOLDER = os.path.join(BASE_DIR, "audio")

# Ensure folders exist
os.makedirs(AUDIO_FOLDER, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print("📁 Ensured 'uploads' and 'audio' directories exist.")

# Find FFmpeg path
FFMPEG_PATH = subprocess.run(["which", "ffmpeg"], capture_output=True, text=True).stdout.strip()
if not FFMPEG_PATH:
    raise RuntimeError("❌ FFmpeg not found. Make sure it's installed and in PATH.")
print(f"🎬 Using FFmpeg path: {FFMPEG_PATH}")

def extract_audio(video_filename: str) -> str:
    """Extracts audio from a video file using FFmpeg."""
    print(f"🔄 Extracting audio from {video_filename}...")
    video_path = os.path.join(UPLOAD_FOLDER, video_filename)
    audio_filename = video_filename.rsplit(".", 1)[0] + ".mp3"
    audio_path = os.path.join(AUDIO_FOLDER, audio_filename)

    # Ensure the video file exists
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"❌ File not found: {video_filename}")

    # FFmpeg command to extract audio
    command = [
        FFMPEG_PATH,
        "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "mp3",
        "-ar", "16000",
        audio_path
    ]

    print(f"📢 Running FFmpeg command: {' '.join(command)}")
    
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"✅ FFmpeg Output: {result.stdout}")
        return audio_path
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg Error: {e.stderr}")  # Print FFmpeg error for debugging
        raise HTTPException(status_code=500, detail=f"Error extracting audio: {e.stderr}")

# standalone test below