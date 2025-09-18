import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../WebSocketContext';
import Leaderboard from '../components/Leaderboard';
import BackgroundDecorations from "../components/BackgroundDecorations"
import { ArrowLeft, Users, Target, Zap, Activity, Crown, Crosshair, Shield } from "lucide-react"


/**
 * A mobile-first, responsive page for spectating a game.
 * It displays a live leaderboard of players' scores.
 */
const SpectateGamePage = () => {
  const { lobbyId } = useParams();
  const { ws } = useWebSocket();
  const [players, setPlayers] = useState([]);
  const [spectatingPlayer, setSpectatingPlayer] = useState(null);
  const [liveActions, setLiveActions] = useState([])
  const [lobbyInfo, setLobbyInfo] = useState(null)
  const [gameStatus, setGameStatus] = useState("waiting") // waiting, active, ended
  const previousScores = useRef({})
  const navigate = useNavigate();

  // Listen for lobby_status updates
  useEffect(() => {
    if (!ws) return;
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'lobby_status' && Array.isArray(data.players)) {
          // Only keep player name and score
          const simplePlayers = data.players.map(p => ({
            id: p.id || p.userId,
            name: p.name || p.username || `Player ${(p.id || p.userId)?.substring(0, 4)}`,
            score: p.score || 0,
            role: p.role,
            ready: p.ready || false
          }));

          // Track score changes for live actions
          simplePlayers.forEach((player) => {
            const previousScore = previousScores.current[player.id] || 0
            if (player.score > previousScore) {
              const pointsGained = player.score - previousScore
              const weaponName = getWeaponName(player.class)
              const hitCount = getHitCount(pointsGained, player.class)

              setLiveActions((prev) => [
                {
                  id: Date.now() + Math.random(),
                  type: "hit",
                  player: player.name,
                  weapon: weaponName,
                  points: pointsGained,
                  hits: hitCount,
                  timestamp: new Date().toLocaleTimeString(),
                  icon: getWeaponIcon(player.class),
                },
                ...prev.slice(0, 9),
              ]) // Keep last 10 actions
            }
            previousScores.current[player.id] = player.score
          })

          setPlayers(simplePlayers);
          // If no spectatingPlayer or spectatingPlayer is gone, pick the first player
          if (!spectatingPlayer || !simplePlayers.some(p => p.id === spectatingPlayer.id)) {
            setSpectatingPlayer(simplePlayers[0] || null);
          }
        }

      // Listen for game events
        if (data.type === "game_start") {
          setGameStatus("active")
          setLiveActions((prev) => [
            {
              id: Date.now(),
              type: "game_event",
              message: "Game Started!",
              timestamp: new Date().toLocaleTimeString(),
              icon: <Zap size={16} className="text-green-400" />,
            },
            ...prev.slice(0, 9),
          ])
        }

        if (data.type === "game_end") {
          setGameStatus("ended")
          setLiveActions((prev) => [
            {
              id: Date.now(),
              type: "game_event",
              message: "Game Ended!",
              timestamp: new Date().toLocaleTimeString(),
              icon: <Crown size={16} className="text-yellow-400" />,
            },
            ...prev.slice(0, 9),
          ])
        }

        // Listen for lobby member updates to get lobby info
        if (data.type === "lobby_members" && data.code === lobbyId) {
          setLobbyInfo({
            code: data.code,
            members: data.members,
            host: data.members.find((m) => m.isHost)?.username || "Unknown",
          })
        }
      } catch (e) {}
    };
    ws.addEventListener('message', handleMessage);
    // Request lobby status on mount
    ws.send(JSON.stringify({ type: 'get_lobby_status', gameId: lobbyId }));
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, lobbyId, spectatingPlayer]);

  const handleSelectPlayer = (player) => {
    setSpectatingPlayer(player);
  };

  // Helper functions for weapon data
  const getWeaponName = (weaponClass) => {
    switch (weaponClass) {
      case "pistol":
        return "Pistol"
      case "shotgun":
        return "Shotgun"
      case "archer":
        return "Bow"
      default:
        return "Unknown"
    }
  }

  const getWeaponIcon = (weaponClass) => {
    switch (weaponClass) {
      case "pistol":
        return <Target size={16} className="text-blue-400" />
      case "shotgun":
        return <Shield size={16} className="text-red-400" />
      case "archer":
        return <Crosshair size={16} className="text-green-400" />
      default:
        return <Target size={16} className="text-gray-400" />
    }
  }

  const getHitCount = (points, weaponClass) => {
    switch (weaponClass) {
      case "pistol":
        return Math.floor(points / 10)
      case "shotgun":
        return Math.floor(points / 40)
      case "archer":
        return Math.floor(points / 70)
      default:
        return Math.floor(points / 10)
    }
  }

  const getWeaponColor = (weaponClass) => {
    switch (weaponClass) {
      case "pistol":
        return "text-blue-400"
      case "shotgun":
        return "text-red-400"
      case "archer":
        return "text-green-400"
      default:
        return "text-gray-400"
    }
  }

  // Calculate enhanced player stats
  const getEnhancedPlayers = () => {
    return players.map((player) => {
      const totalHits = Math.floor(player.score / getPointsPerHit(player.class))
      const estimatedShots = totalHits > 0 ? Math.floor(totalHits * (Math.random() * 0.5 + 1.2)) : 0
      const accuracy = estimatedShots > 0 ? Math.floor((totalHits / estimatedShots) * 100) : 0

      return {
        ...player,
        hits: totalHits,
        accuracy: Math.min(accuracy, 100),
        weapon: getWeaponName(player.class),
      }
    })
  }

  const getPointsPerHit = (weaponClass) => {
    switch (weaponClass) {
      case "pistol":
        return 10
      case "shotgun":
        return 40
      case "archer":
        return 70
      default:
        return 10
    }
  }

  const getGameStatusColor = () => {
    switch (gameStatus) {
      case "active":
        return "text-green-400"
      case "ended":
        return "text-red-400"
      default:
        return "text-yellow-400"
    }
  }

  const getGameStatusText = () => {
    switch (gameStatus) {
      case "active":
        return "Live Match"
      case "ended":
        return "Match Ended"
      default:
        return "Waiting to Start"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f051d] via-[#1f152b] to-[#0f051d] relative overflow-hidden">
      <BackgroundDecorations />

      {/* HBlast Header */}
      <header className="flex justify-between items-center py-4 md:py-6 relative z-10 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-white hover:text-[#e971ff] transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-white text-xl md:text-2xl font-bold">HBlast</div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-sm md:text-base ${getGameStatusColor()}`}>{getGameStatusText()}</div>
          <div className="w-8 h-8 md:w-10 md:h-10">
            <img src="/images/icon.png" alt="HBlast Score Icon" className="w-full h-full object-contain" />
          </div>
        </div>
      </header>

      <div className="px-4 md:px-6 lg:px-8 pb-6 relative z-10">
        {/* Game Status Header */}
        <div className="mb-6 md:mb-8">
          <div className="text-center mb-6">
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold mb-2">Spectating: Game {lobbyId}</h1>
            <p className="text-[#b7b4bb] text-lg md:text-xl">Watch the action unfold in real-time</p>
          </div>

          {/* Lobby Summary */}
          {lobbyInfo && (
            <div className="max-w-4xl mx-auto mb-6">
              <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-xl p-4 border border-[#2a3441]/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-[#b7b4bb] text-sm mb-1">Lobby Host</div>
                    <div className="text-white font-semibold">{lobbyInfo.host}</div>
                  </div>
                  <div>
                    <div className="text-[#b7b4bb] text-sm mb-1">Active Players</div>
                    <div className="text-white font-semibold">{players.length}</div>
                  </div>
                  <div>
                    <div className="text-[#b7b4bb] text-sm mb-1">Game Status</div>
                    <div className={`font-semibold ${getGameStatusColor()}`}>{getGameStatusText()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-xl p-4 border border-[#2a3441]/30">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-[#e971ff]" />
                <span className="text-[#b7b4bb] text-sm">Players</span>
              </div>
              <div className="text-white text-xl md:text-2xl font-bold">{players.length}</div>
            </div>

            <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-xl p-4 border border-[#2a3441]/30">
              <div className="flex items-center gap-2 mb-2">
                <Target size={20} className="text-[#e971ff]" />
                <span className="text-[#b7b4bb] text-sm">Total Hits</span>
              </div>
              <div className="text-white text-xl md:text-2xl font-bold">
                {players.reduce((sum, p) => sum + Math.floor(p.score / getPointsPerHit(p.class)), 0)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-xl p-4 border border-[#2a3441]/30">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={20} className="text-[#e971ff]" />
                <span className="text-[#b7b4bb] text-sm">Top Score</span>
              </div>
              <div className="text-white text-xl md:text-2xl font-bold">
                {players.length > 0 ? Math.max(...players.map((p) => p.score)) : 0}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-xl p-4 border border-[#2a3441]/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={20} className="text-[#e971ff]" />
                <span className="text-[#b7b4bb] text-sm">Live Actions</span>
              </div>
              <div className="text-white text-xl md:text-2xl font-bold">{liveActions.length}</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Leaderboard */}
          <div className="lg:col-span-2">
            <Leaderboard players={getEnhancedPlayers()} showDetailedStats={true} />
          </div>

          {/* Live Actions Feed */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-2xl p-4 md:p-6 border border-[#2a3441]/30 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Zap size={24} className="text-[#e971ff]" />
                <h3 className="text-white text-lg md:text-xl font-bold">Live Actions</h3>
                <div className="w-2 h-2 bg-[#e971ff] rounded-full animate-pulse ml-auto"></div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {liveActions.length > 0 ? (
                  liveActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 bg-gradient-to-r from-[#741ff5]/20 to-transparent rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-0.5">{action.icon}</div>
                      <div className="flex-1 min-w-0">
                        {action.type === "hit" ? (
                          <div>
                            <div className="text-white text-sm font-medium">
                              <span className="text-[#e971ff]">{action.player}</span> scored with {action.weapon}
                            </div>
                            <div className="text-[#b7b4bb] text-xs">
                              +{action.points} points ({action.hits} hits)
                            </div>
                          </div>
                        ) : (
                          <div className="text-white text-sm">{action.message}</div>
                        )}
                        <div className="text-[#b7b4bb] text-xs mt-1">{action.timestamp}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-[#b7b4bb] text-sm">No recent activity</div>
                    <div className="text-[#b7b4bb] text-xs mt-1">Actions will appear here during gameplay</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectateGamePage;