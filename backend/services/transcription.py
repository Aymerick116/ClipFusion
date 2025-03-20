import os
import requests
from dotenv import load_dotenv
from fastapi import HTTPException

# Load API key from .env file
load_dotenv()
LEMONFOX_API_KEY = os.getenv("LEMONFOX_API_KEY")

if not LEMONFOX_API_KEY:
    raise RuntimeError("❌ API key missing. Set LEMONFOX_API_KEY in .env.")

def transcribe_audio(audio_filename: str) -> dict:
    """Transcribes an audio file using the LemonFox API."""
    API_URL = "https://api.lemonfox.ai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {LEMONFOX_API_KEY}"}

    audio_path = os.path.join(os.path.dirname(__file__), "../audio", audio_filename)

    # Ensure the audio file exists
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail=f"❌ File not found: {audio_filename}")

    # Upload file to LemonFox API
    with open(audio_path, "rb") as audio_file:
        files = {"file": audio_file}
        data = {
            "language": "english",
            "response_format": "json"
        }

        response = requests.post(API_URL, headers=headers, files=files, data=data)

    # Check API response
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"❌ Transcription failed: {response.json()}")

    return response.json()

# # ✅ Standalone Test
# if __name__ == "__main__":
#     test_audio = "test3.mp3"
#     try:
#         transcript = transcribe_audio(test_audio)
#         print(f"🎙️ Transcription:\n{transcript}")
#     except HTTPException as e:
#         print(f"❌ Error: {e.detail}")
