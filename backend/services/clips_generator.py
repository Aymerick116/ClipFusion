import os
import subprocess

# Define folder for clips
CLIP_FOLDER = "clips"
os.makedirs(CLIP_FOLDER, exist_ok=True)

def generate_clip(video_path: str, start: float, end: float, clip_index: int = 0) -> str:
    """
    Generates a video clip using FFmpeg and saves it locally.
    
    Args:
        video_path (str): Local path to the video file.
        start (float): Start time of the clip in seconds.
        end (float): End time of the clip in seconds.
        clip_index (int): Index for unique clip naming.

    Returns:
        str: Local path to the generated clip.
    """
    if start >= end:
        raise ValueError("Start time must be less than end time.")

    base_name = os.path.splitext(os.path.basename(video_path))[0]
    output_filename = f"{base_name}_clip_{clip_index}.mp4"
    output_path = os.path.join(CLIP_FOLDER, output_filename)

    command = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-ss", str(start),
        "-t", str(end - start),
        "-c:v", "libx264",
        "-c:a", "aac",
        "-strict", "experimental",
        output_path
    ]

    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"✅ Clip generated: {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg error: {e.stderr.decode()}")
        raise RuntimeError(f"Failed to generate clip from {video_path}")


#you need to fix the gen ai endpoint so that it accesses files in the temporary folder and then processes them by using the generate cli[p]



# import os
# import subprocess

# # 🔑 Get the absolute path to the project root
# PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# # Define folder paths
# UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, "uploads")
# CLIP_FOLDER = os.path.join(PROJECT_ROOT, "clips")

# # Ensure clip folder exists
# os.makedirs(CLIP_FOLDER, exist_ok=True)

# def generate_clip(video_filename: str, start: float, end: float, clip_index: int = 0) -> str:
#     """
#     Generates a video clip from the uploaded video using FFmpeg.

#     Args:
#         video_filename (str): The name of the original video file.
#         start (float): Start time of the clip in seconds.
#         end (float): End time of the clip in seconds.
#         clip_index (int): Index to make each clip filename unique.

#     Returns:
#         str: Relative URL to the generated clip file (e.g., /clips/video_clip_0.mp4)
#     """
#     if start >= end:
#         raise ValueError("Start time must be less than end time.")

#     input_path = os.path.join(UPLOAD_FOLDER, video_filename)

#     base_name = os.path.splitext(video_filename)[0]
#     output_filename = f"{base_name}_clip_{clip_index}.mp4"
#     output_path = os.path.join(CLIP_FOLDER, output_filename)

#     command = [
#         "ffmpeg",
#         "-y",
#         "-i", input_path,
#         "-ss", str(start),
#         "-t", str(end - start),
#         "-c:v", "libx264",
#         "-c:a", "aac",
#         "-strict", "experimental",
#         output_path
#     ]

#     try:
#         subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
#         print(f"✅ Clip generated: {output_path}")

#         # ✅ Return relative URL path for frontend
#         return f"/clips/{output_filename}"
#     except subprocess.CalledProcessError as e:
#         print(f"❌ FFmpeg error: {e.stderr.decode()}")
#         raise RuntimeError(f"Failed to generate clip from {video_filename}")

