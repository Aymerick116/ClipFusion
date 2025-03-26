

from sqlalchemy import create_engine, Column, String, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize database engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Define the base class for models
Base = declarative_base()

# ✅ Define the Video model (stores original uploaded videos)
class Video(Base):
    __tablename__ = "videos"
    
    filename = Column(String, primary_key=True)  # Original filename
    s3_url = Column(String, nullable=False)  # S3 URL for the video

    # Relationship to clips
    clips = relationship("Clip", back_populates="video", cascade="all, delete-orphan")

# ✅ Define the Clip model (stores generated clips)
class Clip(Base):
    __tablename__ = "clips"

    id = Column(String, primary_key=True)
    filename = Column(String, ForeignKey("videos.filename"), nullable=False)  # Tied to original video
    start_time = Column(Float, nullable=False)  # Clip start time (seconds)
    end_time = Column(Float, nullable=False)  # Clip end time (seconds)
    clip_url = Column(String, nullable=False)  # S3 URL of the clip

    # Relationship back to Video
    video = relationship("Video", back_populates="clips")

# ✅ Define the Transcription model
class Transcription(Base):
    __tablename__ = "transcriptions"
    
    filename = Column(String, ForeignKey("videos.filename"), primary_key=True)
    transcript = Column(String)

    # Relationship to Video
    video = relationship("Video")

# ✅ Create the database tables
def init_db():
    Base.metadata.create_all(bind=engine)



# from sqlalchemy import create_engine, Column, String
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker
# import os
# from dotenv import load_dotenv

# # Load the environment variables
# load_dotenv()

# DATABASE_URL = os.getenv("DATABASE_URL")

# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Base = declarative_base()

# # Define the Transcription model
# class Transcription(Base):
#     __tablename__ = "transcriptions"
#     filename = Column(String, primary_key=True)
#     transcript = Column(String)

# # Create the database table
# def init_db():
#     Base.metadata.create_all(bind=engine)

# # if __name__ == "__main__":
# #     print("🔌 Connecting to the database...")
# #     try:
# #         init_db()
# #         print("✅ Table creation completed or already exists.")
# #     except Exception as e:
# #         print(f"❌ Error: {e}")