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

  // --- DERIVED STATE ---
  const currentUser = useMemo(() => {
    if (!currentUserId || !players || players.length === 0) return null;

    console.log("Finding current user with ID:", currentUserId);
    console.log("Available players:", players);

    const user = players.find(p => p.id === currentUserId);
    if (!user) {
      console.log("Current user not found in players list");
    }
    return user || null;
  }, [players, currentUserId]);
  
  const allPlayersReady = useMemo(() => players.length > 0 && players.every(p => p.isReady), [players]);

  // --- WEBSOCKET & COUNTDOWN LOGIC ---
  useEffect(() => {
    if (wsStatus === 'open' && lobbyId) {
      // Try to get userId from localStorage
      const storedId = localStorage.getItem('userId');
      if (storedId) {
        console.log("Setting currentUserId from localStorage in initial effect:", storedId);
        setCurrentUserId(storedId);
      } else {
        console.log("No userId found in localStorage");
      }

      // Request lobby members
      console.log("Requesting lobby members for:", lobbyId);
      sendMessage({ type: 'get_lobby_members', code: lobbyId });
    } else {
      console.log("WebSocket not ready or no lobbyId. Status:", wsStatus, "LobbyId:", lobbyId);
    }
  }, [wsStatus, lobbyId, sendMessage]);

  // Retry mechanism for when user is not found in player list
  useEffect(() => {
    if (currentUserId && players.length > 0 && !currentUser && wsStatus === 'open') {
      console.log("User not found in player list, retrying...");
      const retryTimer = setTimeout(() => {
        sendMessage({ type: 'get_lobby_members', code: lobbyId });
      }, 1000);

      return () => clearTimeout(retryTimer);
    }
  }, [currentUserId, players, currentUser, wsStatus, lobbyId, sendMessage]);

  // Request lobby members if not received after 1s
  useEffect(() => {
    if (wsStatus === 'open' && lobbyId && players.length <2 ) {
      const timeout = setTimeout(() => {
        sendMessage({ type: 'get_lobby_members', code: lobbyId });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [wsStatus, lobbyId, players.length, sendMessage]);

  useEffect(() => {
    if (!lastMessage) return;
    try {
      const msg = JSON.parse(lastMessage);
      console.log("Processing message in WaitlistPage:", msg);

      // Set currentUserId if it's not set yet
      if (!currentUserId) {
        const storedId = localStorage.getItem('userId');
        if (storedId) {
          console.log("Setting currentUserId from localStorage:", storedId);
          setCurrentUserId(storedId);
        }
      }

      if (msg.type === 'lobby_members' && msg.code === lobbyId) {
        console.log("Received lobby_members:", msg.members);

        // Map the members to players with proper structure
        const updatedPlayers = msg.members.map(p => ({
          id: p.userId,
          name: p.username || `Player ${p.userId.substring(0, 4)}`,
          isHost: p.isHost || false,
          isReady: !!p.isReady
        }));

        setPlayers(updatedPlayers);
        console.log("Updated players:", updatedPlayers);

        // If we don't have a currentUserId yet, try to get it from localStorage
        if (!currentUserId) {
          const storedId = localStorage.getItem('userId');
          if (storedId) {
            console.log("Setting currentUserId from localStorage after receiving lobby_members:", storedId);
            setCurrentUserId(storedId);
          }
        }
      }
      // Also update players on lobby_state_update (for ready state changes)
      else if (msg.type === 'lobby_state_update') {
        setPlayers(msg.players.map(p => ({
          id: p.userId || p.id,
          name: p.username || `Player ${(p.userId || p.id)?.substring(0, 4)}`,
          isHost: p.isHost || false,
          isReady: !!p.isReady
        })));
        setLobbyName(msg.lobbyName);
        setCurrentUserId(msg.currentUserId);
      } 
      else if (msg.type === 'game_start_countdown') {
        setIsStarting(true);
        setCountdown(msg.countdown);
      } 
      else if (msg.type === 'game_started') {
        navigate(`/game/${lobbyId}`);
      }
    } catch (e) {
      console.error("Failed to parse WebSocket message:", e);
    }
  }, [lastMessage, lobbyId, navigate, currentUserId]);


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
    if (!currentUserId || !lobbyId) return;

    // Send a message to the WebSocket to update readiness on the server
    sendMessage({
      type: 'set_ready',
      code: lobbyId,
      userId: currentUserId,
      ready: currentUser ? !currentUser.isReady : true
    });

    // Update local state for immediate feedback
    setPlayers(players.map(p => 
      p.id === currentUserId ? { ...p, isReady: !p.isReady } : p
    ));
  };

  const handleNameChange = (newName) => {
    if (!currentUserId || !lobbyId) return;

    // Send a message to the WebSocket to update name on the server
    sendMessage({
      type: 'set_name',
      code: lobbyId,
      userId: currentUserId,
      username: newName
    });

    // Update local state for immediate feedback
    setPlayers(players.map(p => 
      p.id === currentUserId ? { ...p, name: newName } : p
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
            currentUser={
              currentUser || {
                id: currentUserId,
                name: "You",
                isHost: true,
                isReady: false,
              }
            }
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