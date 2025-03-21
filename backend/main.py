from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os

from services.video_processing import extract_audio
from services.transcription import transcribe_audio
from services.database import SessionLocal, engine, Transcription, init_db

app = FastAPI()

UPLOAD_FOLDER = "uploads"

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

# Serve uploads as static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def read_root():
    print("🌐 GET / called")
    return {"message": "Welcome to ClipFusion API"}


@app.post("/upload/")
async def upload_video(file: UploadFile = File(...)):
    print(f"📤 Uploading video: {file.filename}")
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    return {"filename": file.filename, "message": "Upload Successful"}


@app.get("/videos/")
def list_videos():
    print("📂 GET /videos/ called")
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    video_extensions = (".mp4", ".mov", ".avi", ".mkv")
    videos = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith(video_extensions)]
    return {"videos": videos}


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
    transcript = transcribe_audio(os.path.basename(audio_path))

    db_transcription = Transcription(filename=filename, transcript=transcript["text"])
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


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)




