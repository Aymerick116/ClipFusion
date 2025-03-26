import os
import subprocess
import boto3
import requests
from botocore.exceptions import NoCredentialsError
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()
print("🚀 Starting video processing script...")

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")

# Initialize S3 Client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

# Base directory for temp storage
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMP_DOWNLOAD_FOLDER = os.path.join(BASE_DIR, "temp")

# Ensure temp folder exists
os.makedirs(TEMP_DOWNLOAD_FOLDER, exist_ok=True)

# Find FFmpeg path
FFMPEG_PATH = subprocess.run(["which", "ffmpeg"], capture_output=True, text=True).stdout.strip()
if not FFMPEG_PATH:
    raise RuntimeError("❌ FFmpeg not found. Make sure it's installed and in PATH.")
print(f"🎬 Using FFmpeg path: {FFMPEG_PATH}")

def extract_audio(video_s3_url: str, video_filename: str) -> str:
    """
    Downloads a video from S3, extracts its audio, and uploads the extracted audio back to S3.
    Returns the S3 URL of the uploaded audio.
    """
    print(f"🔄 Downloading video from S3: {video_s3_url}")

    # ✅ Step 1: Download video from S3
    local_video_path = os.path.join(TEMP_DOWNLOAD_FOLDER, video_filename)
    try:
        response = requests.get(video_s3_url, stream=True)
        response.raise_for_status()
        with open(local_video_path, "wb") as video_file:
            for chunk in response.iter_content(chunk_size=8192):
                video_file.write(chunk)
        print(f"✅ Video downloaded: {local_video_path}")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"❌ Failed to download video from S3: {e}")

    # ✅ Step 2: Extract audio using FFmpeg
    audio_filename = video_filename.rsplit(".", 1)[0] + ".mp3"
    local_audio_path = os.path.join(TEMP_DOWNLOAD_FOLDER, audio_filename)

    command = [
        FFMPEG_PATH,
        "-y",
        "-i", local_video_path,
        "-vn",
        "-acodec", "mp3",
        "-ar", "16000",
        local_audio_path
    ]

    print(f"📢 Running FFmpeg command: {' '.join(command)}")

    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"✅ Audio extracted: {local_audio_path}")
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg Error: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Error extracting audio: {e.stderr}")

    # ✅ Step 3: Upload extracted audio to S3
    s3_audio_key = f"audios/{audio_filename}"
    try:
        s3_client.upload_file(local_audio_path, AWS_S3_BUCKET, s3_audio_key, ExtraArgs={"ContentType": "audio/mpeg"})
        print(f"✅ Audio uploaded to S3: {s3_audio_key}")
    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="❌ AWS credentials not available.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"❌ Failed to upload audio to S3: {str(e)}")

    # ✅ Step 4: Cleanup (Delete local video & audio files)
    os.remove(local_video_path)
    os.remove(local_audio_path)
    print(f"🗑️ Deleted local files: {local_video_path} and {local_audio_path}")

    # ✅ Return the S3 URL of the uploaded audio
    return f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_audio_key}"


# import os
# import subprocess
# from fastapi import HTTPException

# print("🚀 Starting video processing script...")  # Debugging print

# # Get absolute path of the backend folder
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Moves up from `services/` to `backend/`
# print(f"📂 Base directory: {BASE_DIR}")

# UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
# AUDIO_FOLDER = os.path.join(BASE_DIR, "audio")

# # Ensure folders exist
# os.makedirs(AUDIO_FOLDER, exist_ok=True)
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# print("📁 Ensured 'uploads' and 'audio' directories exist.")

# # Find FFmpeg path
# FFMPEG_PATH = subprocess.run(["which", "ffmpeg"], capture_output=True, text=True).stdout.strip()
# if not FFMPEG_PATH:
#     raise RuntimeError("❌ FFmpeg not found. Make sure it's installed and in PATH.")
# print(f"🎬 Using FFmpeg path: {FFMPEG_PATH}")

# def extract_audio(video_filename: str) -> str:
#     """Extracts audio from a video file using FFmpeg."""
#     print(f"🔄 Extracting audio from {video_filename}...")
#     video_path = os.path.join(UPLOAD_FOLDER, video_filename)
#     audio_filename = video_filename.rsplit(".", 1)[0] + ".mp3"
#     audio_path = os.path.join(AUDIO_FOLDER, audio_filename)

#     # Ensure the video file exists
#     if not os.path.exists(video_path):
#         raise HTTPException(status_code=404, detail=f"❌ File not found: {video_filename}")

#     # FFmpeg command to extract audio
#     command = [
#         FFMPEG_PATH,
#         "-y",
#         "-i", video_path,
#         "-vn",
#         "-acodec", "mp3",
#         "-ar", "16000",
#         audio_path
#     ]

#     print(f"📢 Running FFmpeg command: {' '.join(command)}")
    
#     try:
#         result = subprocess.run(command, check=True, capture_output=True, text=True)
#         print(f"✅ FFmpeg Output: {result.stdout}")
#         return audio_path
#     except subprocess.CalledProcessError as e:
#         print(f"❌ FFmpeg Error: {e.stderr}")  # Print FFmpeg error for debugging
#         raise HTTPException(status_code=500, detail=f"Error extracting audio: {e.stderr}")

# # standalone test below