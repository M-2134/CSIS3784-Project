import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackgroundDecorations from "../components/BackgroundDecorations"
import Button from '../components/Button';
// import Leaderboard from '../components/Leaderboard';
import {Crown, Home, Eye, ArrowLeft, Trophy, Medal, Award, Target, Zap } from 'lucide-react';
import { useWebSocket } from '../WebSocketContext';

/**
 * The post-game summary page.
 * Displays the final leaderboard and declares a winner.
 */
const EndGamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [winner, setWinner] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const { ws } = useWebSocket();

  useEffect(() => {
    if (!ws) return;
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'lobby_status' && data.players) {
          // players: array of { id, name, score }
          const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);
          setLeaderboardData(sortedPlayers);
          if (sortedPlayers.length > 0) {
            setWinner(sortedPlayers[0]);
          }
        }
      } catch (e) {}
    };
    ws.addEventListener('message', handleMessage);
    // Optionally, request the latest lobby status on mount
    ws.send(JSON.stringify({ type: 'get_lobby_status', gameId }));
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, gameId]);

   const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Crown size={24} className="text-yellow-400" />
      case 1:
        return <Trophy size={22} className="text-gray-300" />
      case 2:
        return <Medal size={22} className="text-amber-600" />
      default:
        return <Award size={20} className="text-[#9351f7]" />
    }
  }

  const getRankStyle = (index) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-500/30 to-amber-400/30 border-yellow-400/50 shadow-yellow-400/20"
      case 1:
        return "bg-gradient-to-r from-gray-400/30 to-gray-300/30 border-gray-300/50 shadow-gray-300/20"
      case 2:
        return "bg-gradient-to-r from-amber-600/30 to-amber-500/30 border-amber-500/50 shadow-amber-500/20"
      default:
        return "bg-gradient-to-r from-[#741ff5]/30 to-[#9351f7]/30 border-[#9351f7]/50 shadow-[#9351f7]/20"
    }
  }

  return (<div className="min-h-screen bg-gradient-to-br from-[#0f051d] via-[#1f152b] to-[#0f051d] relative overflow-hidden">
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
          <div className="text-[#b7b4bb] text-sm md:text-base">Battle Complete</div>
          <div className="w-8 h-8 md:w-10 md:h-10">
            <img src="/images/icon.png" alt="HBlast Score Icon" className="w-full h-full object-contain" />
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6 relative z-10">
        <div className="mx-auto w-full max-w-4xl space-y-6 md:space-y-8">
          {/* Winner Announcement */}
          {winner && (
            <div className="text-center mb-8 md:mb-12">
              <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-3xl p-6 md:p-8 border-2 border-yellow-400/40 shadow-2xl shadow-yellow-400/20 max-w-md mx-auto">
                <div className="relative mb-6">
                  <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                    <Crown size={40} className="text-black" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#e971ff] rounded-full flex items-center justify-center">
                    <Zap size={16} className="text-white" />
                  </div>
                </div>

                <h2 className="text-lg md:text-xl font-bold text-yellow-400 mb-2">🏆 CHAMPION 🏆</h2>
                <p className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text mb-2">
                  {winner.name}
                </p>
                <div className="text-2xl md:text-3xl font-bold text-[#e971ff]">
                  {winner.score?.toLocaleString()} points
                </div>
                <div className="mt-4 text-sm text-[#b7b4bb]">Dominated the battlefield!</div>
              </div>
            </div>
          )}

          {/* Enhanced Final Leaderboard */}
          <div className="bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-2xl p-4 md:p-6 border border-[#2a3441]/30 shadow-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <Trophy size={24} className="text-[#e971ff]" />
              <h3 className="text-white text-xl md:text-2xl font-bold">Final Standings</h3>
              <div className="w-2 h-2 bg-[#e971ff] rounded-full animate-pulse ml-auto"></div>
            </div>

            <div className="space-y-3 md:space-y-4">
              {leaderboardData.map((player, index) => (
                <div
                  key={player.id}
                  className={`
                    relative p-4 md:p-6 rounded-xl border-2 transition-all duration-500 hover:shadow-2xl transform hover:scale-[1.02]
                    ${getRankStyle(index)}
                  `}
                >
                  {/* Rank Badge */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-[#741ff5] to-[#9351f7] flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm md:text-base font-bold">{index + 1}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1">
                      {getRankIcon(index)}

                      <div className="min-w-0 flex-1">
                        <div className="text-white font-bold text-lg md:text-xl truncate">{player.name}</div>
                        {index === 0 && <div className="text-yellow-400 text-sm font-medium">🏆 Champion</div>}
                        {index === 1 && <div className="text-gray-300 text-sm font-medium">🥈 Runner-up</div>}
                        {index === 2 && <div className="text-amber-600 text-sm font-medium">🥉 Third Place</div>}
                      </div>
                    </div>

                    <div className="text-right ml-2 md:ml-4 flex-shrink-0">
                      <div className="text-white text-xl md:text-3xl font-bold">
                        {player.score?.toLocaleString() || 0}
                      </div>
                      <div className="text-[#b7b4bb] text-xs md:text-sm">points</div>
                    </div>
                  </div>

                  {/* Progress bar for top 3 */}
                  {index < 3 && leaderboardData.length > 0 && (
                    <div className="mt-3 md:mt-4 bg-black/30 rounded-full h-1.5 md:h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          index === 0
                            ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                            : index === 1
                              ? "bg-gradient-to-r from-gray-400 to-gray-300"
                              : "bg-gradient-to-r from-amber-600 to-amber-500"
                        }`}
                        style={{
                          width: `${Math.min((player.score / leaderboardData[0].score) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {leaderboardData.length === 0 && (
              <div className="text-center py-8">
                <div className="text-[#b7b4bb] text-lg mb-2">No battle data available</div>
                <div className="text-[#b7b4bb] text-sm">Results will appear here after the game</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 md:space-y-4 max-w-md mx-auto">
            <Button
              onClick={() => navigate("/spectate")}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-cyan-600 hover:to-teal-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105 py-3 md:py-4 rounded-2xl"
            >
              <div className="flex items-center justify-center gap-2">
                <Eye size={20} />
                <span className="font-semibold">Spectate Other Battles</span>
              </div>
            </Button>

            <Button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-[#7b7583] to-[#838383] hover:from-[#838383] hover:to-[#7b7583] text-white shadow-lg hover:shadow-xl transform hover:scale-105 py-3 md:py-4 rounded-2xl"
            >
              <div className="flex items-center justify-center gap-2">
                <Home size={20} />
                <span className="font-semibold">Return to Home</span>
              </div>
            </Button>
          </div>

          {/* Battle Stats Summary */}
          {leaderboardData.length > 0 && (
            <div className="bg-gradient-to-r from-[#1f152b] to-[#0f051d] rounded-2xl p-4 md:p-6 border border-[#2a3441]/30 shadow-xl max-w-md mx-auto">
              <h4 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                <Target size={20} className="text-[#e971ff]" />
                Battle Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#e971ff]">{leaderboardData.length}</div>
                  <div className="text-xs text-[#b7b4bb]">Warriors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#e971ff]">
                    {Math.max(...leaderboardData.map((p) => p.score || 0)).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#b7b4bb]">Top Score</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EndGamePage;
