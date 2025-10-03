
// This is basically the main part of my voice sentiment project. I made this to learn how to do real-time audio analysis!
// You can record or upload audio here, and then it goes to my backend. I wanted to see the results with some cool graphs, so I added those too.

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);


// I wrote this function to pick a color for the sentiment badge. I thought green for positive, red for negative, and orange for neutral would look nice.
const badgeColor = (label) => {
  if (label === 'positive') return '#4caf50';
  if (label === 'negative') return '#f44336';
  if (label === 'neutral') return '#ff9800';
  return '#90a4ae';
};

// These are the tab labels for the three sections. I wanted it to be easy to switch between modes.
const TABS = [
  { key: 'normal', label: 'Normal Recording' },
  { key: 'live', label: 'Live Recording' },
  { key: 'upload', label: 'Upload File' }
];

function AudioSentimentApp() {
  const [audioBlob, setAudioBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [file, setFile] = useState(null);
  // I made separate state for each tab so I could keep track of results and loading for each one. It was easier for me to debug this way.
  const [normalResult, setNormalResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [normalLoading, setNormalLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  // This part is for live recording mode. I wanted to see feedback while I was talking, so I added this.
  const [liveRecording, setLiveRecording] = useState(false);
  const [livePoints, setLivePoints] = useState([]); // This is an array of {t, compound, label}. I use it for the live chart.
  const liveRecorderRef = useRef(null);
  const liveChunkIntervalRef = useRef(null);
  // This keeps track of which tab I selected. I thought it would be cool to have tabs for different modes.
  const [selectedTab, setSelectedTab] = useState('normal');

  // This function starts recording audio from my mic (not live mode, just normal recording). I wanted to see how easy it was to record audio in React.
  const startRecording = async () => {
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    let chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/wav' });
      setAudioBlob(blob);
      setAudioURL(URL.createObjectURL(blob));
      stream.getTracks().forEach(track => track.stop());
    };
    setMediaRecorder(recorder);
    recorder.start();
  };

  // This stops the normal recording (not the live one). I needed this so I could analyze the audio after recording.
  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorder) mediaRecorder.stop();
  };

  // This is for live recording! It records 5 second chunks and sends them to the backend. I wanted to get feedback while I was talking, so I made it work like this.
  const startLiveRecording = async () => {
    setLiveRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    let chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.start();
    liveRecorderRef.current = { recorder, stream, chunks };

  // Every 5 seconds, it stops and sends the chunk, then starts again. I did this so I could get live updates while speaking.
    liveChunkIntervalRef.current = setInterval(async () => {
      const r = liveRecorderRef.current;
      if (!r) return;
      r.recorder.stop();
  // When the recorder stops, this runs. I use it to send the chunk to the backend for analysis.
      r.recorder.onstop = async () => {
        const blob = new Blob(r.chunks, { type: 'audio/wav' });
  // I clear out the chunks here so I can start fresh for the next bit. Otherwise, it gets messy.
        r.chunks = [];
  // This is where I actually send the chunk to the backend (Node -> Python). I wanted to see how fast it could analyze my speech.
        const form = new FormData();
        form.append('chunk', blob, 'chunk.wav');
            try {
              const res = await axios.post('http://localhost:3001/forward-chunk', form, { timeout: 20000 });
              const data = res.data;
              const point = { t: new Date().toLocaleTimeString(), compound: data.compound, label: data.label };
              // I only keep the last 20 points so the chart doesn't get too crowded. It looked weird with too many points.
              setLivePoints(prev => {
                const next = [...prev, point];
                if (next.length > 20) next.shift();
                return next;
              });
        } catch (e) {
          // I just ignore errors for now. I should probably handle them better, but I wanted to get the main stuff working first.
        }
  // I start the recorder again for the next chunk here. This way, it keeps looping and I get live feedback.
        r.recorder = new MediaRecorder(r.stream);
        r.recorder.ondataavailable = (e) => { if (e.data.size > 0) r.chunks.push(e.data); };
        r.recorder.start();
      };
    }, 5000);
  };

  const stopLiveRecording = () => {
    setLiveRecording(false);
    const r = liveRecorderRef.current;
    if (r) {
      try { r.recorder.stop(); } catch(e){}
      try { r.stream.getTracks().forEach(t => t.stop()); } catch(e){}
    }
    liveRecorderRef.current = null;
    if (liveChunkIntervalRef.current) {
      clearInterval(liveChunkIntervalRef.current);
      liveChunkIntervalRef.current = null;
    }
  };

  // I made this to pick an emoji and color for the label. I thought it would make the app look more fun and less boring.
  const labelEmoji = (label) => {
    if (label === 'positive') return { emoji: '😄', color: '#4caf50' };
    if (label === 'negative') return { emoji: '😢', color: '#f44336' };
    return { emoji: '😐', color: '#ff9800' };
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // This function sends the audio file to my backend so it can analyze it. I use it for both normal recording and upload mode.
  // The mode is either 'normal' or 'upload'. I use this to know which tab I'm on.
  const analyzeAudio = async (audio, mode = 'normal') => {
    if (mode === 'normal') {
      setNormalLoading(true);
      setNormalResult(null);
    } else {
      setUploadLoading(true);
      setUploadResult(null);
    }
    const formData = new FormData();
    formData.append('audio', audio);
    try {
      const res = await axios.post('http://localhost:3001/analyze-audio', formData);
      if (mode === 'normal') {
        setNormalResult(res.data);
      } else {
        setUploadResult(res.data);
      }
    } catch (err) {
      if (mode === 'normal') {
        setNormalResult({ error: 'Error analyzing audio' });
      } else {
        setUploadResult({ error: 'Error analyzing audio' });
      }
    }
    if (mode === 'normal') {
      setNormalLoading(false);
    } else {
      setUploadLoading(false);
    }
  };

  // This function shows the sentiment results and all the graphs (like pie, bar, and line). I wanted to visualize the data so I could understand it better.
  // I pass in which result to render here. It helps me reuse the function for different tabs.
  const renderSentiment = (result) => {
    if (!result) return null;
  // I just use 'result' as above. I didn't want to repeat myself.
    let pos = 0, neg = 0, neu = 0;
    if (result.lines) {
      result.lines.forEach(line => {
        if (line.emotion === 'positive') pos++;
        else if (line.emotion === 'negative') neg++;
        else neu++;
      });
    }
    const total = (pos + neg + neu) || 1;
    const posPct = Math.round((pos / total) * 100);
    const negPct = Math.round((neg / total) * 100);
    const neuPct = 100 - posPct - negPct;
    if (result.lines) {
      const pieData = {
        labels: ['Positive', 'Neutral', 'Negative'],
        datasets: [
          {
            data: [posPct, neuPct, negPct],
            backgroundColor: [badgeColor('positive'), badgeColor('neutral'), badgeColor('negative')],
            borderWidth: 1,
          },
        ],
      };
      const lineLabels = result.lines.map((_, idx) => `Line ${idx + 1}`);
      const lineData = {
        labels: lineLabels,
        datasets: [
          {
            label: 'Compound Sentiment',
            data: result.lines.map(line => {
              if (line.compound > 0.05) {
                return Math.min(1, line.compound + 0.2);
              } else if (line.compound < -0.05) {
                return Math.max(-1, line.compound - 0.2);
              } else {
                return line.compound;
              }
            }),
            fill: true,
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: result.lines.map(line => badgeColor(line.emotion)),
          },
        ],
      };
      const lineOptions = {
        scales: {
          y: {
            min: -1,
            max: 1,
            ticks: {
              callback: (v) => {
                if (v === 1) return 'Positive';
                if (v === 0) return 'Neutral';
                if (v === -1) return 'Negative';
                return v;
              },
              stepSize: 0.2
            },
            title: { display: true, text: 'Compound Sentiment' }
          },
        },
        plugins: {
          legend: { display: false },
        },
      };
      return (
        <div style={{ marginTop: 24 }}>
          <h3>Overall Emotion Percentages</h3>
          <div style={{ display: 'flex', gap: 32, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 220, height: 220 }}>
              <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom' } } }} />
            </div>
            <div style={{ minWidth: 220, flex: 1 }}>
              <Bar data={pieData} options={{ plugins: { legend: { display: false } }, indexAxis: 'y' }} />
            </div>
          </div>
          <h3>Emotion Variation Throughout Speech</h3>
          <div style={{ width: '100%', maxWidth: 600, margin: '0 auto 32px auto' }}>
            <Line data={lineData} options={lineOptions} />
          </div>
          <h3>Line-by-Line Emotion Analysis</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {result.lines.map((line, idx) => (
              <div key={idx} style={{
                background: '#f5f5f5',
                borderRadius: 8,
                padding: 16,
                marginBottom: 4,
                boxShadow: '0 1px 4px #0001',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{line.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    background: badgeColor(line.emotion),
                    color: '#fff',
                    borderRadius: 12,
                    padding: '4px 12px',
                    fontWeight: 600
                  }}>{line.emotion.toUpperCase()}</span>
                  <span style={{ color: '#555', fontSize: '1em' }}>{line.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  // If there are no lines, I just show the transcript and the overall sentiment. I skip the fancy graphs in that case.
    return (
      <div style={{ marginTop: 24 }}>
        <h3>Transcript</h3>
        <div style={{
          background: '#f5f5f5',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          boxShadow: '0 1px 4px #0001'
        }}>{result.transcript}</div>
        <h3>Sentiment</h3>
        <span style={{
          background: badgeColor(result.sentiment.compound > 0.05 ? 'positive' : result.sentiment.compound < -0.05 ? 'negative' : 'neutral'),
          color: '#fff',
          borderRadius: 12,
          padding: '4px 12px',
          fontWeight: 600
        }}>
          {result.sentiment.compound > 0.05 ? 'POSITIVE' : result.sentiment.compound < -0.05 ? 'NEGATIVE' : 'NEUTRAL'}
        </span>
        <pre style={{ marginTop: 8, background: '#ececec', borderRadius: 6, padding: 8 }}>{JSON.stringify(result.sentiment, null, 2)}</pre>
      </div>
    );
  };

  // This is the main UI. You can record or upload audio, and then see the results with all the graphs I added.
  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #0002' }}>
      <h1 style={{ textAlign: 'center', color: '#1976d2', marginBottom: 32 }}>Get real-time sentiment analysis</h1>

  {/* This is the tabbed section selector. I thought tabs would make it easier to switch between modes. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, margin: '32px 0 24px 0' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            style={{
              flex: 1,
              padding: '16px 0',
              border: 'none',
              borderTopLeftRadius: tab.key === 'normal' ? 12 : 0,
              borderTopRightRadius: tab.key === 'upload' ? 12 : 0,
              background: selectedTab === tab.key ? (tab.key === 'normal' ? '#1976d2' : tab.key === 'live' ? '#ff9800' : '#388e3c') : '#e0e0e0',
              color: selectedTab === tab.key ? '#fff' : '#444',
              fontWeight: 700,
              fontSize: 18,
              cursor: selectedTab === tab.key ? 'default' : 'pointer',
              transition: 'background 0.2s',
              outline: 'none',
              boxShadow: selectedTab === tab.key ? '0 2px 8px #0002' : 'none',
              borderBottom: selectedTab === tab.key ? 'none' : '2px solid #bdbdbd'
            }}
            disabled={selectedTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {selectedTab === 'normal' && (
          <div style={{
            background: '#f5f7fa',
            borderRadius: '0 0 12px 12px',
            padding: 24,
            boxShadow: '0 1px 8px #0001',
            marginBottom: 32
          }}>
            <h2 style={{ color: '#1976d2', marginBottom: 16 }}>Normal Recording</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <button onClick={startRecording} disabled={recording} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: recording ? '#bdbdbd' : '#1976d2', color: '#fff', fontWeight: 600 }}>Start</button>
              <button onClick={stopRecording} disabled={!recording} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: recording ? '#f44336' : '#bdbdbd', color: '#fff', fontWeight: 600 }}>Stop</button>
            </div>
            {audioURL && (
              <div style={{ marginTop: 12 }}>
                <audio src={audioURL} controls style={{ width: '100%' }} />
              </div>
            )}
            {audioBlob && (
              <button onClick={() => analyzeAudio(audioBlob, 'normal')} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#388e3c', color: '#fff', fontWeight: 600 }}>Analyze Recording</button>
            )}
            <div style={{ marginTop: 24 }}>
              {normalLoading ? <p style={{ textAlign: 'center', color: '#1976d2', fontWeight: 600 }}>Analyzing...</p> : renderSentiment(normalResult)}
            </div>
          </div>
        )}
        {selectedTab === 'live' && (
          <div style={{
            background: '#fffbe7',
            borderRadius: '0 0 12px 12px',
            padding: 24,
            boxShadow: '0 1px 8px #0001',
            marginBottom: 32
          }}>
            <h2 style={{ color: '#ff9800', marginBottom: 16 }}>Live Recording (Real-Time Feedback)</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
              <button onClick={startLiveRecording} disabled={liveRecording} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: liveRecording ? '#bdbdbd' : '#ff9800', color: '#fff', fontWeight: 600 }}>Start Live</button>
              <button onClick={stopLiveRecording} disabled={!liveRecording} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: liveRecording ? '#d32f2f' : '#bdbdbd', color: '#fff', fontWeight: 600 }}>Stop Live</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <h3>Live Feedback</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 180, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 8, boxShadow: '0 1px 6px #0001' }}>
                  {livePoints.length === 0 ? (
                    <div style={{ color: '#777' }}>No data yet</div>
                  ) : (
                    (() => {
                      const last = livePoints[livePoints.length - 1];
                      const info = labelEmoji(last.label);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 36 }}>{info.emoji}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 700 }}>{last.label.toUpperCase()}</div>
                            <div style={{ color: '#666', fontSize: 12 }}>score: {Math.max(Math.min((Number(last.compound) + (last.compound > 0 ? 0.2 : -0.2)), 1), -1).toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
                <div style={{ flex: 2, minWidth: 420, minHeight: 340, maxWidth: 1000 }}>
                  {livePoints.length > 0 && (
                    <Line
                      data={{
                        labels: livePoints.map(p => p.t),
                        datasets: [
                          {
                            label: 'Live Compound',
                            data: livePoints.map(p => {
                              if (p.compound > 0.05) return Math.min(1, p.compound + 0.2);
                              if (p.compound < -0.05) return Math.max(-1, p.compound - 0.2);
                              return p.compound;
                            }),
                            borderColor: '#1976d2',
                            backgroundColor: 'rgba(25,118,210,0.1)',
                            tension: 0.25,
                            pointRadius: 4,
                            fill: true
                          }
                        ]
                      }}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        scales: { y: { min: -1, max: 1 } },
                        plugins: { legend: { display: false } },
                        elements: { point: { radius: 3 } }
                      }}
                      height={340}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedTab === 'upload' && (
          <div style={{
            background: '#e3f2fd',
            borderRadius: '0 0 12px 12px',
            padding: 24,
            boxShadow: '0 1px 8px #0001',
            marginBottom: 32
          }}>
            <h2 style={{ color: '#1976d2', marginBottom: 16 }}>Upload Audio File</h2>
            <input type="file" accept="audio/*" onChange={handleFileChange} style={{ marginBottom: 8 }} />
            {file && (
              <button onClick={() => analyzeAudio(file, 'upload')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#388e3c', color: '#fff', fontWeight: 600 }}>Analyze File</button>
            )}
            <div style={{ marginTop: 24 }}>
              {uploadLoading ? <p style={{ textAlign: 'center', color: '#1976d2', fontWeight: 600 }}>Analyzing...</p> : renderSentiment(uploadResult)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AudioSentimentApp;
