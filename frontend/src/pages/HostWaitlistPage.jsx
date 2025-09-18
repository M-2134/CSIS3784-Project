import React, { useEffect, useRef } from 'react'; // NEW: Added useRef for more robust sound handling.
import { Crown, Play, ShieldX, Clipboard, CheckCircle2, XCircle } from 'lucide-react';
import Button from '../components/Button';

/**
 * The waitlist view specifically for the host of the lobby.
 */
const HostWaitlistPage = ({ lobbyId, players, allPlayersReady, isStarting, countdown, onStart, onCancel }) => {
  
  // NEW: A ref is used to hold the Audio object. This prevents it from being re-created on every render.
  const countdownSoundRef = useRef(null);
  // NEW: A ref is used as a flag to ensure the sound only plays once per countdown sequence.
  const countdownPlayed = useRef(false);

  // NEW: This effect runs only once when the component mounts to create the audio object.
  useEffect(() => {
    // NEW: The audio path is corrected to '/sounds/Countdown.mp3' for consistency with other components.
    countdownSoundRef.current = new Audio('/sounds/Countdown.mp3');
    
    // NEW: A cleanup function is returned to properly dispose of the audio object when the component is unmounted.
    return () => {
      if (countdownSoundRef.current) {
        countdownSoundRef.current.pause();
        countdownSoundRef.current = null;
      }
    };
  }, []); // NEW: The empty dependency array [] ensures this effect runs only once.
  
  // This useEffect block handles playing the sound when the 'isStarting' prop changes.
  useEffect(() => {
    // NEW: Check if the countdown is starting AND if the sound has not already been played for this sequence.
    if (isStarting && !countdownPlayed.current) {
      // NEW: Ensure the audio object has been loaded before trying to play it.
      if (countdownSoundRef.current) {
        countdownSoundRef.current.volume = 0.7; // Set volume to a reasonable level
        countdownSoundRef.current.currentTime = 0; // NEW: Rewind the sound to the start before playing.
        countdownSoundRef.current.play().catch(error => console.error("Error playing sound:", error));
        // NEW: Set the flag to true to prevent the sound from playing again during this countdown.
        countdownPlayed.current = true;
      }
    } else if (!isStarting) {
      // NEW: If the countdown is cancelled or over, reset the flag for the next game.
      countdownPlayed.current = false;
    }
  }, [isStarting]);

  const copyLobbyCode = () => {
    navigator.clipboard.writeText(lobbyId.toUpperCase());
    alert(`Lobby Code "${lobbyId.toUpperCase()}" copied to clipboard!`);
  };

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

  return (
    <>
      <div className="mb-6 text-center">
        <label className="text-sm text-gray-400">Share this code with your friends</label>
        <div className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-gray-700 p-3" onClick={copyLobbyCode}>
          <span className="text-2xl font-bold tracking-widest text-indigo-400">{lobbyId.toUpperCase()}</span>
          <Clipboard size={20} className="text-gray-400" />
        </div>
      </div>
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