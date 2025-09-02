import React from 'react';

/**
 * A reusable, styled input component for forms.
 *
 * @param {object} props - The component's props.
 * @param {string} props.placeholder - The placeholder text for the input.
 * @param {string} props.value - The current value of the input.
 * @param {function} props.onChange - The function to call when the input value changes.
 * @param {string} [props.type='text'] - The type of the input (e.g., 'text', 'password', 'number').
 */
const Input = ({ placeholder, value, onChange, type = "text", className = "", disabled = false, ...props }) => {
  return (
     <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        w-full
        rounded-xl
        border-2
        border-[#2a3441]/50
        bg-gradient-to-r
        from-[#1f152b]
        to-[#0f051d]
        p-4
        text-white
        placeholder-[#b7b4bb]
        transition-all
        duration-200
        focus:border-[#9351f7]
        focus:outline-none
        focus:ring-2
        focus:ring-[#9351f7]/30
        focus:shadow-lg
        focus:shadow-[#9351f7]/20
        hover:border-[#9351f7]/70
        disabled:opacity-50
        disabled:cursor-not-allowed
        disabled:hover:border-[#2a3441]/50
        ${className}
      `}
      {...props}
    />
  );
};

export default Input;
