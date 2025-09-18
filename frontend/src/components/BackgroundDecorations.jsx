function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Large circle - left side near hero text */}
      <div className="absolute top-24 left-8 md:top-32 md:left-16 w-12 h-12 md:w-20 md:h-20 rounded-full bg-[#7b7583] opacity-40"></div>

      {/* Star burst - right side near hero text */}
      <div className="absolute top-20 right-8 md:top-28 md:right-16 w-6 h-6 md:w-10 md:h-10">
        <div className="absolute inset-0 bg-white opacity-80">
          <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-white transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-0.5 h-full bg-white transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-white transform -translate-x-1/2 -translate-y-1/2 rotate-45"></div>
          <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-white transform -translate-x-1/2 -translate-y-1/2 -rotate-45"></div>
        </div>
      </div>

      {/* Diamond - right side near game cards */}
      <div className="absolute top-64 right-6 md:top-80 md:right-12 w-4 h-4 md:w-6 md:h-6 bg-[#9351f7] transform rotate-45 opacity-80"></div>

      {/* Diamond - between game cards */}
      <div className="absolute top-72 left-1/2 transform -translate-x-1/2 md:top-96 w-3 h-3 md:w-4 md:h-4 bg-[#e971ff] rotate-45 opacity-70"></div>

      {/* Circle outline - left side near game cards */}
      <div className="absolute top-80 left-8 md:top-96 md:left-16 w-6 h-6 md:w-10 md:h-10 rounded-full border-2 border-[#7b7583] opacity-50"></div>

      {/* Small diamond - bottom right of game cards */}
      <div className="absolute top-96 right-12 md:top-[28rem] md:right-20 w-2 h-2 md:w-3 md:h-3 bg-[#741ff5] transform rotate-45 opacity-60"></div>
    </div>
  )
}

export default BackgroundDecorations
