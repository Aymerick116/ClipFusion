from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
from services.video_processing import extract_audio
from services.transcription import transcribe_audio
from services.database import SessionLocal, engine, Transcription, init_db, Video, Clip
from services.clips_generator import generate_clip
from typing import List

#testing ai clip gen
from services.ai_clip_selector import run_pipeline_and_return_highlights
from fastapi import Body
import json  
import glob

import boto3
from dotenv import load_dotenv
from uuid import uuid4
import io
from botocore.exceptions import NoCredentialsError


load_dotenv()  # Load environment variables
app = FastAPI()

UPLOAD_FOLDER = "uploads"
# Directory where clips are saved
# CLIP_FOLDER = "/Users/aymerickosse/ClipFusion/backend/clips"
# Define temporary storage for downloaded videos
TEMP_DOWNLOAD_FOLDER = "temp"
CLIP_FOLDER = "clips"
os.makedirs(TEMP_DOWNLOAD_FOLDER, exist_ok=True)
os.makedirs(CLIP_FOLDER, exist_ok=True)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Automatically create tables on startup
@app.on_event("startup")
def on_startup():
    print("🔌 Connecting to the database...")
    init_db()
    print("✅ Database initialized (tables created if they didn't exist)")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
# app.mount("/clips", StaticFiles(directory="clips"), name="clips")
# app.mount("/clips", StaticFiles(directory=CLIP_FOLDER), name="clips")

# app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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




@app.get("/")
def read_root():
    print("🌐 GET / called")
    return {"message": "Welcome to ClipFusion API"}


# @app.post("/upload/")
# async def upload_video(file: UploadFile = File(...)):
#     print(f"📤 Uploading video: {file.filename}")
#     os.makedirs(UPLOAD_FOLDER, exist_ok=True)
#     file_path = os.path.join(UPLOAD_FOLDER, file.filename)

#     with open(file_path, "wb") as buffer:
#         buffer.write(await file.read())

