import React from 'react';

/**
 * A reusable, styled button for the application.
 *
 * @param {object} props - The component's props.
 * @param {function} props.onClick - The function to execute when the button is clicked.
 * @param {React.ReactNode} props.children - The content displayed inside the button.
 * @param {string} [props.className=''] - Optional additional classes for custom styling.
 * @param {boolean} [props.disabled=false] - If true, the button will be un-clickable.
 */
const Button = ({ onClick, children, className = "", disabled = false, variant = "primary", size = "default" }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-[#741ff5] to-[#9351f7] hover:from-[#9351f7] hover:to-[#e971ff] text-white shadow-lg hover:shadow-xl"
      case "secondary":
        return "bg-gradient-to-r from-[#9351f7] to-[#e971ff] hover:from-[#e971ff] hover:to-[#fc149f] text-white shadow-lg hover:shadow-xl"
      case "outline":
        return "border-2 border-[#9351f7] text-[#9351f7] hover:bg-[#9351f7] hover:text-white"
      case "ghost":
        return "text-white hover:bg-white/10 border border-white/20"
      default:
        return "bg-gradient-to-r from-[#741ff5] to-[#9351f7] hover:from-[#9351f7] hover:to-[#e971ff] text-white shadow-lg hover:shadow-xl"
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return "px-4 py-2 text-sm"
      case "large":
        return "px-8 py-4 text-lg"
      default:
        return "px-6 py-3 text-base"
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full
        transform
        rounded-full
        font-semibold
        transition-all
        duration-200
        ease-in-out
        hover:scale-105
        focus:outline-none
        focus:ring-2
        focus:ring-[#9351f7]
        focus:ring-opacity-50
        disabled:transform-none
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:bg-gradient-to-r
        disabled:from-[#7b7583]
        disabled:to-[#838383]
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${className}
      `}
    >
      {children}
    </button>
  )
};

export default Button;