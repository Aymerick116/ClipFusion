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
    """
    Downloads the video from S3, extracts audio, transcribes it, and stores the transcript in the database.
    Deletes extracted audio from S3 after transcription.
    """
    print(f"📝 Fetching video details from DB: {filename}")

    # ✅ Fetch video metadata from the DB
    video_record = db.query(Video).filter(Video.filename == filename).first()
    if not video_record:
        raise HTTPException(status_code=404, detail=f"❌ Video '{filename}' not found in database.")

    s3_url = video_record.s3_url
    print(f"🎥 Found S3 URL: {s3_url}")

    # ✅ Extract audio and upload to S3
    audio_s3_url = extract_audio(s3_url, filename)

    # ✅ Transcribe using S3 audio URL
    transcript = transcribe_audio(audio_s3_url)

    if not transcript:
        raise HTTPException(status_code=500, detail="❌ Transcription failed")

    # ✅ Save transcript in the database
    db_transcription = Transcription(
        filename=filename,
        transcript=json.dumps(transcript)  # Store as JSON
    )
    db.add(db_transcription)
    db.commit()

    print(f"✅ Transcription saved for {filename}")

    # ✅ Delete extracted audio from S3 after transcription
    audio_s3_key = audio_s3_url.split(f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[-1]
    try:
        s3_client.delete_object(Bucket=AWS_S3_BUCKET, Key=audio_s3_key)
        print(f"🗑️ Deleted audio from S3: {audio_s3_key}")
    except Exception as e:
        print(f"❌ Failed to delete audio from S3: {e}")

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
    print(f"🎥 Found S3 URL: {s3_url}")

    # 2️⃣ Download video from S3
    local_video_path = os.path.join(TEMP_DOWNLOAD_FOLDER, filename)
    try:
        response = requests.get(s3_url, stream=True)
        response.raise_for_status()
        with open(local_video_path, "wb") as video_file:
            for chunk in response.iter_content(chunk_size=8192):
                video_file.write(chunk)
        print(f"✅ Video downloaded: {local_video_path}")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"❌ Failed to download video from S3: {e}")

    # 3️⃣ Fetch transcript from DB
    record = db.query(Transcription).filter(Transcription.filename == filename).first()
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found")

    # 4️⃣ Load JSON from transcript field
    try:
        transcript_data = json.loads(record.transcript)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Transcript is not valid JSON")

    segments = transcript_data.get("segments", [])
    if not segments:
        raise HTTPException(status_code=400, detail="No segments found in transcript.")

    # 5️⃣ Use AI to get top emotional/interesting highlights
    try:
        top_highlights = run_pipeline_and_return_highlights(segments, top_n=3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM analysis failed: {e}")

    # 6️⃣ Generate clips, upload to S3, and save to DB
    clips = []
    for i, highlight in enumerate(top_highlights):
        start = highlight["start"]
        end = highlight["end"]
        text = highlight["quote"]

        try:
            print(f"🎬 Generating Clip {i} for {filename} (Start: {start}, End: {end})")

            # ✅ Generate clip
            clip_path = generate_clip(local_video_path, start, end, clip_index=i)

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
                "hashtags": clip_hashtags
            })

            # ✅ Delete the local clip file after uploading
            os.remove(clip_path)
            print(f"🗑️ Deleted local clip: {clip_path}")

        except Exception as e:
            print(f"❌ ERROR: Failed to process clip {i}: {e}")
            continue

    # 7️⃣ Clean up: Delete local video file after processing
    os.remove(local_video_path)
    print(f"🗑️ Deleted local original video: {local_video_path}")

    # 8️⃣ Generate overall hashtags for the complete video if not already present
    if len(video_record.hashtags) == 0:
        try:
            video_hashtags = generate_hashtags_from_transcript(record.transcript, num_hashtags=5)
            
            # Save hashtags to database
            for tag in video_hashtags:
                # Create hashtag if it doesn't exist
                db_hashtag = db.query(Hashtag).filter(Hashtag.name == tag).first()
                if not db_hashtag:
                    db_hashtag = Hashtag(name=tag)
                    db.add(db_hashtag)
                    db.commit()
                
                # Associate hashtag with the video
                if db_hashtag not in video_record.hashtags:
                    video_record.hashtags.append(db_hashtag)
            
            db.commit()
            print(f"✅ Overall hashtags generated and saved for video: {video_hashtags}")
        except Exception as e:
            print(f"❌ ERROR: Failed to generate overall hashtags: {e}")

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







