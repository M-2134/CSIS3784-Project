function PlayerAvatars() {
  const avatars = [
    { src: "/images/avatar-01.png", alt: "Player 1 - Man with glasses and beard" },
    { src: "/images/avatar-07.png", alt: "Player 2 - Woman with braided hair" },
    { src: "/images/avatar-03.png", alt: "Player 3 - Person with glasses and curly hair" },
  ]

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 mb-6 md:mb-8 px-4">
      <div className="flex -space-x-3 md:-space-x-4">
        {avatars.map((avatar, index) => (
          <div
            key={index}
            className="w-12 h-12 md:w-16 md:h-16 rounded-full border-3 md:border-4 border-white shadow-lg overflow-hidden"
          >
            <img src={avatar.src || "/placeholder.svg"} alt={avatar.alt} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      <div className="text-center sm:text-left">
        <div className="text-white text-3xl md:text-4xl font-bold">4+</div>
        <div className="text-[#838383] text-xs md:text-sm">session players</div>
      </div>
    </div>
  )
}

export default PlayerAvatars
