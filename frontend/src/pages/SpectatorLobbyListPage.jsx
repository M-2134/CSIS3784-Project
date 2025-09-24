//Marco Pretorius (2024442606)
//JJ Kleynhans (2024158442)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundDecorations from '../components/BackgroundDecorations'
import { Users, Signal, ArrowLeft, Eye, Zap, Clock, Target } from 'lucide-react'
import { useWebSocket } from '../WebSocketContext';

/**
 * SpectatorLobbyListPage component
 * Displays a list of active game lobbies for spectators to join and watch.
 */
const SpectatorLobbyListPage = () => {
  // State: list of lobbies available for spectating
  const [lobbies, setLobbies] = useState([]);
  // Navigation hook
  const navigate = useNavigate();
  // WebSocket context for communication with backend
  const { sendMessage, lastMessage, wsStatus, ws } = useWebSocket();

  // Request the list of lobbies when WebSocket is open
  useEffect(() => {
    if (wsStatus === 'open') {
      sendMessage({ type: 'show_lobbies' });
    }
  }, [wsStatus, sendMessage]);

  // Listen for lobby list updates from backend
  useEffect(() => {
    if (!lastMessage) return;
    try {
      const msg = JSON.parse(lastMessage);
      console.log(msg);
      if (msg.type === 'lobby_list' && Array.isArray(msg.lobbies)) {
        // Map backend lobby format to frontend format
        setLobbies(msg.lobbies.map(lobby => ({
          id: lobby.code,
          name: lobby.name || 'Unnamed Lobby',
          players: lobby.playerCount,
          maxPlayers: lobby.maxPlayers || 8,
          status: lobby.playerCount >= (lobby.maxPlayers || 8) ? 'Full' : 'Waiting',
        })));
      }
    } catch (e) {}
  }, [lastMessage]);

  // Helper: get color for lobby status badge
  const getStatusColor = (status) => {
    switch (status) {
      case "In Progress":
        return "text-[#e971ff] bg-[#e971ff]/20"
      case "Waiting":
        return "text-yellow-400 bg-yellow-400/20"
      case "Full":
        return "text-red-400 bg-red-400/20"
      default:
        return "text-[#b7b4bb] bg-[#b7b4bb]/20"
    }
  }

  // Helper: get icon for lobby status
  const getStatusIcon = (status) => {
    switch (status) {
      case "In Progress":
        return <Zap size={14} />
      case "Waiting":
        return <Clock size={14} />
      case "Full":
        return <Users size={14} />
      default:
        return <Signal size={14} />
    }
  }

  // Main render: displays header, connection status, lobbies grid, and empty state
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f051d] via-[#1f152b] to-[#0f051d] relative overflow-hidden">
      <BackgroundDecorations />

      {/* HBlast Header: navigation and spectate label */}
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
          <div className="text-[#b7b4bb] text-sm md:text-base">Spectate</div>
          <div className="w-8 h-8 md:w-10 md:h-10">
            <img src="/images/icon.png" alt="HBlast Score Icon" className="w-full h-full object-contain" />
          </div>
        </div>
      </header>

      <div className="px-4 md:px-6 lg:px-8 pb-6 relative z-10">
        {/* Hero Section: page title and description */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="block">Choose Your</span>
            <span className="block">Battle to Watch</span>
          </h1>
          <p className="text-[#b7b4bb] text-base md:text-lg max-w-md mx-auto">
            Jump into live matches and watch the action unfold in real-time
          </p>
        </div>

        {/* Connection Status: shows WebSocket connection and lobby count */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-[#1f152b] to-[#0f051d] rounded-xl p-3 md:p-4 border border-[#2a3441]/30 flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${wsStatus === "open" ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
            ></div>
            <span className="text-white text-sm md:text-base font-medium">
              {wsStatus === "open" ? "Connected to Game Network" : "Connecting to Game Network..."}
            </span>
            <div className="ml-auto text-[#b7b4bb] text-xs md:text-sm">
              {wsStatus === "open" ? `${lobbies.length} active lobbies` : "Searching..."}
            </div>
          </div>
        </div>

        {/* Lobbies Grid: shows all available lobbies or empty state */}
        <main className="max-w-6xl mx-auto">
          {lobbies.length > 0 ? (
            <div className="grid gap-4 md:gap-6">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-2xl p-4 md:p-6 border-2 border-[#9351f7]/40 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-[#e971ff]/60 hover:shadow-[#9351f7]/20"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Lobby Info: name, status, player count, progress bar */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-white text-xl md:text-2xl font-bold">{lobby.name}</h3>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            lobby.status,
                          )}`}
                        >
                          {getStatusIcon(lobby.status)}
                          <span>{lobby.status}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 md:gap-6">
                        <div className="flex items-center gap-2 text-[#b7b4bb]">
                          <Users size={16} className="text-[#e971ff]" />
                          <span className="text-sm md:text-base">
                            {lobby.players} player(s)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[#b7b4bb]">
                          <Target size={16} className="text-[#e971ff]" />
                          <span className="text-sm md:text-base">Lobby {lobby.id}</span>
                        </div>

                        {lobby.status === "In Progress" && (
                          <div className="flex items-center gap-2 text-green-400">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-sm md:text-base">Live</span>
                          </div>
                        )}
                      </div>

                      {/* Player Progress Bar: shows lobby fill status */}
                      <div className="mt-4">
                        <div className="bg-black/30 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#741ff5] to-[#9351f7] transition-all duration-500"
                            style={{ width: `${(lobby.players / lobby.maxPlayers) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Spectate Button: join the match as a spectator */}
                    <div className="lg:ml-6">
                      <button
                        onClick={() => navigate(`/spectate/${lobby.id}`)}
                        className={`
                          flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-sm md:text-base transition-all duration-200 w-full lg:w-auto justify-center
                          bg-gradient-to-r from-[#741ff5] to-[#9351f7] hover:from-[#9351f7] hover:to-[#e971ff] text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                         `}
                      >
                        <Eye size={18} />
                        <span>Spectate Match</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 md:py-16">
              <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-2xl p-8 md:p-12 border border-[#2a3441]/30 max-w-md mx-auto">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#741ff5] to-[#9351f7] rounded-full flex items-center justify-center">
                    <Target size={32} className="text-white" />
                  </div>
                  <div className="w-2 h-2 bg-[#e971ff] rounded-full animate-pulse mx-auto mb-4"></div>
                </div>
                <h3 className="text-white text-xl md:text-2xl font-bold mb-2">
                  {wsStatus === "open" ? "No Active Matches" : "Connecting..."}
                </h3>
                <p className="text-[#b7b4bb] mb-6">
                  {wsStatus === "open"
                    ? "All players are taking a break. Check back soon for live action!"
                    : "Searching for active game lobbies..."}
                </p>
                {/* Refresh button: reloads lobbies or page */}
                <button
                  onClick={() => {
                    if (wsStatus === "open") {
                      sendMessage({ type: "show_lobbies" })
                    }
                    window.location.reload()
                  }}
                  disabled={wsStatus !== "open"}
                  className={`
                    px-6 py-3 rounded-full font-semibold transition-all duration-200
                    ${
                      wsStatus === "open"
                        ? "bg-gradient-to-r from-[#741ff5] to-[#9351f7] hover:from-[#9351f7] hover:to-[#e971ff] text-white hover:scale-105"
                        : "bg-gradient-to-r from-[#7b7583] to-[#838383] text-white/70 cursor-not-allowed"
                    }
                  `}
                >
                  {wsStatus === "open" ? "Refresh Lobbies" : "Connecting..."}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default SpectatorLobbyListPage
