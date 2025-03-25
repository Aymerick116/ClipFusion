from openai import OpenAI
import difflib
import re
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ✅ Uses API key from environment variable
client = OpenAI(api_key=os.getenv("OPEN_AI_API_KEY"))

# 🔹 Step 1: Ask LLM to identify viral/emotional/storytelling moments
def generate_highlights_from_full_transcript(full_text, top_n=3):
    prompt = f"""
You are a content analyst assistant helping a creator make short, engaging TikTok videos from a podcast or interview.

Your task is to identify the top {top_n} most compelling segments that meet one or more of these criteria:
- A powerful or emotional story is being shared
- A personal or vulnerable moment is being explained
- A clear explanation or insight into an interesting topic is being given
- A moment that feels shocking, funny, relatable, or likely to go viral on social media

For each moment, return:
- A short description of what's happening
- The actual quote or exact wording from the transcript (1–5 sentences max)

Only include quotes that exactly exist in the transcript.

Transcript:
\"\"\"
{full_text}
\"\"\"
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1000
    )

    return response.choices[0].message.content


# 🔹 Step 2: Match each quote to a transcript segment using string similarity
def find_segment_for_quote(quote, segments, fuzz_threshold=0.6):
    best_match = None
    highest_ratio = 0
    for seg in segments:
        ratio = difflib.SequenceMatcher(None, quote, seg["text"]).ratio()
        if ratio > highest_ratio:
            best_match = seg
            highest_ratio = ratio
    return best_match if highest_ratio >= fuzz_threshold else None


# 🔹 Step 3: Process LLM output, expand short segments to meet 60s min
def process_llm_highlights(llm_output, segments, min_duration=60.0):
    highlights = []
    matches = re.findall(r'"([^"]+)"', llm_output)  # extract quoted strings

    for quote in matches:
        match = find_segment_for_quote(quote, segments)
        if not match:
            continue

        match_index = segments.index(match)
        start_idx = match_index
        end_idx = match_index

        # Convert to float to calculate duration
        start_time = float(segments[start_idx]["start"])
        end_time = float(segments[end_idx]["end"])
        total_duration = end_time - start_time

        # Expand to neighboring segments until we hit min duration
        while total_duration < min_duration:
            can_expand_before = start_idx > 0
            can_expand_after = end_idx < len(segments) - 1

            if can_expand_before and (not can_expand_after or total_duration < min_duration):
                start_idx -= 1
            elif can_expand_after:
                end_idx += 1
            else:
                break  # Can't expand anymore

            start_time = float(segments[start_idx]["start"])
            end_time = float(segments[end_idx]["end"])
            total_duration = end_time - start_time

        combined_text = " ".join(seg["text"] for seg in segments[start_idx:end_idx + 1])

        highlights.append({
            "quote": quote,
            "start": start_time,
            "end": end_time,
            "matched_segment": combined_text
        })

    return highlights


# 🔹 Step 4: Main pipeline function to call from FastAPI or elsewhere
def run_pipeline_and_return_highlights(segments, top_n=3, min_duration=60.0):
    full_transcript = " ".join(seg["text"] for seg in segments)
    print("\n🔍 Asking LLM to find top emotional/viral/story moments...\n")
    llm_output = generate_highlights_from_full_transcript(full_transcript, top_n)
    print("🧠 LLM Response:\n", llm_output)

    highlights = process_llm_highlights(llm_output, segments, min_duration=min_duration)
    return highlights


