import Button from "./ui/button"

function ActionButtons() {
  return (
    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 lg:gap-6 mb-8 md:mb-12 px-4 lg:px-0 w-full max-w-md lg:max-w-lg">
      <Button className="bg-gradient-to-r from-[#741ff5] to-[#9351f7] hover:from-[#9351f7] hover:to-[#e971ff] text-white px-6 md:px-8 lg:px-10 py-2.5 md:py-3 lg:py-4 rounded-full text-base md:text-lg lg:text-xl font-semibold shadow-lg w-full sm:w-auto">
        Play Game
      </Button>
      <Button className="bg-gradient-to-r from-[#9351f7] to-[#e971ff] hover:from-[#e971ff] hover:to-[#fc149f] text-white px-6 md:px-8 lg:px-10 py-2.5 md:py-3 lg:py-4 rounded-full text-base md:text-lg lg:text-xl font-semibold shadow-lg w-full sm:w-auto">
        Spectate Game
      </Button>
    </div>
  )
}

export default ActionButtons
