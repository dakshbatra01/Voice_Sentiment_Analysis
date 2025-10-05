

# This is the backend for my voice sentiment analysis project! I built it to learn how to connect Python and React.
# I use FastAPI here, and it takes audio, turns it into text with Whisper, and then checks the sentiment for each line using VaderSentiment. I thought it would be cool to see how happy or sad my speech is.
# It sends back the transcript, overall sentiment, and also the sentiment for each line (with a score). I wanted to see all the details!

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import whisper
import tempfile
from dotenv import load_dotenv
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = FastAPI()
load_dotenv()  # Load environment variables from a .env file
App_url = os.getenv("APP_URL")

# Print environment variables for debugging
print("Environment variables loaded:")
print(f"- Frontend URL: {App_url}")
# Loading the Whisper model. I picked 'base' because it's faster, but you can use 'small' or 'large' for better accuracy if you want.
model = whisper.load_model("base")

# Setting up the sentiment analyzer. I use VaderSentiment because it's easy and works well for simple projects like mine.
analyzer = SentimentIntensityAnalyzer()

from fastapi.middleware.cors import CORSMiddleware


# This part lets my frontend (React app) talk to this backend without CORS issues. I had to add this or else my browser would block the requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[App_url] if App_url else ["http://localhost:5173"],  # My frontend runs here. I set this so it matches where I run React.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze-audio/")
async def analyze_audio(file: UploadFile = File(...)):

    # This endpoint gets an audio file, turns it into text, and checks the sentiment for each line. I wanted to see how my speech sounds, line by line.
    # I save the uploaded audio to a temp file here. It's just easier for Whisper to read from a file.
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
        temp_audio.write(await file.read())
        temp_audio_path = temp_audio.name
    # I use Whisper to transcribe the audio here. It's really good at turning speech into text.
    result = model.transcribe(temp_audio_path)
    transcript = result.get('text', '')
    # I split the transcript into lines or sentences so I can check the sentiment for each part separately.
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
    # I get the overall sentiment for the whole transcript here. This tells me if my speech is mostly positive, negative, or neutral.
    sentiment = analyzer.polarity_scores(transcript)
    # I delete the temp audio file here to clean up. Otherwise, my disk gets messy.
    os.remove(temp_audio_path)
    return JSONResponse({
        "transcript": transcript,
        "sentiment": sentiment,
        "lines": line_results
    })


@app.get("/")
def root():

    # This is just a simple endpoint to check if the API is running. I use it to make sure my backend is working.
    return {"message": "Voice Sentiment Analysis API is running."}


@app.post("/analyze-chunk/")
async def analyze_chunk(file: UploadFile = File(...)):
    """
    Endpoint to analyze a short audio chunk and return quick sentiment feedback.
    This is intended for live/chunked recording where the frontend sends small pieces (e.g. 5s).
    """
    # I save the uploaded chunk here. This is for live feedback, so I get small pieces of audio.
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
        temp_audio.write(await file.read())
        temp_audio_path = temp_audio.name
    # I transcribe the chunk here. It's just like the main endpoint, but for short audio.
    try:
        result = model.transcribe(temp_audio_path)
        transcript = result.get('text', '').strip()
    except Exception:
        transcript = ''
    # I get quick sentiment for the chunk here. This way, I can see feedback while I'm talking.
    scores = analyzer.polarity_scores(transcript if transcript else "")
    compound = scores.get('compound', 0.0)
    if compound > 0.05:
        label = 'positive'
    elif compound < -0.05:
        label = 'negative'
    else:
        label = 'neutral'
    # I clean up the temp file here. I don't want to leave junk on my computer.
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
