import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';
import CreateLobbyPage from './pages/CreateLobbyPage';
import JoinLobbyPage from './pages/JoinLobbyPage';
import WaitlistPage from './pages/WaitlistPage';
import PlayerPage from './pages/PlayerPage';
import EndGamePage from './pages/EndGamePage';
import SpectateGamePage from './pages/SpectateGamePage';
import SpectatorLobbyListPage from './pages/SpectatorLobbyListPage';
import { WebSocketProvider } from './WebSocketContext';

function App() {
  // Early audio initialization for mobile devices
  useEffect(() => {
    const initAudio = () => {
      if (typeof window !== 'undefined') {
        try {
          // Create and immediately close an audio context
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const ctx = new AudioContext();
          
          // Create and start a silent sound
          const oscillator = ctx.createOscillator();
          oscillator.frequency.setValueAtTime(0.001, ctx.currentTime);
          oscillator.connect(ctx.destination);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.001);
        } catch (e) {
          console.error("Audio initialization failed:", e);
        }
      }
    };
    
    // Run on any user interaction
    const initOnInteraction = () => {
      window.removeEventListener('touchstart', initOnInteraction);
      window.removeEventListener('mousedown', initOnInteraction);
      initAudio();
    };
    
    window.addEventListener('touchstart', initOnInteraction, { once: true });
    window.addEventListener('mousedown', initOnInteraction, { once: true });
    
    return () => {
      window.removeEventListener('touchstart', initOnInteraction);
      window.removeEventListener('mousedown', initOnInteraction);
    };
  }, []);

  return (
    <WebSocketProvider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-white">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/lobby/create" element={<CreateLobbyPage />} />
            <Route path="/lobby/join" element={<JoinLobbyPage />} />
            <Route path="/lobby/:lobbyId/waitlist" element={<WaitlistPage />} />
            <Route path="/game/:gameId" element={<PlayerPage />} />
            <Route path="/game/:gameId/end" element={<EndGamePage />} />
            <Route path="/spectate" element={<SpectatorLobbyListPage />} />
            <Route path="/spectate/:lobbyId" element={<SpectateGamePage />} />
          </Routes>
        </div>
      </Router>
    </WebSocketProvider>
  );
}

export default App;