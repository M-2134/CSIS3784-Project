import React from 'react';
import { Crown, Trophy, Medal, Award, Target, Zap, TrendingUp } from 'lucide-react'; // Using icons for clarity

/**
 * A reusable leaderboard component to display player scores.
 *
 * @param {object} props - The component's props.
 * @param {Array<object>} props.players - An array of player objects.
 * @param {string} [props.className=''] - Additional classes for styling.
 */
const Leaderboard = ({ players, className = '', showDetailedStats = false }) => {
   const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Crown size={20} className="text-yellow-400 md:w-6 md:h-6" />
      case 1:
        return <Trophy size={18} className="text-gray-300 md:w-5 md:h-5" />
      case 2:
        return <Medal size={18} className="text-amber-600 md:w-5 md:h-5" />
      default:
        return <Award size={16} className="text-[#9351f7] md:w-5 md:h-5" />
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

  const getRankBadge = (index) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-500 to-amber-400"
      case 1:
        return "bg-gradient-to-r from-gray-400 to-gray-300"
      case 2:
        return "bg-gradient-to-r from-amber-600 to-amber-500"
      default:
        return "bg-gradient-to-r from-[#741ff5] to-[#9351f7]"
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

  return (
    <div
      className={`bg-gradient-to-br from-[#1f152b] to-[#0f051d] rounded-2xl p-4 md:p-6 border border-[#2a3441]/30 shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Trophy size={24} className="text-[#e971ff] md:w-7 md:h-7" />
        <h3 className="text-white text-lg md:text-2xl font-bold">Live Leaderboard</h3>
        <div className="w-2 h-2 bg-[#e971ff] rounded-full animate-pulse ml-auto"></div>
      </div>

      <div className="space-y-3 md:space-y-4">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`
              relative p-4 md:p-6 rounded-xl border-2 transition-all duration-500 hover:shadow-2xl transform hover:scale-[1.02]
              ${getRankStyle(index)}
            `}
          >
            {/* Rank Badge */}
            <div
              className={`absolute -top-2 -left-2 w-7 h-7 md:w-10 md:h-10 rounded-full ${getRankBadge(index)} flex items-center justify-center shadow-lg`}
            >
              <span className="text-white text-xs md:text-base font-bold">{index + 1}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1">
                {getRankIcon(index)}

                <div className="min-w-0 flex-1">
                  <div className="text-white font-bold text-base md:text-xl truncate">{player.name}</div>

                  {/* Weapon Badge */}
                  {player.weapon && (
                    <div className="flex items-center gap-1 mt-1">
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium bg-black/30 ${getWeaponColor(player.class)}`}
                      >
                        {player.weapon}
                      </div>
                    </div>
                  )}

                  {showDetailedStats && (
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                      <div className="flex items-center gap-1 text-[#b7b4bb] text-xs md:text-sm">
                        <Target size={12} className="md:w-3.5 md:h-3.5" />
                        <span>{player.hits || 0} hits</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#b7b4bb] text-xs md:text-sm">
                        <TrendingUp size={12} className="md:w-3.5 md:h-3.5" />
                        <span>{player.accuracy || 0}% accuracy</span>
                      </div>
                      {player.score > 0 && (
                        <div className="flex items-center gap-1 text-[#e971ff] text-xs md:text-sm">
                          <Zap size={12} className="md:w-3.5 md:h-3.5" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right ml-2 md:ml-4 flex-shrink-0">
                <div className="text-white text-lg md:text-3xl font-bold">{player.score.toLocaleString()}</div>
                <div className="text-[#b7b4bb] text-xs md:text-sm">points</div>
              </div>
            </div>

            {/* Progress bar for top 3 */}
            {index < 3 && sortedPlayers.length > 0 && (
              <div className="mt-3 md:mt-4 bg-black/30 rounded-full h-1.5 md:h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                      : index === 1
                        ? "bg-gradient-to-r from-gray-400 to-gray-300"
                        : "bg-gradient-to-r from-amber-600 to-amber-500"
                  }`}
                  style={{ width: `${Math.min((player.score / sortedPlayers[0].score) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <div className="text-center py-8">
          <div className="text-[#b7b4bb] text-lg mb-2">No players yet</div>
          <div className="text-[#b7b4bb] text-sm">Waiting for game to start...</div>
        </div>
      )}
    </div>
  )
}

export default Leaderboard;
