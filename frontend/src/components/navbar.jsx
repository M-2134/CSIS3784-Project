function NavBar() {
  return (
    <header className="flex justify-between items-center py-4 md:py-6 relative z-10">
      <div className="text-white text-2xl md:text-3xl font-bold">HBlast</div>
      <div className="w-10 h-10 md:w-12 md:h-12">
        <img src="/images/icon.png" alt="HBlast Score Icon" className="w-full h-full object-contain" />
      </div>
    </header>
  )
}

export default NavBar
