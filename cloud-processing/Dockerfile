FROM python:3.10-slim

WORKDIR /app

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY process_video.py .

CMD ["python", "process_video.py"]
