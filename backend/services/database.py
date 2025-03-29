from sqlalchemy import create_engine, Column, String, Float, ForeignKey, Table
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

# Association table for Video-Hashtag many-to-many relationship
video_hashtags = Table(
    'video_hashtags',
    Base.metadata,
    Column('video_filename', String, ForeignKey('videos.filename')),
    Column('hashtag_name', String, ForeignKey('hashtags.name'))
)

# Define the Video model
class Video(Base):
    __tablename__ = "videos"
    
    filename = Column(String, primary_key=True)  # Original filename
    s3_url = Column(String, nullable=False)  # S3 URL for the video

    # Relationships
    clips = relationship("Clip", back_populates="video", cascade="all, delete-orphan")
    hashtags = relationship("Hashtag", secondary=video_hashtags, back_populates="videos")

# Define the Clip model
class Clip(Base):
    __tablename__ = "clips"

    id = Column(String, primary_key=True)
    filename = Column(String, ForeignKey("videos.filename"), nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    clip_url = Column(String, nullable=False)

    # Relationship back to Video
    video = relationship("Video", back_populates="clips")
    
    # Relationship to hashtags specific to this clip
    hashtags = relationship("Hashtag", secondary="clip_hashtags", back_populates="clips")

# Define the Hashtag model (NEW)
class Hashtag(Base):
    __tablename__ = "hashtags"
    
    name = Column(String, primary_key=True)  # Hashtag name without # symbol
    
    # Relationships
    videos = relationship("Video", secondary=video_hashtags, back_populates="hashtags")
    clips = relationship("Clip", secondary="clip_hashtags", back_populates="hashtags")

# Association table for Clip-Hashtag many-to-many relationship
clip_hashtags = Table(
    'clip_hashtags',
    Base.metadata,
    Column('clip_id', String, ForeignKey('clips.id')),
    Column('hashtag_name', String, ForeignKey('hashtags.name'))
)

# Define the Transcription model
class Transcription(Base):
    __tablename__ = "transcriptions"
    
    filename = Column(String, ForeignKey("videos.filename"), primary_key=True)
    transcript = Column(String)

    # Relationship to Video
    video = relationship("Video")

# Create the database tables
def init_db():
    Base.metadata.create_all(bind=engine)