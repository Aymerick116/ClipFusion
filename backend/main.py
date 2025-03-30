from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends, BackgroundTasks, Body
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
from services.video_processing import extract_audio
from services.transcription import transcribe_audio
from services.database import SessionLocal, engine, Transcription, init_db, Video, Clip, Hashtag
from services.clips_generator import generate_clip
from typing import List
from pydantic import BaseModel

#testing ai clip gen
from services.ai_clip_selector import run_pipeline_and_return_highlights
import json  
import glob

import boto3
from dotenv import load_dotenv
from uuid import uuid4
import io
from botocore.exceptions import NoCredentialsError
import requests
from services.hashtag_generator import generate_hashtags_from_transcript

from services.ecs_launcher import launch_ecs_task
import time

load_dotenv()  # Load environment variables
app = FastAPI()

# UPLOAD_FOLDER = "uploads"
# TEMP_DOWNLOAD_FOLDER = "temp"
# CLIP_FOLDER = "clips"
# os.makedirs(TEMP_DOWNLOAD_FOLDER, exist_ok=True)
# os.makedirs(CLIP_FOLDER, exist_ok=True)

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

# Define Pydantic models for request/response
class HashtagBase(BaseModel):
    name: str

class HashtagCreate(HashtagBase):
    pass

class HashtagResponse(HashtagBase):
    videos: List[str] = []

def wait_for_s3_file(bucket: str, key: str, timeout: int = 60):
    """Polls S3 until a file appears or times out."""
    for _ in range(timeout):
        try:
            s3_client.head_object(Bucket=bucket, Key=key)
            print(f"✅ Found {key} in S3.")
            return True
        except s3_client.exceptions.ClientError:
            print(f"⏳ Waiting for {key} to appear in S3...")
            time.sleep(1)
    raise Exception(f"⏰ Timeout waiting for {key} in S3.")


@app.get("/")
def read_root():
    print("🌐 GET / called")
    return {"message": "Welcome to ClipFusion API"}




