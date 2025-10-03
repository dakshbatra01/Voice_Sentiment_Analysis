
// This is the main App component. I made it to show the header, my main sentiment app, and a footer. I wanted to keep things simple and easy to understand.
import React from 'react';
import AudioSentimentApp from './AudioSentimentApp';

function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #f9f9f9 100%)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        width: '100%',
        background: '#1976d2',
        color: '#fff',
        padding: '18px 0',
        boxShadow: '0 2px 8px #0002',
        textAlign: 'center',
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: 1
      }}>
        Voice Sentiment Analysis
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AudioSentimentApp />
      </main>
      <footer style={{
        width: '100%',
        background: '#1976d2',
        color: '#fff',
        textAlign: 'center',
        padding: '12px 0',
        fontSize: '1rem',
        letterSpacing: 0.5,
        marginTop: 32
      }}>
        &copy; {new Date().getFullYear()} Voice Sentiment Analysis | Built with React & FastAPI
      </footer>
    </div>
  );
}

export default App;
