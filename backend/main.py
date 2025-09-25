

# This is the backend for my voice sentiment analysis project!
# (FastAPI ML backend. For GitHub readers: see README for setup and usage.)
# It uses FastAPI and takes audio, turns it into text with Whisper, and then checks the sentiment for each line using VaderSentiment.
# It sends back the transcript, overall sentiment, and also the sentiment for each line (with a score).

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import whisper
import tempfile
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = FastAPI()


# Loading the Whisper model (I used 'base' because it's faster, but you can use 'small' or 'large' for better accuracy)
model = whisper.load_model("base")

# Setting up the sentiment analyzer
analyzer = SentimentIntensityAnalyzer()

from fastapi.middleware.cors import CORSMiddleware


# This lets the frontend (React app) talk to this backend without CORS issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],  # My frontend runs here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze-audio/")
async def analyze_audio(file: UploadFile = File(...)):

    # This endpoint gets an audio file, turns it into text, and checks the sentiment for each line
    # Save the uploaded audio to a temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
        temp_audio.write(await file.read())
        temp_audio_path = temp_audio.name
    # Use Whisper to transcribe the audio
    result = model.transcribe(temp_audio_path)
    transcript = result.get('text', '')
    # Split the transcript into lines or sentences
    import re
    lines = [l.strip() for l in re.split(r'[\n\.!?]', transcript) if l.strip()]
    line_results = []
    for line in lines:
        scores = analyzer.polarity_scores(line)
        compound = scores['compound']
        if compound > 0.05:
            label = 'positive'
            desc = 'This line sounds positive and happy.'
        elif compound < -0.05:
            label = 'negative'
            desc = 'This line sounds negative or sad.'
        else:
            label = 'neutral'
            desc = 'This line sounds neutral or objective.'
        line_results.append({
            'text': line,
            'emotion': label,
            'description': desc,
            'compound': compound
        })
    # Get the overall sentiment for the whole transcript
    sentiment = analyzer.polarity_scores(transcript)
    # Delete the temp audio file (cleanup)
    os.remove(temp_audio_path)
    return JSONResponse({
        "transcript": transcript,
        "sentiment": sentiment,
        "lines": line_results
    })


@app.get("/")
def root():

    # Just a simple endpoint to check if the API is running
    return {"message": "Voice Sentiment Analysis API is running."}


@app.post("/analyze-chunk/")
async def analyze_chunk(file: UploadFile = File(...)):
    """
    Endpoint to analyze a short audio chunk and return quick sentiment feedback.
    This is intended for live/chunked recording where the frontend sends small pieces (e.g. 5s).
    """
    # Save uploaded chunk
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
        temp_audio.write(await file.read())
        temp_audio_path = temp_audio.name
    # Transcribe the chunk
    try:
        result = model.transcribe(temp_audio_path)
        transcript = result.get('text', '').strip()
    except Exception:
        transcript = ''
    # Quick sentiment for the chunk
    scores = analyzer.polarity_scores(transcript if transcript else "")
    compound = scores.get('compound', 0.0)
    if compound > 0.05:
        label = 'positive'
    elif compound < -0.05:
        label = 'negative'
    else:
        label = 'neutral'
    # Clean up temp file
    try:
        os.remove(temp_audio_path)
    except Exception:
        pass
    return JSONResponse({
        'transcript': transcript,
        'sentiment': scores,
        'compound': compound,
        'label': label
    })
