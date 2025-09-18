function GameCards() {
  return (
    <div className="relative mb-6 md:mb-8 w-full max-w-sm md:max-w-lg lg:max-w-xl px-4">
      {/* Left card - weapon */}
      <div className="absolute left-2 md:left-6 lg:left-8 top-0 w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl md:rounded-3xl transform -rotate-12 shadow-xl overflow-hidden border border-[#2a3441]/30">
        <img
          src="/images/weapon.jpg"
          alt="Futuristic weapon with glowing elements"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right card - characters */}
      <div className="absolute right-2 md:right-6 lg:right-8 top-4 md:top-6 lg:top-8 w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl md:rounded-3xl transform rotate-12 shadow-xl overflow-hidden border border-[#2a3441]/30">
        <img
          src="/images/characters.jpg"
          alt="Team of tactical players with futuristic weapons"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Spacer for absolute positioned cards */}
      <div className="h-40 md:h-56 lg:h-64"></div>
    </div>
  )
}

export default GameCards