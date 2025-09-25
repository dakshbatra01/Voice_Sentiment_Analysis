

# Voice Sentiment Analysis

Hey! This is a project where you can record or upload your voice and instantly see what kind of emotion it has. It's got some cool graphs, and works totally offline (no paid APIs needed).

## What's Inside?

- **Frontend:** React (Vite, Chart.js)
- **Backend:** Python (FastAPI, Whisper, VaderSentiment), Node.js (Express as a proxy)

## Features (Why it's cool)

- Record or upload audio and get instant sentiment analysis
- See how the emotion changes line by line (not just overall)
- Pie, bar, and line graphs for all the feels
- Live mode: get real-time feedback as you talk
- Super easy to run on your own laptop

## Folder Structure (Where stuff lives)

- `frontend-app/` — The React app (UI, charts, audio stuff)
- `backend/` — Python FastAPI (does the ML/audio), Node.js Express (for uploads and CORS)

## How to Run It (Quick Guide)

### Prereqs
- Node.js (18+ is best)
- Python 3.9+
- ffmpeg (needed for Whisper to work)

### Setup Steps
1. **Clone this repo:**
   ```bash
   git clone https://github.com/dakshbatra01/Voice_Sentiment_Analysis.git
   cd Voice_Sentiment_Analysis
   ```
2. **Install Python backend stuff:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. **Install Node.js backend stuff:**
   ```bash
   npm install
   ```
4. **Install frontend stuff:**
   ```bash
   cd ../frontend-app
   npm install
   ```

### Running Everything
1. **Start the Python backend:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```
2. **Start the Node.js proxy:**
   ```bash
   node index.js
   # or
   npm run start
   ```
3. **Start the frontend:**
   ```bash
   cd ../frontend-app
   npm run dev
   ```
4. Open your browser at [http://localhost:5173](http://localhost:5173)

## How it Works

- The frontend records or uploads audio, sends it to the Node.js proxy.
- Node.js forwards it to the Python backend (which runs Whisper for speech-to-text and Vader for sentiment).
- The backend sends back the transcript and all the emotion data, and the frontend shows it with graphs and badges.



