# 🎬 ClipFusion

**ClipFusion** is an AI-powered video editing platform that automatically turns long-form videos into short, engaging clips optimized for platforms like TikTok. With powerful transcription, AI-based highlight detection, and smart hashtag generation, ClipFusion helps creators repurpose their content in seconds.

---

## 🚀 Features

- 🎥 Upload long videos and extract key highlights automatically  
- 🧠 AI-powered analysis to detect emotional or interesting moments  
- ✂️ Serverless video clipping using AWS ECS and FFmpeg  
- 📝 Transcription using state-of-the-art speech recognition  
- #️⃣ Automatic hashtag generation for videos and clips  
- 📤 Post clips directly to TikTok (with user authorization)  
- 🌐 Full FastAPI backend with PostgreSQL + S3 integration  

---

## 📸 How It Works

1. Upload your video  
2. Transcription and AI highlight detection run automatically  
3. Top moments are clipped using FFmpeg on the cloud  
4. Hashtags are generated for each clip  
5. You can download clips or post them directly to TikTok  

---

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy  
- **Cloud**: AWS ECS, S3, Lambda  
- **AI Services**: OpenAI / Custom LLM Pipelines  
- **Database**: PostgreSQL  
- **Storage**: Amazon S3  
- **Frontend (optional)**: React (not included here)  
- **TikTok Integration**: OAuth 2.0 + Video Upload API  

---
## 🧪 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/clipfusion.git
cd clipfusion
```
---



📄 Legal

Privacy Policy
Terms of Service: https://docs.google.com/document/d/1YrSzmXkCRKTWuB4RE7OlAFb7n-oixtKbypg_13BQMjA/edit?tab=t.0
🤝 Contributing

Pull requests are welcome! If you’d like to contribute to ClipFusion, please fork the repository and submit a PR. For major changes, open an issue first to discuss what you’d like to change.

📬 Contact

Built by Aymerick Osse
Got questions or ideas? Email me at aymerickosse@gmail.com


