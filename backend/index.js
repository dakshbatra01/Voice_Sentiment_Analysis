
// This is my Node.js backend for the voice sentiment project!
// It just takes audio from the frontend and sends it to the Python backend for the real processing.
// Also handles CORS and file uploads.

const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

const app = express();
const upload = multer({ dest: 'uploads/' });


// Letting my React frontend talk to this backend (CORS stuff)
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173', // My frontend runs here
  credentials: true
}));


// Just a simple endpoint to check if this backend is running
app.get('/', (req, res) => {
  res.json({ message: 'Node.js backend for Voice Sentiment Analysis is running.' });
});


// This endpoint gets the audio file from the frontend and sends it to the Python backend
app.post('/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // multer gives us a path relative to process cwd; resolve it to an absolute path
    const audioPath = path.resolve(req.file.path);
    // Send the audio to the FastAPI backend
    const pythonApiUrl = 'http://localhost:8000/analyze-audio/';
    const fs = require('fs');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath));
    const response = await axios.post(pythonApiUrl, form, {
      headers: form.getHeaders(),
    });
    // Delete the uploaded file after we're done
    fs.unlinkSync(audioPath);
    res.json(response.data);
  } catch (error) {
    console.error('analyze-audio error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
});


// Forward small audio chunks to the Python backend for quick analysis (used for live feedback)
app.post('/forward-chunk', upload.single('chunk'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No chunk uploaded' });
    const audioPath = path.resolve(req.file.path);
    const pythonApiUrl = 'http://localhost:8000/analyze-chunk/';
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


// Start the server (runs on port 3001 by default)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Node.js backend listening on port ${PORT}`);
});
