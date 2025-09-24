//Marco Pretorius (2024442606)
//JJ Kleynhans (2024158442)

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
// Main component for the landing page of the game
const LandingPage = () => {
  // React Router navigation function
  const navigate = useNavigate()

  // Render the landing page UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f051d] via-[#1f152b] to-[#0f051d] relative overflow-hidden">
  {/* Animated background decorations */}
  <BackgroundDecorations />

      {/* Tighter padding to match Figma design */}
  {/* Main content container with max width and padding */}
  <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
  {/* Navigation bar at the top */}
  <NavBar />

  {/* Main section with hero, game cards, action buttons, avatars, and decoration */}
  <main className="flex flex-col items-center text-center relative z-10 py-2 md:py-4">
          {/* Hero section with title and description */}
          <HeroSection />
          {/* Game cards with info/features */}
          <GameCards />

          {/* Centered and evenly sized action buttons */}
          {/* Action buttons for Play Game and Spectate Game */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8 px-4 w-full max-w-xs sm:max-w-lg justify-center">
            {/* Play Game button navigates to lobby */}
            <button
              onClick={() => navigate("/lobby")}
              className="bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] hover:from-[#7c3aed] hover:to-[#a855f7] text-white px-8 md:px-10 py-3 md:py-3.5 rounded-full text-sm md:text-base font-semibold shadow-lg flex-1 sm:min-w-[140px] md:min-w-[160px] transition-all duration-200"
            >
              Play Game
            </button>
            {/* Spectate Game button navigates to spectate page */}
            <button
              onClick={() => navigate("/spectate")}
              className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] hover:from-[#a855f7] hover:to-[#c084fc] text-white px-8 md:px-10 py-3 md:py-3.5 rounded-full text-sm md:text-base font-semibold shadow-lg flex-1 sm:min-w-[140px] md:min-w-[160px] transition-all duration-200"
            >
              Spectate Game
            </button>
          </div>

          {/* Player avatars and zigzag decoration at the bottom */}
          <PlayerAvatars />
          <ZigzagDecoration />
        </main>
      </div>
    </div>
  )
}

export default LandingPage