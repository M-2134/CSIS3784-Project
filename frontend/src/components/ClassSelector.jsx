
// Correctly import from the /src/game/ directory
import { classList } from '../assets/classDefinitions';

/**
 * A component for selecting a player class, with detailed stats and visuals.
 *
 * @param {object} props - The component's props.
 * @param {string} props.selectedClass - The name of the currently selected class.
 * @param {function} props.onSelectClass - The function to call when a class is selected.
 */
export const ClassSelector = ({ selectedClass, onSelectClass }) => {
  return (
    <div className="w-full space-y-3 text-left">
      <label className="px-4 text-lg font-medium text-gray-300">Choose your Class</label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {classList.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => onSelectClass(c.name)}
            className={`
              rounded-lg p-4 text-left transition-all duration-200
              ${selectedClass === c.name
                ? `ring-2 ring-purple-500 ${c.bgColor} ${c.color}`
                : `border-2 border-transparent bg-gray-800/50 hover:bg-gray-700/50`
              }
            `}
          >
            <div className={`flex items-center gap-3 ${c.iconColor}`}>
              {c.icon}
              <h3 className="text-xl font-bold text-white">{c.name}</h3>
            </div>
            <p className="mt-2 text-sm text-gray-400">{c.description}</p>
            <div className="mt-3 flex justify-between text-sm font-semibold text-gray-300">
              <span>Reload: {c.stats.reload}</span>
              <span>Points: {c.stats.points}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
