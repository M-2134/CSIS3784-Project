import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundDecorations from '../components/BackgroundDecorations'
import NavBar from '../components/navbar'
import HeroSection from '../components/HeroSection'
import GameCards from '../components/GameCards'
import PlayerAvatars from '../components/PlayerAvatars'
import ZigzagDecoration from '../components/ZigzagDecoration'

/**
 * The main landing page for the Laser Tag game.
 * It features an animated background and clear calls to action.
 */
const LandingPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f051d] via-[#1f152b] to-[#0f051d] relative overflow-hidden">
      <BackgroundDecorations />

      {/* Tighter padding to match Figma design */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <NavBar />

        <main className="flex flex-col items-center text-center relative z-10 py-2 md:py-4">
          <HeroSection />
          <GameCards />

          {/* Centered and evenly sized action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8 px-4 w-full max-w-xs sm:max-w-lg justify-center">
            <button
              onClick={() => navigate("/lobby")}
              className="bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] hover:from-[#7c3aed] hover:to-[#a855f7] text-white px-8 md:px-10 py-3 md:py-3.5 rounded-full text-sm md:text-base font-semibold shadow-lg flex-1 sm:min-w-[140px] md:min-w-[160px] transition-all duration-200"
            >
              Play Game
            </button>
            <button
              onClick={() => navigate("/spectate")}
              className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] hover:from-[#a855f7] hover:to-[#c084fc] text-white px-8 md:px-10 py-3 md:py-3.5 rounded-full text-sm md:text-base font-semibold shadow-lg flex-1 sm:min-w-[140px] md:min-w-[160px] transition-all duration-200"
            >
              Spectate Game
            </button>
          </div>

          <PlayerAvatars />
          <ZigzagDecoration />
        </main>
      </div>
    </div>
  )
}

export default LandingPage