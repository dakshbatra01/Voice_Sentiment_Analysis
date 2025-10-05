
// This is my Node.js backend for the voice sentiment project! I made this part to learn how to connect React and Python using Node.
// It just takes audio from the frontend and sends it to the Python backend for the real processing. I wanted to see how to forward files between servers.
// Also handles CORS and file uploads. I had to figure out how to let my frontend talk to Node and then Node talk to Python.

const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const app = express();
const upload = multer({ dest: 'uploads/' });


// This part lets my React frontend talk to this backend (CORS stuff). I added this so my browser wouldn't block requests.
const cors = require('cors');
app.use(cors({
  origin: process.env.APP_URL, // My frontend runs here. I set this so it matches where I run React.
  credentials: true
}));

// Log environment variables for debugging
console.log('Environment variables loaded:');
console.log('- Frontend URL:', process.env.APP_URL);
console.log('- Python URL:', process.env.PYTHON_URL);


// This is just a simple endpoint to check if this backend is running. I use it to make sure Node is working.
app.get('/', (req, res) => {
  res.json({ message: 'Node.js backend for Voice Sentiment Analysis is running.' });
});


// This endpoint gets the audio file from the frontend and sends it to the Python backend. I wanted to see how to send files between servers.
app.post('/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // multer gives me a path relative to process cwd; I resolve it to an absolute path so Python can read it.
    const audioPath = path.resolve(req.file.path);
  // I send the audio to the FastAPI backend here. This is where the real analysis happens.
    const pythonApiUrl = `${process.env.PYTHON_URL}/analyze-audio/`;
    const fs = require('fs');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath));
    const response = await axios.post(pythonApiUrl, form, {
      headers: form.getHeaders(),
    });
  // I delete the uploaded file after we're done. Otherwise, my disk gets messy.
    fs.unlinkSync(audioPath);
    res.json(response.data);
  } catch (error) {
    console.error('analyze-audio error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
});


// This endpoint forwards small audio chunks to the Python backend for quick analysis. I use this for live feedback in my app.
app.post('/forward-chunk', upload.single('chunk'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No chunk uploaded' });
    const audioPath = path.resolve(req.file.path);
    const pythonApiUrl = `${process.env.PYTHON_URL}/analyze-chunk/`;
    const fs = require('fs');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath));
    const response = await axios.post(pythonApiUrl, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });
    fs.unlinkSync(audioPath);
    res.json(response.data);
  } catch (error) {
    console.error('forward-chunk error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
});


// This starts the server (runs on port 3001 by default). I picked this port so it doesn't clash with my frontend.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Node.js backend listening on port ${PORT}`);
});
