//Marco Pretorius (2024442606)
//JJ Kleynhans (2024158442)

import React, { useEffect, useRef } from 'react'; // NEW: Added useRef for more robust sound handling.
import { Crown, Play, ShieldX, Clipboard, CheckCircle2, XCircle } from 'lucide-react';
import Button from '../components/Button';

/**
 * The waitlist view specifically for the host of the lobby.
 * Shows lobby code, player list, ready status, and handles game start countdown.
 */
// Main component for host's waitlist page in the lobby
const HostWaitlistPage = ({ lobbyId, players, allPlayersReady, isStarting, countdown, onStart, onCancel }) => {
  

  // Ref to hold the countdown sound Audio object
  const countdownSoundRef = useRef(null);
  // Ref to track if countdown sound has played for current sequence
  const countdownPlayed = useRef(false);

  // NEW: This effect runs only once when the component mounts to create the audio object.

  // Create the countdown sound Audio object on mount, clean up on unmount
  useEffect(() => {
    countdownSoundRef.current = new Audio('/sounds/Countdown.mp3');
    return () => {
      if (countdownSoundRef.current) {
        countdownSoundRef.current.pause();
        countdownSoundRef.current = null;
      }
    };
  }, []);
  
  // This useEffect block handles playing the sound when the 'isStarting' prop changes.

  // Play countdown sound when game is starting, only once per countdown
  useEffect(() => {
    if (isStarting && !countdownPlayed.current) {
      if (countdownSoundRef.current) {
        countdownSoundRef.current.volume = 0.7;
        countdownSoundRef.current.currentTime = 0;
        countdownSoundRef.current.play().catch(error => console.error("Error playing sound:", error));
        countdownPlayed.current = true;
      }
    } else if (!isStarting) {
      countdownPlayed.current = false;
    }
  }, [isStarting]);


  // Copy lobby code to clipboard and show alert
  const copyLobbyCode = () => {
    navigator.clipboard.writeText(lobbyId.toUpperCase());
    alert(`Lobby Code "${lobbyId.toUpperCase()}" copied to clipboard!`);
  };

  // If game is starting, show countdown UI and cancel button
  if (isStarting) {
    return (
      <div className="text-center">
        <div className="relative mx-auto h-32 w-32">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle className="stroke-current text-gray-700" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent"></circle>
            <circle
              className="stroke-current text-indigo-500 transition-all duration-1000 linear"
              strokeWidth="10"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (countdown / 3) * 251.2}
              strokeLinecap="round"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              transform="rotate(-90 50 50)"
            ></circle>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold">{countdown}</div>
        </div>
        <h3 className="mt-4 text-2xl font-bold">Game Starting...</h3>
        <div className="mx-auto mt-6 max-w-xs">
          <Button onClick={onCancel} className="flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800">
            <ShieldX size={20} />
            <span>Cancel</span>
          </Button>
        </div>
      </div>
    );
  }

  // Render the host waitlist page UI
  return (
    <>
  {/* Lobby code display and copy button */}
  <div className="mb-6 text-center">
        <label className="text-sm text-gray-400">Share this code with your friends</label>
        <div className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-gray-700 p-3" onClick={copyLobbyCode}>
          <span className="text-2xl font-bold tracking-widest text-indigo-400">{lobbyId.toUpperCase()}</span>
          <Clipboard size={20} className="text-gray-400" />
        </div>
      </div>
  {/* Player list with ready status */}
  <div className="space-y-3 rounded-lg bg-gray-800 p-4">
        {players.map(player => (
          <div key={player.id} className="flex items-center justify-between rounded-md bg-white/5 p-3">
            <div className="flex items-center gap-3">
              {player.isHost && <Crown size={20} className="text-yellow-400" />}
              <span className="font-semibold">{player.name}</span>
            </div>
            <span className={`flex items-center gap-2 text-sm ${player.isReady ? 'text-green-400' : 'text-red-400'}`}>
              {player.isReady ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {player.isReady ? 'Ready' : 'Not Ready'}
            </span>
          </div>
        ))}
      </div>
  {/* Start game button, enabled only if all players are ready */}
  <div className="mt-6">
        <Button onClick={onStart} disabled={!allPlayersReady} className="flex items-center justify-center gap-2">
          <Play size={20} />
          <span>{allPlayersReady ? 'Start Game' : 'Waiting for Players...'}</span>
        </Button>
      </div>
    </>
  );
};

export default HostWaitlistPage;