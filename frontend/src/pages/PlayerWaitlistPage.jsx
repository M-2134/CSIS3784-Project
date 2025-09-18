import React, { useState, useEffect, useRef } from 'react'; // NEW: Added useRef for robust sound handling.
import {  Crown, CheckCircle2, XCircle, Pencil, Target, Shield, Crosshair, Users, Clock, Zap } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import PlayerScan from '../components/PlayerScan';
import { useWebSocket } from '../WebSocketContext';

/**
 * The waitlist view specifically for a non-host player.
 */
const PlayerWaitlistPage = ({ players, currentUser, lobbyCode, isStarting, countdown, onReadyToggle, onNameChange }) => {
  const { sendMessage, lastMessage, wsStatus } = useWebSocket();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInputValue, setNameInputValue] = useState('');
  const [isFaceScanComplete, setIsFaceScanComplete] = useState(false);
  // 120s countdown clock state
  const [autoCountdown, setAutoCountdown] = useState(120);
  const [autoCountdownActive, setAutoCountdownActive] = useState(true);
  // Track if we should show the scan face warning
  const [showScanFaceWarning, setShowScanFaceWarning] = useState(false);

  // Get weapon info for display
  const getWeaponInfo = (weaponClass) => {
    switch (weaponClass?.toLowerCase()) {
      case "pistol":
        return {
          name: "Pistol",
          icon: <Target size={16} className="text-blue-400" />,
          color: "text-blue-400",
          bgColor: "bg-blue-400/20",
          borderColor: "border-blue-400/40",
        }
      case "shotgun":
        return {
          name: "Shotgun",
          icon: <Shield size={16} className="text-red-400" />,
          color: "text-red-400",
          bgColor: "bg-red-400/20",
          borderColor: "border-red-400/40",
        }
      case "archer":
        return {
          name: "Bow",
          icon: <Crosshair size={16} className="text-green-400" />,
          color: "text-green-400",
          bgColor: "bg-green-400/20",
          borderColor: "border-green-400/40",
        }
      default:
        return {
          name: "Unknown",
          icon: <Target size={16} className="text-gray-400" />,
          color: "text-gray-400",
          bgColor: "bg-gray-400/20",
          borderColor: "border-gray-400/40",
        }
    }
  }

  // Modified countdown effect - only count down when user is NOT ready and face scan is complete
  useEffect(() => {
    if (!autoCountdownActive || !currentUser) return;
    
    // If user is ready, pause the countdown
    if (currentUser.isReady) {
      return;
    }
    
    // Only count down if user is not ready
    if (autoCountdown > 0) {
      const timer = setTimeout(() => setAutoCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (autoCountdown === 0 && autoCountdownActive && !currentUser.isReady) {
      // Only auto-ready if face is scanned and user is not already ready
      if (players && players.length > 0 && currentUser && lobbyCode) {
        if (isFaceScanComplete) {
          sendMessage({ type: 'set_ready', code: lobbyCode, ready: true });
          setShowScanFaceWarning(false);
        } else {
          setShowScanFaceWarning(true);
        }
      }
      setAutoCountdownActive(false);
    }
  }, [autoCountdown, autoCountdownActive, players, currentUser, lobbyCode, sendMessage, isFaceScanComplete]);

  // If countdown reached 0 and face scan completes after, auto-ready
  useEffect(() => {
    if (
      autoCountdown === 0 &&
      !autoCountdownActive &&
      showScanFaceWarning &&
      isFaceScanComplete &&
      players && players.length > 0 && currentUser && lobbyCode &&
      !currentUser.isReady // Only auto-ready if not already ready
    ) {
      sendMessage({ type: 'set_ready', code: lobbyCode, ready: true });
      setShowScanFaceWarning(false);
    }
  }, [isFaceScanComplete, autoCountdown, autoCountdownActive, showScanFaceWarning, players, currentUser, lobbyCode, sendMessage]);

  // Track ready state changes and restart countdown when going from ready to not ready
  const prevIsReadyRef = useRef(currentUser?.isReady);
  useEffect(() => {
    if (!currentUser) return;
    
    const wasReady = prevIsReadyRef.current;
    const isNowReady = currentUser.isReady;
    
    // If player went from ready to not ready, restart the countdown
    if (wasReady && !isNowReady) {
      console.log("Player went from ready to not ready, restarting countdown");
      setAutoCountdown(120);
      setAutoCountdownActive(true);
      setShowScanFaceWarning(false);
    }
    // If player went from not ready to ready, stop the countdown completely
    else if (!wasReady && isNowReady) {
      console.log("Player went from not ready to ready, stopping countdown");
      setAutoCountdownActive(false);
      setShowScanFaceWarning(false);
    }
    
    prevIsReadyRef.current = isNowReady;
  }, [currentUser?.isReady]);

  // Reset countdown when face scan is completed/reset
  useEffect(() => {
    // If face scan is reset (goes from complete to incomplete), restart countdown
    if (!isFaceScanComplete && currentUser && !currentUser.isReady) {
      setAutoCountdown(120);
      setAutoCountdownActive(true);
      setShowScanFaceWarning(false);
    }
  }, [isFaceScanComplete, currentUser]);

  // NEW: A ref to hold the Audio object, preventing it from being re-created on every render.
  const countdownSoundRef = useRef(null);
  // NEW: A ref that acts as a flag to ensure the sound plays only once per countdown.
  const countdownPlayed = useRef(false);
  // Ready sound effect
  const readySoundRef = useRef(null);
  // Track if ready sound has been played for this ready event
  const readyPlayedRef = useRef(false);

  useEffect(() => {
    if (currentUser) {
      // Get stored username for consistency
      const storedUsername = localStorage.getItem('currentUsername');
      setNameInputValue(storedUsername || currentUser.name);

      // Check if face scan is already complete for this user in this session
      try {
        const sessionKey = `playerFaces_${lobbyCode}`;
        const playerFaces = JSON.parse(localStorage.getItem(sessionKey) || '{}');
        const userId = localStorage.getItem('userId');
        if (userId && playerFaces[userId]) {
          setIsFaceScanComplete(true);
          console.log(`Face scan already complete for user ${currentUser.name} in session ${lobbyCode}`);
        }
      } catch (e) {
        console.error("Error checking face scan status:", e);
      }
    }
  }, [currentUser, lobbyCode]);

  // NEW: This effect hook runs only once on mount to create the audio objects.
  useEffect(() => {
    countdownSoundRef.current = new Audio('/sounds/Countdown.mp3');
    readySoundRef.current = new Audio('/sounds/Ready.mp3');
    // Cleanup
    return () => {
      if (countdownSoundRef.current) {
        countdownSoundRef.current.pause();
        countdownSoundRef.current = null;
      }
      if (readySoundRef.current) {
        readySoundRef.current.pause();
        readySoundRef.current = null;
      }
    };
  }, []);
  // Play Ready.mp3 when player status changes to ready
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.isReady && !readyPlayedRef.current) {
      if (readySoundRef.current) {
        readySoundRef.current.volume = 0.7;
        readySoundRef.current.currentTime = 0;
        readySoundRef.current.play().catch(() => {});
      }
      readyPlayedRef.current = true;
    } else if (!currentUser.isReady) {
      readyPlayedRef.current = false;
    }
  }, [currentUser?.isReady]);

  // This useEffect block handles playing the sound when the 'isStarting' prop changes.
  useEffect(() => {
    // NEW: Check if the countdown is starting AND if the sound has not already been played for this sequence.
    if (isStarting && !countdownPlayed.current) {
      // NEW: Check that the audio object has been loaded before attempting to play it.
      if (countdownSoundRef.current) {
        countdownSoundRef.current.volume = 0.7; // Set volume to a reasonable level
        countdownSoundRef.current.currentTime = 0; // NEW: Rewind the sound to the start.
        countdownSoundRef.current.play().catch(error => console.error("Error playing sound:", error));
        // NEW: Set the flag to true to prevent the sound from playing again during this countdown.
        countdownPlayed.current = true;
      }
    } else if (!isStarting) {
      // NEW: If the countdown is over or cancelled, reset the flag for the next game.
      countdownPlayed.current = false;
    }
  }, [isStarting]);

  const handleEditName = () => {
    if (currentUser) { // Ensure currentUser exists before setting input value
      // Use stored username for consistency
      const storedUsername = localStorage.getItem('currentUsername');
      setNameInputValue(storedUsername || currentUser.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (nameInputValue.trim() !== '') {
      // Store the new username immediately in localStorage
      localStorage.setItem('currentUsername', nameInputValue.trim());
      onNameChange(nameInputValue.trim());
      setIsEditingName(false);
    }
  };
  
  // Enhanced function to handle ready toggle with WebSocket - Fixed for host
  const handleReadyToggle = () => {
    if (!currentUser || !lobbyCode) {
      console.log("PlayerWaitlistPage: Cannot toggle ready - missing currentUser or lobbyCode");
      console.log("currentUser:", currentUser);
      console.log("lobbyCode:", lobbyCode);
      return;
    }

    // Get the actual userId from localStorage to ensure we're using the correct ID
    const storedUserId = localStorage.getItem('userId');
    const userIdToUse = storedUserId || currentUser.id;
    
    console.log("PlayerWaitlistPage: Toggling ready state");
    console.log("- User ID:", userIdToUse);
    console.log("- Current ready state:", currentUser.isReady);
    console.log("- Is host:", currentUser.isHost);
    console.log("- Lobby code:", lobbyCode);
    
    // Send WebSocket message with explicit user identification
    const readyMessage = {
      type: 'set_ready', 
      code: lobbyCode,
      userId: userIdToUse, // Explicitly include userId
      ready: !currentUser.isReady
    };
    
    console.log("Sending ready message:", readyMessage);
    sendMessage(readyMessage);

    // Also try the fallback method in case WebSocket has issues
    if (onReadyToggle && typeof onReadyToggle === 'function') {
      console.log("Also calling fallback onReadyToggle");
      onReadyToggle();
    }
  };

  // Handle face scan completion
  const handleFaceScanComplete = () => {
    setIsFaceScanComplete(true);
    console.log("Face scan completed");
  };

  // Handle face scan reset (when rescanning)
  const handleFaceScanReset = () => {
    setIsFaceScanComplete(false);
    console.log("Face scan reset - starting rescan");
    
    // If user was ready, unready them when they rescan
    if (currentUser && currentUser.isReady) {
      console.log("User was ready, unreadying due to face rescan");
      handleReadyToggle();
    }
  };

  if (!currentUser && !isStarting) { // Added a check for currentUser to prevent rendering issues before data loads
    return (
      <div className="text-center px-4">
        <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-3xl p-8 border border-[#2a3441]/30 max-w-sm mx-auto">
          <div className="w-8 h-8 border-2 border-[#e971ff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#b7b4bb]">Loading battle data...</p>
        </div>
      </div>
    );
  }

  if (isStarting) {
    return (
       <div className="text-center px-4">
        <div className="max-w-sm mx-auto">
          <div className="relative mx-auto h-40 w-40 mb-8">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
              <circle className="stroke-[#2a3441]" strokeWidth="6" cx="50" cy="50" r="40" fill="transparent" />
              <circle
                className="stroke-[#e971ff] transition-all duration-1000 linear drop-shadow-lg"
                strokeWidth="6"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (countdown / 3) * 251.2}
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold text-white drop-shadow-lg">{countdown}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-3xl p-6 border-2 border-[#e971ff]/40 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-2">Battle Begins!</h3>
            <p className="text-[#b7b4bb] mb-4">Lock and load, warrior!</p>
            <div className="flex items-center justify-center gap-2 text-[#e971ff]">
              <Zap size={20} className="animate-pulse" />
              <span className="text-sm font-medium">Weapons charging...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const readyPlayersCount = players.filter((p) => p.isReady).length

  return (
    <div className="space-y-4 px-4">
      {/* Mobile-first status indicators - modified to show READY when ready, countdown when not ready */}
      {currentUser?.isReady ? (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 rounded-full shadow-lg">
            <CheckCircle2 size={18} className="text-white animate-pulse" />
            <span className="text-white font-bold text-sm">READY</span>
          </div>
        </div>
      ) : (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 px-3 py-2 rounded-full shadow-lg">
            <Clock size={16} className="text-white" />
            <span className="text-white font-mono text-sm font-bold">{autoCountdown}s</span>
          </div>
        </div>
      )}

      {/* Battle Status Header */}
      <div className="bg-gradient-to-r from-[#1f152b] via-[#2a1b3d] to-[#1f152b] rounded-2xl p-4 border border-[#9351f7]/30 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-[#e971ff]" />
            Battle Squad
          </h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#e971ff]">
              {readyPlayersCount}/{players.length}
            </div>
            <div className="text-xs text-[#b7b4bb]">ready</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-[#0f051d] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#741ff5] to-[#e971ff] transition-all duration-500"
            style={{ width: `${players.length > 0 ? (readyPlayersCount / players.length) * 100 : 0}%` }}
          ></div>
        </div>
      </div>

      {/* Enhanced Players List with Weapons */}
      <div className="space-y-3">
        {players.map((player, index) => {
          const weaponInfo = getWeaponInfo(player.class)
          const isCurrentPlayer = player.id === currentUser?.id

          return (
            <div
              key={player.id}
              className={`
                relative overflow-hidden rounded-2xl border-2 transition-all duration-300 
                ${
                  isCurrentPlayer
                    ? "bg-gradient-to-r from-[#9351f7]/20 via-[#e971ff]/10 to-[#9351f7]/20 border-[#e971ff]/50 shadow-lg shadow-[#e971ff]/20"
                    : player.isReady
                      ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-400/40"
                      : "bg-gradient-to-r from-[#1f152b] to-[#0f051d] border-[#2a3441]/30"
                }
                hover:scale-[1.02] hover:shadow-xl
              `}
            >
              {/* Rank indicator */}
              <div
                className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  player.isHost ? "bg-yellow-400 text-black" : "bg-[#9351f7] text-white"
                }`}
              >
                {player.isHost ? <Crown size={12} /> : index + 1}
              </div>

              <div className="p-4 pl-10">
                <div className="flex items-center justify-between">
                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {isEditingName && isCurrentPlayer ? (
                        <Input
                          value={nameInputValue}
                          onChange={(e) => setNameInputValue(e.target.value)}
                          className="text-base font-bold"
                        />
                      ) : (
                        <>
                          <span
                            className={`font-bold text-lg truncate ${
                              isCurrentPlayer ? "text-[#e971ff]" : "text-white"
                            }`}
                          >
                            {isCurrentPlayer && localStorage.getItem('currentUsername') 
                              ? localStorage.getItem('currentUsername') 
                              : player.name}
                          </span>
                          {isCurrentPlayer && (
                            <span className="bg-[#e971ff]/20 text-[#e971ff] px-2 py-1 rounded-full text-xs font-medium">
                              YOU
                            </span>
                          )}
                          {player.isHost && (
                            <span className="bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium">
                              HOST
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Weapon display */}
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${weaponInfo.bgColor} ${weaponInfo.borderColor}`}
                    >
                      {weaponInfo.icon}
                      <span className={`text-sm font-medium ${weaponInfo.color}`}>{weaponInfo.name}</span>
                    </div>
                  </div>

                  {/* Ready status */}
                  <div className="flex flex-col items-center gap-1 ml-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        player.isReady ? "bg-green-500" : "bg-red-500/70"
                      }`}
                    >
                      {player.isReady ? (
                        <CheckCircle2 size={18} className="text-white" />
                      ) : (
                        <XCircle size={18} className="text-white" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${player.isReady ? "text-green-400" : "text-red-400"}`}>
                      {player.isReady ? "READY" : "WAIT"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Animated ready indicator */}
              {player.isReady && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-green-400/10 to-transparent animate-pulse"></div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Face Scan Section - modified to handle rescan events */}
      {currentUser && !isStarting && (
        <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-2xl p-4 border border-[#2a3441]/30 shadow-xl">
          <PlayerScan
            username={localStorage.getItem('currentUsername') || currentUser.name}
            lobbyCode={lobbyCode}
            onScanComplete={handleFaceScanComplete}
            onScanReset={handleFaceScanReset}
          />
        </div>
      )}

      {/* Action Section */}
      <div className="space-y-3 pb-4">
        {showScanFaceWarning && !isFaceScanComplete && (
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-400/50 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <XCircle size={18} className="text-white" />
              </div>
              <div>
                <div className="text-red-400 font-bold">Face Scan Required</div>
                <div className="text-red-300 text-sm">Complete your scan to ready up!</div>
              </div>
            </div>
          </div>
        )}

        {isEditingName ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleSaveName}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span>Save</span>
              </div>
            </Button>
            <Button
              onClick={() => setIsEditingName(false)}
              variant="outline"
              className="border-2 border-[#2a3441] text-[#b7b4bb] hover:bg-[#2a3441] bg-transparent rounded-xl"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleReadyToggle}
              disabled={isEditingName || !isFaceScanComplete}
              className={`
                w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-[1.02]
                ${
                  currentUser?.isReady
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-yellow-500/30"
                    : "bg-gradient-to-r from-green-600 to-emerald-500 hover:from-emerald-500 hover:to-green-400 shadow-lg shadow-green-500/30"
                }
                ${!isFaceScanComplete ? "opacity-50 cursor-not-allowed transform-none" : ""}
              `}
            >
              <div className="flex items-center justify-center gap-3">
                {currentUser?.isReady ? (
                  <>
                    <XCircle size={24} />
                    <span>Cancel Ready</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={24} />
                    <span>Ready for Battle!</span>
                  </>
                )}
              </div>
            </Button>

            <Button
              onClick={handleEditName}
              variant="outline"
              className="w-full py-3 border-2 border-[#9351f7]/40 text-[#e971ff] hover:bg-[#9351f7]/20 bg-transparent rounded-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <Pencil size={18} />
                <span>Edit Name</span>
              </div>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
};

export default PlayerWaitlistPage;