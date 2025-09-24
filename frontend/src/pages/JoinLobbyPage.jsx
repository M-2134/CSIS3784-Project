//Marco Pretorius (2024442606)
//JJ Kleynhans (2024158442)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundDecorations from "../components/BackgroundDecorations"
import  Button  from '../components/Button';
import  Input  from '../components/Input';
import { ClassSelector } from '../components/ClassSelector';
import {ArrowLeft, Hash, LogIn, User, Zap, Gamepad2  } from 'lucide-react';
import { useWebSocket } from '../WebSocketContext';

/**
 * Page for joining a lobby, now with class selection.
 * Allows user to enter lobby code, username, and select class.
 */
// Main component for joining a game lobby
const JoinLobbyPage = () => {

  // State variables for form fields and UI
  const [lobbyCode, setLobbyCode] = useState(''); // Lobby code input
  const [username, setUsername] = useState(''); // Username input
  const [selectedClass, setSelectedClass] = useState('Pistol'); // Player class selection
  const navigate = useNavigate(); // React Router navigation
  const [isLoading, setIsLoading] = useState(false); // Loading state for join button
  const { sendMessage, lastMessage, wsStatus, ws } = useWebSocket(); // WebSocket context

  // Listen for backend responses to join lobby and handle navigation/errors
  React.useEffect(() => {
    if (!lastMessage) return;
    try {
      const msg = JSON.parse(lastMessage);
      console.log("JoinLobbyPage received message:", msg);
      
      if (msg.type === 'lobby_joined') {
        setIsLoading(false);
        console.log("Successfully joined lobby, navigating to waitlist");
        
        // Store username in localStorage for the waitlist page
        localStorage.setItem('currentUsername', username.trim());
        
        // Use the code from the message, or fallback to the entered code
        const code = msg.code || lobbyCode.trim().toUpperCase();
        
        // Small delay to ensure backend state is ready
        setTimeout(() => {
          navigate(`/lobby/${code}/waitlist`);
        }, 500);
      } else if (msg.type === 'lobby_error') {
        setIsLoading(false);
        console.error("Join lobby error:", msg.message);
        alert(msg.message || 'Failed to join lobby.');
      }
    } catch (e) {
       console.error("Error parsing message in JoinLobbyPage:", e);
       setIsLoading(false)
    }
  }, [lastMessage, navigate, lobbyCode, username]);

  // Handle join lobby button click
  const handleJoinByCode = () => {
    if (!lobbyCode.trim() || !username.trim()) {
      alert('Please enter your username and a lobby code.');
      return;
    }

    // Check WebSocket connection status
    if (wsStatus !== 'open') {
      alert('Connection not ready. Please wait for connection to establish.');
      return;
    }

    // Make sure we have a userId
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('Connection not properly established. Please refresh and try again.');
      return;
    }

    setIsLoading(true)

    // Store username immediately in localStorage
    localStorage.setItem('currentUsername', username.trim());

    const joinData = {
      type: 'join_lobby',
      code: lobbyCode.trim().toUpperCase(),
      username: username.trim(),
      class: selectedClass.toLowerCase(), // Use 'class' and lowercase for backend
      role: 'player'
    };
    localStorage.setItem('playerClass', selectedClass.toLowerCase());
    console.log("Joining Lobby with data:", joinData);
    sendMessage(joinData);
    
    // Add timeout fallback in case we don't get a response
    setTimeout(() => {
      if (isLoading) {
        console.warn("Join lobby timeout, but will continue to navigation");
        setIsLoading(false);
        // Navigate anyway as sometimes the WebSocket message is missed
        navigate(`/lobby/${lobbyCode.trim().toUpperCase()}/waitlist`);
      }
    }, 5000);
  };

  // Render the join lobby page UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f051d] via-[#1f152b] to-[#0f051d] relative overflow-hidden">
      <BackgroundDecorations />

  {/* HBlast Header - shows app name and navigation */}
      <header className="flex justify-between items-center py-4 md:py-6 relative z-10 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/lobby")}
            className="text-white hover:text-[#e971ff] transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-white text-xl md:text-2xl font-bold">HBlast</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[#b7b4bb] text-sm md:text-base">Join Lobby</div>
          <div className="w-8 h-8 md:w-10 md:h-10">
            <img src="/images/icon.png" alt="HBlast Score Icon" className="w-full h-full object-contain" />
          </div>
        </div>
      </header>

      <main className="flex flex-grow flex-col items-center justify-center p-4 md:p-6 relative z-10 min-h-[calc(100vh-120px)]">
        <div className="w-full max-w-md">
          {/* Hero Section - title and description */}
          <div className="text-center mb-8 md:mb-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#741ff5] to-[#9351f7] rounded-full flex items-center justify-center">
              <Hash size={32} className="text-white" />
            </div>
            <h1 className="text-white text-3xl md:text-4xl font-bold mb-4">
              <span className="block">Join the</span>
              <span className="block">Battle</span>
            </h1>
            <p className="text-[#b7b4bb] text-base md:text-lg">
              Enter the lobby code and choose your weapon to join the action
            </p>
          </div>

          {/* Join Form - main form for joining a lobby */}
          <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-2xl p-6 md:p-8 border-2 border-[#9351f7]/40 shadow-xl mb-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleJoinByCode()
              }}
              className="space-y-6"
            >
              {/* Username Input - player's username */}
              <div>
                <label className="block text-sm text-[#b7b4bb] mb-2 flex items-center gap-2">
                  <User size={16} className="text-[#e971ff]" />
                  Your Username
                </label>
                <Input
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Lobby Code Input - code for the lobby to join */}
              <div>
                <label className="block text-sm text-[#b7b4bb] mb-2 flex items-center gap-2">
                  <Hash size={16} className="text-[#e971ff]" />
                  Lobby Code
                </label>
                <Input
                  placeholder="ABCDEF"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  className="font-mono text-center text-lg tracking-widest"
                />
                <p className="text-xs text-[#b7b4bb] mt-2">Ask the host for the 6-character lobby code</p>
              </div>

              {/* Class Selector - choose player class */}
              <div>
                <label className="block text-sm text-[#b7b4bb] mb-3 flex items-center gap-2">
                  <Gamepad2 size={16} className="text-[#e971ff]" />
                  Choose Your Class
                </label>
                <ClassSelector selectedClass={selectedClass} onSelectClass={setSelectedClass} />
              </div>

              {/* Join Button - submit form to join lobby */}
              <Button
                type="submit"
                disabled={isLoading || !lobbyCode.trim() || !username.trim() || wsStatus !== 'open'}
                className={`flex items-center justify-center gap-2 ${
                  isLoading || wsStatus !== 'open'
                    ? "bg-gradient-to-r from-[#7b7583] to-[#838383] cursor-not-allowed"
                    : "bg-gradient-to-r from-[#741ff5] to-[#9351f7] hover:from-[#9351f7] hover:to-[#e971ff]"
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>Join Lobby</span>
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Connection Status - shows WebSocket connection state */}
          <div className="bg-gradient-to-r from-[#1f152b] to-[#0f051d] rounded-xl p-3 md:p-4 border border-[#2a3441]/30 flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${wsStatus === "open" ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
            ></div>
            <span className="text-white text-sm font-medium">
              {wsStatus === "open" ? "Connected to Game Network" : "Connecting..."}
            </span>
            {wsStatus === "open" && <Zap size={16} className="text-[#e971ff] ml-auto" />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default JoinLobbyPage;