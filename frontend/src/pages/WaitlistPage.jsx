import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackgroundDecorations from "../components/BackgroundDecorations"
import Button from '../components/Button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useWebSocket } from '../WebSocketContext'; // Import useWebSocket
import PlayerWaitlistPage from './PlayerWaitlistPage'; // Import PlayerWaitlistPage

/**
 * This component acts as a controller. It fetches shared data
 * and then renders either the Host or Player view.
 */ 
const WaitlistPage = () => {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const { lastMessage, sendMessage, wsStatus, ws } = useWebSocket(); // Use useWebSocket to receive messages

  // --- STATE MANAGEMENT ---
  const [players, setPlayers] = useState([]); // Initialize as empty array
  const [lobbyName, setLobbyName] = useState('Game Lobby'); // New state for lobby name
  const [currentUserId, setCurrentUserId] = useState(null); // New state for current user ID
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization state
  const [debugInfo, setDebugInfo] = useState([]); // Debug information
  const [retryCount, setRetryCount] = useState(0); // Track retry attempts

  // Add debug logging function
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
    console.log(`[WaitlistPage Debug] ${message}`);
  };

  // --- DERIVED STATE ---
  const currentUser = useMemo(() => {
    if (!currentUserId || !players || players.length === 0) return null;

    addDebugLog(`Finding current user with ID: ${currentUserId}, available players: ${players.length}`);

    const user = players.find(p => p.id === currentUserId);
    if (!user) {
      addDebugLog("Current user not found in players list");
      // If exact match not found, try to find by username as fallback
      const storedUsername = localStorage.getItem('currentUsername');
      if (storedUsername) {
        const userByName = players.find(p => p.name === storedUsername);
        if (userByName) {
          addDebugLog(`Found current user by username match: ${storedUsername}`);
          return userByName;
        }
      }
    } else {
      addDebugLog(`Found current user: ${user.name}`);
    }
    return user || null;
  }, [players, currentUserId]);
  
  const allPlayersReady = useMemo(() => players.length > 0 && players.every(p => p.isReady), [players]);

  // --- WEBSOCKET & COUNTDOWN LOGIC ---
  useEffect(() => {
    if (wsStatus === 'open' && lobbyId) {
      addDebugLog("WebSocket connection ready, initializing waitlist page");
      
      // Try to get userId from localStorage
      const storedId = localStorage.getItem('userId');
      if (storedId) {
        addDebugLog(`Setting currentUserId from localStorage: ${storedId}`);
        setCurrentUserId(storedId);
      } else {
        addDebugLog("No userId found in localStorage - clearing potentially stale data");
        // Clear potentially stale localStorage data when no userId is found
        localStorage.removeItem('currentUsername');
        localStorage.removeItem('playerClass');
      }

      // Get stored username if available
      const storedUsername = localStorage.getItem('currentUsername');
      if (storedUsername && storedId) {
        addDebugLog(`Found stored username: ${storedUsername}`);
      }

      // Request lobby members immediately
      addDebugLog(`Requesting lobby members for: ${lobbyId}`);
      sendMessage({ type: 'get_lobby_members', code: lobbyId });
      
      // Set initialization timeout
      const initTimeout = setTimeout(() => {
        addDebugLog("Initialization timeout reached");
        setIsInitialized(true);
      }, 3000); // Increased timeout

      return () => clearTimeout(initTimeout);
    } else {
      addDebugLog(`WebSocket not ready. Status: ${wsStatus}, LobbyId: ${lobbyId}`);
    }
  }, [wsStatus, lobbyId, sendMessage]);

  // Enhanced retry mechanism
  useEffect(() => {
    if (currentUserId && players.length === 0 && wsStatus === 'open' && isInitialized && retryCount < 5) {
      addDebugLog(`Retry attempt ${retryCount + 1}: No players found, requesting lobby members again`);
      
      const retryTimer = setTimeout(() => {
        sendMessage({ type: 'get_lobby_members', code: lobbyId });
        setRetryCount(prev => prev + 1);
      }, 2000 * (retryCount + 1)); // Exponential backoff

      return () => clearTimeout(retryTimer);
    }
  }, [currentUserId, players.length, wsStatus, lobbyId, sendMessage, isInitialized, retryCount]);

  // Force initialization after maximum retries
  useEffect(() => {
    if (retryCount >= 5 && players.length === 0) {
      addDebugLog("Maximum retries reached, creating fallback user data");
      
      // Create fallback user data
      const storedUsername = localStorage.getItem('currentUsername');
      const storedUserId = localStorage.getItem('userId');
      
      if (storedUserId && storedUsername) {
        setPlayers([{
          id: storedUserId,
          name: storedUsername,
          isHost: true, // Assume host since we created the lobby
          isReady: false,
          class: localStorage.getItem('playerClass') || 'pistol'
        }]);
        addDebugLog("Created fallback user data");
      }
    }
  }, [retryCount, players.length]);

  // Periodic refresh to keep data synchronized
  useEffect(() => {
    if (wsStatus === 'open' && lobbyId && isInitialized && players.length > 0) {
      const refreshInterval = setInterval(() => {
        addDebugLog("Periodic refresh of lobby members");
        sendMessage({ type: 'get_lobby_members', code: lobbyId });
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(refreshInterval);
    }
  }, [wsStatus, lobbyId, sendMessage, isInitialized, players.length]);

  useEffect(() => {
    if (!lastMessage) return;
    try {
      const msg = JSON.parse(lastMessage);
      addDebugLog(`Processing message: ${msg.type}`);

      // Handle welcome message and detect server restart
      if (msg.type === 'welcome' && msg.userId) {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId && storedUserId !== msg.userId) {
          addDebugLog(`Server assigned new userId ${msg.userId}, clearing stale data`);
          // Server has restarted and assigned a new userId - clear stale data
          localStorage.removeItem('currentUsername');
          localStorage.removeItem('playerClass');
          // Clear any lobby-specific data as well
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('playerFaces_') || key.startsWith('playerIdentities_')) {
              localStorage.removeItem(key);
            }
          });
        }
        
        // Update stored userId to the new one
        localStorage.setItem('userId', msg.userId);
        setCurrentUserId(msg.userId);
        addDebugLog(`Set userId to: ${msg.userId}`);
      }

      // Set currentUserId if it's not set yet
      if (!currentUserId) {
        const storedId = localStorage.getItem('userId');
        if (storedId) {
          addDebugLog(`Setting currentUserId from localStorage: ${storedId}`);
          setCurrentUserId(storedId);
        }
      }

      if (msg.type === 'lobby_members' && msg.code === lobbyId) {
        addDebugLog(`Received lobby_members: ${JSON.stringify(msg.members)}`);

        // Get stored username and userId for consistency
        const storedUsername = localStorage.getItem('currentUsername');
        const storedUserId = localStorage.getItem('userId');

        // Map the members to players with proper structure
        const updatedPlayers = msg.members.map(p => {
          let displayName;
          
          // Prioritize server username, but use stored username for current user if server doesn't have it
          if (p.username && p.username.trim()) {
            displayName = p.username.trim();
            addDebugLog(`Using server username for ${p.userId}: ${displayName}`);
            
            // Update localStorage if this is the current user
            if (p.userId === storedUserId) {
              localStorage.setItem('currentUsername', displayName);
            }
          } else if (p.userId === storedUserId && storedUsername) {
            // This is the current user and we have a stored username
            displayName = storedUsername;
            addDebugLog(`Using stored username for current user ${p.userId}: ${displayName}`);
            
            // Send username update to server
            sendMessage({
              type: 'set_name',
              code: lobbyId,
              userId: storedUserId,
              username: storedUsername
            });
          } else {
            // Fallback to generic name
            displayName = `Player ${p.userId?.substring(0, 4) || 'Unknown'}`;
            addDebugLog(`Using fallback username for ${p.userId}: ${displayName}`);
          }

          return {
            id: p.userId,
            name: displayName,
            isHost: p.isHost || false,
            isReady: !!p.isReady,
            class: p.class || 'pistol'
          };
        });

        setPlayers(updatedPlayers);
        setIsInitialized(true);
        addDebugLog(`Updated players: ${JSON.stringify(updatedPlayers)}`);

        // If we don't have a currentUserId yet, try to get it from localStorage
        if (!currentUserId) {
          const storedId = localStorage.getItem('userId');
          if (storedId) {
            addDebugLog(`Setting currentUserId from localStorage after receiving lobby_members: ${storedId}`);
            setCurrentUserId(storedId);
          }
        }
      }
      // Also update players on lobby_state_update (for ready state changes)
      else if (msg.type === 'lobby_state_update') {
        const storedUsername = localStorage.getItem('currentUsername');
        const storedUserId = localStorage.getItem('userId');
        
        const updatedPlayers = msg.players.map(p => {
          let displayName;
          
          if (p.username && p.username.trim()) {
            displayName = p.username.trim();
            if ((p.userId || p.id) === storedUserId) {
              localStorage.setItem('currentUsername', displayName);
            }
          } else if ((p.userId || p.id) === storedUserId && storedUsername) {
            displayName = storedUsername;
            // Send username update to server
            sendMessage({
              type: 'set_name',
              code: lobbyId,
              userId: storedUserId,
              username: storedUsername
            });
          } else {
            displayName = `Player ${(p.userId || p.id)?.substring(0, 4) || 'Unknown'}`;
          }
          
          return {
            id: p.userId || p.id,
            name: displayName,
            isHost: p.isHost || false,
            isReady: !!p.isReady,
            class: p.class || 'pistol'
          };
        });
        
        setPlayers(updatedPlayers);
        setLobbyName(msg.lobbyName || 'Game Lobby');
        
        if (msg.currentUserId) {
          setCurrentUserId(msg.currentUserId);
        }
        addDebugLog("Updated from lobby_state_update");
      } 
      else if (msg.type === 'game_start_countdown') {
        setIsStarting(true);
        setCountdown(msg.countdown);
        addDebugLog("Game countdown started");
      } 
      else if (msg.type === 'game_started') {
        addDebugLog("Game started, navigating to game page");
        navigate(`/game/${lobbyId}`);
      }
      else if (msg.type === 'lobby_error') {
        addDebugLog(`Lobby error: ${msg.message}`);
      }
    } catch (e) {
      addDebugLog(`Failed to parse WebSocket message: ${e.message}`);
    }
  }, [lastMessage, lobbyId, navigate, currentUserId, sendMessage]);

  useEffect(() => {
    let timerId;
    if (isStarting && countdown > 0) {
      timerId = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (isStarting && countdown === 0) {
      setTimeout(() => {
        navigate(`/game/${lobbyId}`);
      }, 1000); // 1 second delay before navigating
    }
    return () => clearInterval(timerId);
  }, [isStarting, countdown, lobbyId, navigate]);

  // --- EVENT HANDLERS (to be passed down as props) ---
  const handleReadyToggle = () => {
    const userId = currentUserId || localStorage.getItem('userId');
    
    if (!userId || !lobbyId) {
      addDebugLog("Cannot toggle ready: missing userId or lobbyId");
      return;
    }

    addDebugLog(`Toggling ready state for user: ${userId} in lobby: ${lobbyId}`);

    // Send a message to the WebSocket to update readiness on the server
    sendMessage({
      type: 'set_ready',
      code: lobbyId,
      userId: userId,
      ready: currentUser ? !currentUser.isReady : true
    });

    // Update local state for immediate feedback
    setPlayers(players.map(p => 
      p.id === userId ? { ...p, isReady: !p.isReady } : p
    ));
  };

  const handleNameChange = (newName) => {
    const userId = currentUserId || localStorage.getItem('userId');
    
    if (!userId || !lobbyId) {
      addDebugLog("Cannot change name: missing userId or lobbyId");
      return;
    }

    addDebugLog(`Changing name for user: ${userId} to: ${newName}`);

    // Store the new username in localStorage for consistency
    localStorage.setItem('currentUsername', newName);

    // Send a message to the WebSocket to update name on the server
    sendMessage({
      type: 'set_name',
      code: lobbyId,
      userId: userId,
      username: newName
    });

    // Update local state for immediate feedback
    setPlayers(players.map(p => 
      p.id === userId ? { ...p, name: newName } : p
    ));
  };

  const handleStart = () => {
    if (allPlayersReady) {
      setIsStarting(true);
      setCountdown(3); // Set countdown to 3 seconds instead of 30
      // Ideally, send a 'start_game' message to the WebSocket here
    }
  };

  const handleCancel = () => {
    setIsStarting(false);
    // Ideally, send a 'cancel_start' message to the WebSocket here
  };

  const handleRetryConnection = () => {
    addDebugLog("Manual retry requested");
    setRetryCount(0);
    setIsInitialized(false);
    sendMessage({ type: 'get_lobby_members', code: lobbyId });
  };

  // Show loading state while initializing or if stuck
  if (!isInitialized || (wsStatus === 'open' && players.length === 0 && retryCount < 5)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f051d] via-[#1f152b] to-[#0f051d] relative overflow-hidden">
        <BackgroundDecorations />
        
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center px-4">
            <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-3xl p-8 border border-[#2a3441]/30 max-w-md mx-auto">
              <div className="w-8 h-8 border-2 border-[#e971ff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#b7b4bb] mb-2">Loading battle data...</p>
              <p className="text-[#b7b4bb] text-sm mb-4">Connecting to lobby {lobbyId?.toUpperCase()}</p>
              
              {/* Debug information */}
              <div className="text-left bg-black/30 rounded p-3 text-xs text-gray-400 mb-4 max-h-32 overflow-y-auto">
                <div className="font-bold mb-1">Debug Info:</div>
                {debugInfo.map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </div>
              
              <div className="text-xs text-[#b7b4bb] mb-4">
                WebSocket: {wsStatus} | Retries: {retryCount}/5
              </div>
              
              <Button 
                onClick={handleRetryConnection}
                className="bg-gradient-to-r from-[#741ff5] to-[#9351f7] text-white px-4 py-2 rounded-lg text-sm"
              >
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create effective current user for display
  const effectiveCurrentUser = currentUser || {
    id: currentUserId || localStorage.getItem('userId'),
    name: localStorage.getItem('currentUsername') || "You",
    isHost: players.length === 0 || players.some(p => p.isHost && p.id === (currentUserId || localStorage.getItem('userId'))),
    isReady: false,
    class: localStorage.getItem('playerClass') || 'pistol'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f051d] via-[#1f152b] to-[#0f051d] relative overflow-hidden">
      <BackgroundDecorations />

      {/* HBlast Header */}
      <header className="flex justify-between items-center py-4 md:py-6 relative z-10 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {!isStarting && (
            <button
              onClick={() => navigate("/lobby")}
              className="text-white hover:text-[#e971ff] transition-colors p-2 rounded-full hover:bg-white/10"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="text-white text-xl md:text-2xl font-bold">HBlast</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[#b7b4bb] text-sm md:text-base">{lobbyName}</div>
          <div className="w-8 h-8 md:w-10 md:h-10">
            <img src="/images/icon.png" alt="HBlast Score Icon" className="w-full h-full object-contain" />
          </div>
        </div>
      </header>

      {/* LOBBY CODE AT TOP */}
      <div className="text-center mb-6 px-4 relative z-10">
        <div className="inline-block bg-gradient-to-r from-[#1f152b] to-[#0f051d] border-2 border-[#9351f7]/40 rounded-xl px-4 md:px-6 py-2 md:py-3 shadow-lg hover:shadow-xl transition-all duration-200">
          <span className="text-sm text-[#b7b4bb]">Lobby Code: </span>
          <span className="text-lg md:text-xl font-mono font-bold text-[#e971ff] tracking-widest">
            {lobbyId?.toUpperCase()}
          </span>
        </div>
      </div>

      <main className="flex flex-grow flex-col justify-center p-4 md:p-6 relative z-10">
        <div className="mx-auto w-full max-w-2xl">
          {/* Always show PlayerWaitlistPage - simplified logic */}
          <PlayerWaitlistPage
            players={players}
            currentUser={effectiveCurrentUser}
            lobbyCode={lobbyId}
            isStarting={isStarting}
            countdown={countdown}
            onReadyToggle={handleReadyToggle}
            onNameChange={handleNameChange}
          />

          {/* COUNTDOWN IF STARTING */}
          {isStarting && (
            <div className="mb-6 text-center text-2xl font-bold text-[#e971ff]">Game starting in {countdown}...</div>
          )}
        </div>
      </main>

      {!isStarting && (
        <footer className="p-4 relative z-10">
          <div className="mx-auto max-w-md">
            <Button
              onClick={() => navigate("/lobby")}
              variant="outline"
              className="flex items-center justify-center gap-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white bg-transparent"
            >
              <LogOut size={20} />
              <span>Leave Lobby</span>
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default WaitlistPage;