#     return {"filename": file.filename, "message": "Upload Successful"}
@app.post("/upload/")
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Uploads a video to AWS S3 and saves the metadata in the database.
    """
    print(f"📤 Uploading video: {file.filename}")

    # Generate a unique filename to prevent conflicts
    unique_filename = f"{uuid4()}_{file.filename}"

    # Upload file to S3
    s3_client.upload_fileobj(file.file, AWS_S3_BUCKET, unique_filename)

    # Get the public URL of the uploaded file
    s3_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"

    # ✅ Store video metadata in the database
    db_video = Video(filename=file.filename, s3_url=s3_url)
    db.add(db_video)
    db.commit()

    return {"filename": file.filename, "s3_url": s3_url, "message": "Upload Successful"}


# @app.get("/videos/")
# def list_videos():
#     print("📂 GET /videos/ called")
#     os.makedirs(UPLOAD_FOLDER, exist_ok=True)
#     video_extensions = (".mp4", ".mov", ".avi", ".mkv")
#     videos = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith(video_extensions)]
#     return {"videos": videos}

@app.get("/videos/")
def list_videos(db: Session = Depends(get_db)):
    """
    Lists all uploaded videos from the database with their S3 URLs.
    """
    print("📂 Fetching all videos from DB")

    videos = db.query(Video).all()
    return [
        {"filename": video.filename, "s3_url": video.s3_url}
        for video in videos
    ]




@app.post("/transcribe/")
async def transcribe_video(
    filename: str = Query(..., description="Filename of the uploaded video"),
    db: Session = Depends(get_db)
):
    print(f"📝 Transcribing video: {filename}")
    video_path = os.path.join(UPLOAD_FOLDER, filename)

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"❌ Video not found: {filename}")

    audio_path = extract_audio(filename)
    transcript = transcribe_audio(os.path.basename(audio_path))  # Dict from LemonFox

    # ✅ Save entire transcript object as JSON string
    db_transcription = Transcription(
        filename=filename,
        transcript=json.dumps(transcript)  # <-- this is the key change
    )

    db.add(db_transcription)
    db.commit()

    return {"filename": filename, "transcript": transcript}


@app.get("/transcript/")
def get_transcript(filename: str = Query(...), db: Session = Depends(get_db)):
    print(f"🔍 Fetching transcript for: {filename}")
    record = db.query(Transcription).filter(Transcription.filename == filename).first()
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return {"filename": filename, "transcript": record.transcript}


@app.put("/transcript/")
def update_transcript(
    filename: str = Query(...),
    updated_text: str = Query(...),
    db: Session = Depends(get_db)
):
    print(f"✏️ Updating transcript for: {filename}")
    record = db.query(Transcription).filter(Transcription.filename == filename).first()
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found")
    record.transcript = updated_text
    db.commit()
    return {"message": f"Transcript for {filename} updated."}


@app.delete("/transcript/")
def delete_transcript(filename: str = Query(...), db: Session = Depends(get_db)):
    print(f"🗑️ Deleting transcript for: {filename}")
    record = db.query(Transcription).filter(Transcription.filename == filename).first()
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found")
    db.delete(record)
    db.commit()
    return {"message": f"Transcript for {filename} deleted."}



def download_from_s3(s3_key: str) -> str:
    """Downloads a video from S3 and saves it locally."""
    local_path = os.path.join(TEMP_DOWNLOAD_FOLDER, os.path.basename(s3_key))
    
    print(f"🔍 Attempting to download: s3://{AWS_S3_BUCKET}/{s3_key} → {local_path}")

    try:
        s3_client.download_file(AWS_S3_BUCKET, s3_key, local_path)
        print(f"✅ Downloaded from S3: {s3_key} → {local_path}")
        return local_path
    except NoCredentialsError:
        print("❌ AWS credentials not available.")
        return None
    except Exception as e:
        print(f"❌ Failed to download from S3: {str(e)}")
        return None
    
def upload_to_s3(file_path: str, s3_key: str) -> str:
    """Uploads a generated clip to S3 and returns the public URL."""
    try:
        s3_client.upload_file(file_path, AWS_S3_BUCKET, s3_key, ExtraArgs={"ContentType": "video/mp4"})
        print(f"✅ Uploaded to S3: s3://{AWS_S3_BUCKET}/{s3_key}")
        return f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
    except NoCredentialsError:
        print("❌ AWS credentials not available.")
        return None
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return None


@app.post("/generate-ai-clips/")
def generate_ai_clips(
    filename: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    print(f"🤖 Generating AI clips for: {filename}")

    # 1️⃣ Fetch video metadata from DB (get actual S3 URL)
    video_record = db.query(Video).filter(Video.filename == filename).first()
    if not video_record:
        raise HTTPException(status_code=404, detail=f"Video '{filename}' not found in database.")

    s3_url = video_record.s3_url
    print(f"🎥 Found S3 URL: {s3_url}")

    # 2️⃣ Extract S3 Key from URL
    s3_video_key = s3_url.split(f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[-1]
    print(f"🔑 Extracted S3 Key: {s3_video_key}")

    # 3️⃣ Download video using the correct key
    video_path = download_from_s3(s3_video_key)
    if not video_path:
        raise HTTPException(status_code=500, detail="Failed to download video from S3.")

    # 4️⃣ Fetch transcript from DB
    record = db.query(Transcription).filter(Transcription.filename == filename).first()
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found")

    # 5️⃣ Load JSON from transcript field
    try:
        transcript_data = json.loads(record.transcript)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Transcript is not valid JSON")

    segments = transcript_data.get("segments", [])
    if not segments:
        raise HTTPException(status_code=400, detail="No segments found in transcript.")

    # 6️⃣ Use AI to get top emotional/interesting highlights
    try:
        top_highlights = run_pipeline_and_return_highlights(segments, top_n=3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM analysis failed: {e}")

    # 7️⃣ Generate clips, upload to S3, and save to DB
    clips = []
    for i, highlight in enumerate(top_highlights):
        start = highlight["start"]
        end = highlight["end"]
        text = highlight["quote"]

        try:
            print(f"🎬 Generating Clip {i} for {filename} (Start: {start}, End: {end})")

            # ✅ Generate clip
            clip_path = generate_clip(video_path, start, end, clip_index=i)

            # ✅ Upload clip to S3
            clip_s3_key = f"clips/{os.path.basename(clip_path)}"
            clip_url = upload_to_s3(clip_path, clip_s3_key)

            if not clip_url:
                print(f"❌ ERROR: Clip {i} failed to upload.")
                continue  # Skip to next clip

            # ✅ Store clip metadata in DB
            db_clip = Clip(
                id=str(uuid4()),
                filename=filename,
                start_time=start,
                end_time=end,
                clip_url=clip_url
            )
            db.add(db_clip)
            db.commit()
            print(f"✅ Clip {i} metadata saved in DB")

            clips.append({
                "clip_index": i,
                "start": start,
                "end": end,
                "text": text,
                "clip_url": clip_url
            })

        except Exception as e:
            print(f"❌ ERROR: Failed to process clip {i}: {e}")
            continue

    # 8️⃣ Clean up local files after processing
    os.remove(video_path)
    print(f"🗑️ Deleted local original video: {video_path}")

    for clip in clips:
        clip_path = os.path.join(CLIP_FOLDER, os.path.basename(clip["clip_url"]))
        os.remove(clip_path)
        print(f"🗑️ Deleted local clip: {clip_path}")

    print(f"✅ AI Clip Generation Completed for {filename}")
    return {"filename": filename, "clips": clips}


@app.get("/get-clips/")
def get_clips(
    filename: str = Query(..., description="Filename of the selected video"),
    db: Session = Depends(get_db)
):
    """
    Fetches all clips generated for a specific video.
    """
    print(f"🔍 Fetching clips for: {filename}")

    # Query the database for clips associated with the given filename
    clips = db.query(Clip).filter(Clip.filename == filename).all()

    if not clips:
        raise HTTPException(status_code=404, detail="No clips found for this video.")

    # Format the response
    return {
        "filename": filename,
        "clips": [
            {
                "clip_id": clip.id,
                "start_time": clip.start_time,
                "end_time": clip.end_time,
                "clip_url": clip.clip_url
            }
            for clip in clips
        ]
    }






if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)







