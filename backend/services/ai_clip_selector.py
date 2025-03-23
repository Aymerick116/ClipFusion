# from textblob import TextBlob

# def analyze_segments_with_textblob(segments: list, top_n: int = 3) -> list:
#     """
#     Analyze transcript segments using sentiment polarity and return
#     the top-N most emotionally charged segments.

#     Returns:
#         List of [start, end] timestamp pairs.
#     """
#     scored = []
#     for seg in segments:
#         text = seg["text"]
#         sentiment = TextBlob(text).sentiment.polarity
#         score = abs(sentiment)  # Strong emotions: either + or -
#         scored.append({
#             "start": seg["start"],
#             "end": seg["end"],
#             "score": score,
#             "text": text
#         })

#     # Sort by score descending and pick top-N
#     top_segments = sorted(scored, key=lambda x: x["score"], reverse=True)[:top_n]

#     return [[seg["start"], seg["end"]] for seg in top_segments]

from textblob import TextBlob

def analyze_segments_with_textblob(segments: list, top_n: int = 3) -> list:
    """
    Analyze transcript segments using sentiment polarity and return
    top-N most emotionally charged segments (positive or negative).
    """
    scored = []
    for seg in segments:
        text = seg["text"]
        sentiment = TextBlob(text).sentiment.polarity
        score = abs(sentiment)
        scored.append({
            "start": seg["start"],
            "end": seg["end"],
            "text": text,
            "score": score
        })

    top_segments = sorted(scored, key=lambda x: x["score"], reverse=True)[:top_n]
    return top_segments





# results = analyze_segments_with_textblob(segments, top_n=4)

# print("\n🧠 Top Segments with Sentiment:")
# for i, (start, end) in enumerate(results):
#     segment = next(s for s in segments if s["start"] == start and s["end"] == end)
#     polarity = TextBlob(segment["text"]).sentiment.polarity
#     print(f"{i+1}. {segment['text']} → Polarity: {polarity:.2f} | Time: {start:.2f}s–{end:.2f}s")
