import os
import subprocess
import boto3
import requests

# Load envs passed via ECS task
MODE = os.environ.get("MODE")  # "extract_audio" or "generate_clip"

BUCKET = os.environ["BUCKET"]
INPUT_KEY = os.environ["INPUT_KEY"]
OUTPUT_KEY = os.environ["OUTPUT_KEY"]

START = float(os.environ.get("START", 0))
END = float(os.environ.get("END", 0))

s3 = boto3.client("s3")

INPUT_FILE = "/tmp/input.mp4"
OUTPUT_FILE = "/tmp/output"

def download_from_s3(bucket, key, download_path):
    print(f"⬇️ Downloading s3://{bucket}/{key}")
    s3.download_file(bucket, key, download_path)
    print("✅ Download complete")

def upload_to_s3(bucket, key, file_path, content_type):
    print(f"⬆️ Uploading to s3://{bucket}/{key}")
    s3.upload_file(file_path, bucket, key, ExtraArgs={"ContentType": content_type})
    print("✅ Upload complete")

def extract_audio():
    audio_path = OUTPUT_FILE + ".mp3"
    cmd = [
        "ffmpeg", "-y", "-i", INPUT_FILE,
        "-vn", "-acodec", "mp3", "-ar", "16000", audio_path
    ]
    subprocess.run(cmd, check=True)
    upload_to_s3(BUCKET, OUTPUT_KEY, audio_path, "audio/mpeg")

def generate_clip():
    clip_path = OUTPUT_FILE + ".mp4"
    cmd = [
        "ffmpeg", "-y", "-ss", str(START), "-t", str(END - START),
        "-i", INPUT_FILE,
        "-c:v", "libx264", "-c:a", "aac", "-strict", "experimental",
        clip_path
    ]
    subprocess.run(cmd, check=True)
    upload_to_s3(BUCKET, OUTPUT_KEY, clip_path, "video/mp4")

if __name__ == "__main__":
    download_from_s3(BUCKET, INPUT_KEY, INPUT_FILE)

    if MODE == "extract_audio":
        extract_audio()
    elif MODE == "generate_clip":
        generate_clip()
    else:
        raise ValueError("Invalid MODE. Must be 'extract_audio' or 'generate_clip'.")