@app.post("/upload/")
async def upload_video(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Uploads a video to AWS S3, saves metadata in the database,
    and immediately transcribes it.
    """
    print(f"📤 Uploading video: {file.filename}")

    # Check if the video already exists in the DB
    existing_video = db.query(Video).filter(Video.filename == file.filename).first()
    if (existing_video):
        print(f"⚠️ Video '{file.filename}' already exists in DB. Skipping re-upload.")
        return {
            "filename": existing_video.filename, 
            "s3_url": existing_video.s3_url, 
            "message": "Video already uploaded."
        }

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

    # 🔄 **Immediately transcribe and store in DB**
    try:
        transcript = transcribe_and_store(file.filename, db)
    except HTTPException as e:
        return {"filename": file.filename, "s3_url": s3_url, "message": f"Upload successful, but transcription failed: {e.detail}"}

    return {
        "filename": file.filename, 
        "s3_url": s3_url, 
        "transcript": transcript,
        "message": "Upload and transcription successful."
    }

def transcribe_and_store(filename: str, db: Session):
    video_record = db.query(Video).filter(Video.filename == filename).first()
    if not video_record:
        raise HTTPException(status_code=404, detail="❌ Video not found in DB")

    s3_url = video_record.s3_url
    video_s3_key = s3_url.split(f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[-1]

    audio_filename = f"{uuid4()}_{filename.rsplit('.', 1)[0]}.mp3"
    audio_key = f"audios/{audio_filename}"
    audio_s3_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{audio_key}"

    try:
        print("🚀 Launching ECS task to extract audio...")
        launch_ecs_task(
            mode="extract_audio",
            bucket=AWS_S3_BUCKET,
            input_key=video_s3_key,
            output_key=audio_key
        )

        # ⏳ Wait until audio is available in S3
        wait_for_s3_file(AWS_S3_BUCKET, audio_key)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"❌ ECS audio extraction or wait failed: {e}")

    # ✅ Transcribe from S3 audio URL
    try:
        transcript = transcribe_audio(audio_s3_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"❌ Transcription failed: {e}")

    # ✅ Save transcript in DB
    db_transcription = Transcription(filename=filename, transcript=json.dumps(transcript))
    db.add(db_transcription)
    db.commit()

    # ✅ Optionally clean up
    try:
        s3_client.delete_object(Bucket=AWS_S3_BUCKET, Key=audio_key)
        print(f"🗑️ Deleted temp audio from S3: {audio_key}")
    except Exception as e:
        print(f"⚠️ Could not delete audio file from S3: {e}")

    return transcript





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

@app.delete("/video/")
def delete_video(
    filename: str = Query(..., description="Filename of the video to delete"),
    db: Session = Depends(get_db)
):
    print(f"🗑️ Deleting everything related to: {filename}")

    # 🔍 Get the video record
    video_record = db.query(Video).filter(Video.filename == filename).first()
    if not video_record:
        raise HTTPException(status_code=404, detail="Video not found in the database.")

    # Extract the S3 key from the URL
    try:
        video_s3_key = video_record.s3_url.split(f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[-1]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse video S3 key: {e}")

    # 🗑️ Delete video from S3
    try:
        s3_client.delete_object(Bucket=AWS_S3_BUCKET, Key=video_s3_key)
        print(f"✅ Deleted video from S3: {video_s3_key}")
    except Exception as e:
        print(f"❌ Failed to delete video from S3: {e}")

    # 🗑️ Delete associated clips
    clips = db.query(Clip).filter(Clip.filename == filename).all()
    for clip in clips:
        # Delete clip from S3
        clip_s3_key = clip.clip_url.split(f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[-1]
        try:
            s3_client.delete_object(Bucket=AWS_S3_BUCKET, Key=clip_s3_key)
            print(f"✅ Deleted clip from S3: {clip_s3_key}")
        except Exception as e:
            print(f"❌ Failed to delete clip from S3: {e}")
        
        # Delete clip from DB
        db.delete(clip)

    # 🗑️ Delete transcription
    transcription = db.query(Transcription).filter(Transcription.filename == filename).first()
    if transcription:
        db.delete(transcription)
        print("✅ Deleted transcript from DB")

    # 🗑️ Finally delete video record
    db.delete(video_record)

    # Commit all DB deletions
    db.commit()
    print("✅ All related records deleted from DB")

    return {"message": f"All data related to '{filename}' has been deleted."}







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
    video_s3_key = s3_url.split(f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[-1]
    print(f"🎥 Found S3 key: {video_s3_key}")

    # 2️⃣ Fetch transcript from DB
    record = db.query(Transcription).filter(Transcription.filename == filename).first()
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found")

    # 3️⃣ Load JSON from transcript field
    try:
        transcript_data = json.loads(record.transcript)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Transcript is not valid JSON")

    segments = transcript_data.get("segments", [])
    if not segments:
        raise HTTPException(status_code=400, detail="No segments found in transcript.")

    # 4️⃣ Use AI to get top emotional/interesting highlights
    try:
        top_highlights = run_pipeline_and_return_highlights(segments, top_n=3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM analysis failed: {e}")

    # 5️⃣ Generate ECS tasks to create clips
    clips = []
    for i, highlight in enumerate(top_highlights):
        start = highlight["start"]
        end = highlight["end"]
        text = highlight["quote"]

        output_key = f"clips/{uuid4()}_{filename}_clip{i}.mp4"
        clip_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{output_key}"

        try:
            print(f"🚀 Launching ECS task to generate clip {i} (Start: {start}, End: {end})")

            ecs_response = launch_ecs_task(
                mode="generate_clip",
                bucket=AWS_S3_BUCKET,
                input_key=video_s3_key,
                output_key=output_key,
                start=start,
                end=end
            )

            task_arn = ecs_response["tasks"][0]["taskArn"]
            print(f"✅ ECS task launched for clip {i}: {task_arn}")

            # Save metadata in DB
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

            # ✅ Generate hashtags for each clip using the transcript segment
            clip_hashtags = []
            segment_text = highlight.get("quote", "")
            if segment_text:
                try:
                    # Create a mini transcript-like object the generator can process
                    segment_transcript = json.dumps({"text": segment_text})
                    clip_hashtags = generate_hashtags_from_transcript(segment_transcript, num_hashtags=3)
                    
                    # Save hashtags to database
                    for tag in clip_hashtags:
                        # Create hashtag if it doesn't exist
                        db_hashtag = db.query(Hashtag).filter(Hashtag.name == tag).first()
                        if not db_hashtag:
                            db_hashtag = Hashtag(name=tag)
                            db.add(db_hashtag)
                            db.commit()
                        
                        # Associate hashtag with the clip
                        if db_hashtag not in db_clip.hashtags:
                            db_clip.hashtags.append(db_hashtag)
                    
                    # Also associate hashtags with the main video
                    for tag in clip_hashtags:
                        db_hashtag = db.query(Hashtag).filter(Hashtag.name == tag).first()
                        if db_hashtag not in video_record.hashtags:
                            video_record.hashtags.append(db_hashtag)
                    
                    db.commit()
                    print(f"✅ Hashtags generated and saved for clip {i}: {clip_hashtags}")
                except Exception as e:
                    print(f"❌ ERROR: Failed to generate hashtags for clip {i}: {e}")

            clips.append({
                "clip_index": i,
                "start": start,
                "end": end,
                "text": text,
                "clip_url": clip_url,
                "hashtags": clip_hashtags,
                "task_arn": task_arn
            })

        except Exception as e:
            print(f"❌ Failed to launch ECS for clip {i}: {e}")
            continue
   
    print(f"✅ All ECS tasks launched for {filename}")
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

@app.delete("/clip/")
def delete_clip(
    clip_id: str = Query(...),
    db: Session = Depends(get_db)
):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    # Delete from S3
    try:
        clip_s3_key = clip.clip_url.split(f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[-1]
        s3_client.delete_object(Bucket=AWS_S3_BUCKET, Key=clip_s3_key)
    except Exception as e:
        print(f"❌ Failed to delete from S3: {e}")

    db.delete(clip)
    db.commit()
    return {"message": f"Clip {clip_id} deleted."}

@app.post("/generate-clip-hashtags/")
async def generate_clip_hashtags(
    clip_id: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Generate hashtags for a specific clip based on its content.
    """
    # Check if clip exists
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    # Get the video's transcript
    transcript_record = db.query(Transcription).filter(Transcription.filename == clip.filename).first()
    if not transcript_record:
        raise HTTPException(status_code=404, detail="Transcript not found for this video")
    
    try:
        # Parse transcript
        transcript_data = json.loads(transcript_record.transcript)
        
        # Find segments that overlap with the clip's time range
        segments = transcript_data.get("segments", [])
        clip_segments = []
        
        for segment in segments:
            seg_start = float(segment.get("start", 0))
            seg_end = float(segment.get("end", 0))
            
            # Check if segment overlaps with clip time range
            if (seg_start <= clip.end_time and seg_end >= clip.start_time):
                clip_segments.append(segment)
        
        # Create a mini-transcript with just the clip segments
        clip_text = " ".join([seg.get("text", "") for seg in clip_segments])
        mini_transcript = json.dumps({"text": clip_text})
        
        # Generate hashtags
        hashtags = generate_hashtags_from_transcript(mini_transcript, num_hashtags=5)
        
        # Store hashtags in database
        for tag in hashtags:
            # Check if hashtag already exists
            db_hashtag = db.query(Hashtag).filter(Hashtag.name == tag).first()
            if not db_hashtag:
                db_hashtag = Hashtag(name=tag)
                db.add(db_hashtag)
                db.commit()
            
            # Link hashtag to clip if not already linked
            if db_hashtag not in clip.hashtags:
                clip.hashtags.append(db_hashtag)
        
        db.commit()
        
        return {"clip_id": clip_id, "hashtags": hashtags}
    
    except Exception as e:
        print(f"❌ ERROR: Failed to generate clip hashtags: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate hashtags: {str(e)}")

# Generate hashtags for a video based on its transcript
@app.post("/generate-hashtags/")
async def generate_hashtags(
    filename: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Generate hashtags for a video based on its transcript and store them in the database.
    """
    # Check if video exists
    video = db.query(Video).filter(Video.filename == filename).first()
    if not video:
        raise HTTPException(status_code=404, detail=f"Video '{filename}' not found")
    
    # Get transcript
    transcript_record = db.query(Transcription).filter(Transcription.filename == filename).first()
    if not transcript_record:
        raise HTTPException(status_code=404, detail="Transcript not found for this video")
    
    # Generate hashtags
    hashtags = generate_hashtags_from_transcript(transcript_record.transcript)
    
    # Store hashtags in database
    for tag in hashtags:
        # Check if hashtag already exists
        db_hashtag = db.query(Hashtag).filter(Hashtag.name == tag).first()
        if not db_hashtag:
            db_hashtag = Hashtag(name=tag)
            db.add(db_hashtag)
        
        # Link hashtag to video if not already linked
        if db_hashtag not in video.hashtags:
            video.hashtags.append(db_hashtag)
    
    db.commit()
    
    return {"filename": filename, "hashtags": hashtags}

# Get hashtags for a specific video
@app.get("/video-hashtags/")
async def get_video_hashtags(
    filename: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Get all hashtags associated with a specific video.
    """
    video = db.query(Video).filter(Video.filename == filename).first()
    if not video:
        raise HTTPException(status_code=404, detail=f"Video '{filename}' not found")
    
    return {
        "filename": filename,
        "hashtags": [hashtag.name for hashtag in video.hashtags]
    }

# Get hashtags for a specific clip
@app.get("/clip-hashtags/")
async def get_clip_hashtags(
    clip_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Get all hashtags associated with a specific clip.
    """
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    return {
        "clip_id": clip_id,
        "hashtags": [hashtag.name for hashtag in clip.hashtags]
    }

# Add custom hashtags to a video
@app.post("/add-video-hashtag/")
async def add_video_hashtag(
    filename: str = Body(...),
    hashtag: str = Body(...),
    db: Session = Depends(get_db)
):
    """
    Add a custom hashtag to a video.
    """
    video = db.query(Video).filter(Video.filename == filename).first()
    if not video:
        raise HTTPException(status_code=404, detail=f"Video '{filename}' not found")
    
    # Normalize hashtag (remove # if present, convert to lowercase)
    hashtag = hashtag.lstrip('#').lower()
    
    # Check if hashtag already exists
    db_hashtag = db.query(Hashtag).filter(Hashtag.name == hashtag).first()
    if not db_hashtag:
        db_hashtag = Hashtag(name=hashtag)
        db.add(db_hashtag)
    
    # Link hashtag to video if not already linked
    if db_hashtag not in video.hashtags:
        video.hashtags.append(db_hashtag)
        db.commit()
        return {"message": f"Hashtag '#{hashtag}' added to video '{filename}'"}
    else:
        return {"message": f"Hashtag '#{hashtag}' already exists for video '{filename}'"}

# Remove a hashtag from a video
@app.delete("/remove-video-hashtag/")
async def remove_video_hashtag(
    filename: str = Query(...),
    hashtag: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Remove a hashtag from a video.
    """
    video = db.query(Video).filter(Video.filename == filename).first()
    if not video:
        raise HTTPException(status_code=404, detail=f"Video '{filename}' not found")
    
    # Normalize hashtag
    hashtag = hashtag.lstrip('#').lower()
    
    # Find hashtag
    db_hashtag = db.query(Hashtag).filter(Hashtag.name == hashtag).first()
    if not db_hashtag or db_hashtag not in video.hashtags:
        raise HTTPException(status_code=404, detail=f"Hashtag '#{hashtag}' not found for this video")
    
    # Remove association between video and hashtag
    video.hashtags.remove(db_hashtag)
    db.commit()
    
    return {"message": f"Hashtag '#{hashtag}' removed from video '{filename}'"}



if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)







