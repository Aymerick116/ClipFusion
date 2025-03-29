from openai import OpenAI
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPEN_AI_API_KEY"))

def generate_hashtags_from_transcript(transcript_json, num_hashtags=5):
    """
    Generates relevant hashtags based on video transcript content.
    
    Args:
        transcript_json (str): JSON string containing transcript data
        num_hashtags (int): Number of hashtags to generate
        
    Returns:
        list: List of hashtag strings (without the # symbol)
    """
    try:
        # Parse transcript JSON
        if isinstance(transcript_json, str):
            transcript_data = json.loads(transcript_json)
        else:
            transcript_data = transcript_json
            
        # Get full text from transcript
        if "text" in transcript_data:
            # If transcript has a single text field
            full_text = transcript_data["text"]
        elif "segments" in transcript_data:
            # If transcript has segments
            segments = transcript_data["segments"]
            full_text = " ".join(seg.get("text", "") for seg in segments)
        else:
            return ["video", "content", "trending", "viral", "fyp"]  # Default hashtags
        
        # Prepare prompt for OpenAI
        prompt = f"""
        Based on the following transcript from a video, generate {num_hashtags} relevant hashtags.
        These hashtags should be:
        1. Relevant to the content and themes discussed
        2. Popular or trending on social media platforms
        3. A mix of specific and general tags
        4. Without the # symbol
        5. Short, catchy, and all lowercase
        
        Format the output as a JSON array of strings.
        
        Transcript:
        ```
        {full_text[:4000]}  # Limit length to avoid token issues
        ```
        """
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200
        )
        
        # Parse response
        content = response.choices[0].message.content.strip()
        
        # Try to parse as JSON first
        try:
            hashtags = json.loads(content)
            if isinstance(hashtags, list):
                return hashtags
        except:
            # If not valid JSON, fallback to text processing
            pass
            
        # Fallback: extract hashtags from text response
        import re
        hashtags = re.findall(r'["\'](#?\w+)["\']', content)
        hashtags = [tag.lower().strip('#') for tag in hashtags]
        
        # Return unique hashtags
        return list(set(hashtags))[:num_hashtags]
        
    except Exception as e:
        print(f"Error generating hashtags: {e}")
        return ["video", "content", "trending", "viral", "fyp"]  # Default hashtags in case of error