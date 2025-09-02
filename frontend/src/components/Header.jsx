import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * A reusable, responsive header component for pages.
 * It ensures the title is centered correctly even with a back button present.
 *
 * @param {object} props - The component's props.
 * @param {string} props.title - The title to display in the header.
 * @param {boolean} [props.showBackButton=false] - If true, displays a back button.
 */
const Header = ({ title, showBackButton = false }) => {
  const navigate = useNavigate();

  return (
    // Using flexbox with justify-between for a robust responsive layout.
    <header className="relative z-10 flex items-center justify-between bg-gray-900/80 p-4 text-white shadow-lg backdrop-blur-sm">
      {/* Left Slot: Contains the back button or an empty space for balance. */}
      <div className="w-10 flex-shrink-0">
        {showBackButton && (
          <button
            onClick={() => navigate(-1)} // Navigates to the previous page
            // Negative margin compensates for padding to align the icon visually.
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>

      {/* Center Slot: The title grows to fill available space but is centered. */}
      {/* The `truncate` class prevents long titles from wrapping and breaking the layout. */}
      <h1 className="flex-grow truncate px-2 text-center text-xl font-bold tracking-wider">
        {title}
      </h1>

      {/* Right Slot: A placeholder to ensure the title remains perfectly centered. */}
      <div className="w-10 flex-shrink-0"></div>
    </header>
  );
};

export default Header;
