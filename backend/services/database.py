from sqlalchemy import create_engine, Column, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load the environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()

# Define the Transcription model
class Transcription(Base):
    __tablename__ = "transcriptions"
    filename = Column(String, primary_key=True)
    transcript = Column(String)

# Create the database table
def init_db():
    Base.metadata.create_all(bind=engine)

# if __name__ == "__main__":
#     print("🔌 Connecting to the database...")
#     try:
#         init_db()
#         print("✅ Table creation completed or already exists.")
#     except Exception as e:
#         print(f"❌ Error: {e}")

