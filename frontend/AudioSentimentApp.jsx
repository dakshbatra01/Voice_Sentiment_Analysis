import React, { useState } from 'react';
import axios from 'axios';
// For recording audio
import { ReactMic } from 'react-mic';

function AudioSentimentApp() {
  const [record, setRecord] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle recording
  const onStop = (recordedBlob) => {
    setAudioBlob(recordedBlob.blob);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Send audio to backend
  const analyzeAudio = async (audio) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('audio', audio);
    try {
      const res = await axios.post('http://localhost:3001/analyze-audio', formData);
      setResult(res.data);
    } catch (err) {
      alert('Error analyzing audio');
    }
    setLoading(false);
  };

  // Visualization (basic)
  const renderSentiment = () => {
    if (!result) return null;
    // If timestamped sentiments are available
    if (result.segments) {
      return (
        <div>
          <h3>Timestamped Sentiment</h3>
          <ul>
            {result.segments.map((seg, idx) => (
              <li key={idx}>
                [{seg.start}s - {seg.end}s]: {seg.sentiment.label} ({seg.sentiment.score})
              </li>
            ))}
          </ul>
        </div>
      );
    }
    // Otherwise, show overall
    return (
      <div>
        <h3>Transcript</h3>
        <p>{result.transcript}</p>
        <h3>Sentiment</h3>
        <pre>{JSON.stringify(result.sentiment, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>Get real-time sentiment analysis</h2>
      <div>
        <h4>Record Audio</h4>
        <ReactMic
          record={record}
          className="sound-wave"
          onStop={onStop}
          strokeColor="#000000"
          backgroundColor="#FF4081"
        />
        <button onClick={() => setRecord(true)}>Start</button>
        <button onClick={() => setRecord(false)}>Stop</button>
        {audioBlob && (
          <button onClick={() => analyzeAudio(audioBlob)}>Analyze Recording</button>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        <h4>Upload Audio File</h4>
        <input type="file" accept="audio/*" onChange={handleFileChange} />
        {file && (
          <button onClick={() => analyzeAudio(file)}>Analyze File</button>
        )}
      </div>
      <div style={{ marginTop: 30 }}>
        {loading ? <p>Analyzing...</p> : renderSentiment()}
      </div>
    </div>
  );
}

export default AudioSentimentApp;
