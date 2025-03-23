import os
import subprocess

# 🔑 Get the absolute path to the project root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Define folder paths
UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, "uploads")
CLIP_FOLDER = os.path.join(PROJECT_ROOT, "clips")

# Ensure clip folder exists
os.makedirs(CLIP_FOLDER, exist_ok=True)

def generate_clip(video_filename: str, start: float, end: float, clip_index: int = 0) -> str:
    """
    Generates a video clip from the uploaded video using FFmpeg.

    Args:
        video_filename (str): The name of the original video file.
        start (float): Start time of the clip in seconds.
        end (float): End time of the clip in seconds.
        clip_index (int): Index to make each clip filename unique.

    Returns:
        str: Relative URL to the generated clip file (e.g., /clips/video_clip_0.mp4)
    """
    if start >= end:
        raise ValueError("Start time must be less than end time.")

    input_path = os.path.join(UPLOAD_FOLDER, video_filename)

    base_name = os.path.splitext(video_filename)[0]
    output_filename = f"{base_name}_clip_{clip_index}.mp4"
    output_path = os.path.join(CLIP_FOLDER, output_filename)

    command = [
        "ffmpeg",
        "-y",
        "-i", input_path,
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

        # ✅ Return relative URL path for frontend
        return f"/clips/{output_filename}"
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg error: {e.stderr.decode()}")
        raise RuntimeError(f"Failed to generate clip from {video_filename}")





# import os
# import subprocess

# # 🔑 Get the absolute path to the project root
# PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# # Build upload and clip folders relative to the project root
# UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, "uploads")
# CLIP_FOLDER = os.path.join(PROJECT_ROOT, "clips")

# # Ensure clips folder exists
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
#         str: Path to the generated clip file.
#     """
#     if start >= end:
#         raise ValueError("Start time must be less than end time.")

#     input_path = os.path.join(UPLOAD_FOLDER, video_filename)

#     # Output filename and path
#     base_name = os.path.splitext(video_filename)[0]
#     output_filename = f"{base_name}_clip_{clip_index}.mp4"
#     output_path = os.path.join(CLIP_FOLDER, output_filename)

#     # FFmpeg command
#     # command = [
#     #     "ffmpeg",
#     #     "-y",
#     #     "-i", input_path,
#     #     "-ss", str(start),
#     #     "-t", str(end - start),
#     #     "-c", "copy",
#     #     output_path
#     # ]
#     command = [
#     "ffmpeg",
#     "-y",
#     "-i", input_path,
#     "-ss", str(start),
#     "-t", str(end - start),
#     "-c:v", "libx264",
#     "-c:a", "aac",
#     "-strict", "experimental",  # optional for AAC
#     output_path
# ]

#     try:
#         subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
#         print(f"✅ Clip generated: {output_path}")
#         return output_path
#     except subprocess.CalledProcessError as e:
#         print(f"❌ FFmpeg error: {e.stderr.decode()}")
#         raise RuntimeError(f"Failed to generate clip from {video_filename}")

# # # 🧪 Standalone test
# # if __name__ == "__main__":
# #     test_video = "test3.mp4"
# #     test_start = 5
# #     test_end = 20

# #     input_path = os.path.join(UPLOAD_FOLDER, test_video)

# #     if not os.path.exists(input_path):
# #         print(f"❌ File not found: {input_path}")
# #     else:
# #         print(f"🎬 Testing clip generation for {test_video} from {test_start}s to {test_end}s")
# #         generate_clip(test_video, test_start, test_end, clip_index=0)
