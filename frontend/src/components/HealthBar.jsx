import React from 'react';
import { Heart } from 'lucide-react';

/**
 * A visual component to display a health bar.
 * The color changes from green to yellow to red as health decreases.
 *
 * @param {object} props - The component's props.
 * @param {number} props.health - The current health value (0-100).
 */
const HealthBar = ({ health }) => {
  const healthColor =
    health > 60 ? 'bg-green-500' : health > 30 ? 'bg-yellow-500' : 'bg-red-600';

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm font-bold">
        <span className="flex items-center gap-1.5">
          <Heart size={16} className="text-red-500" />
          Health
        </span>
        <span>{health}%</span>
      </div>
      <div className="h-4 w-full rounded-full bg-black/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${healthColor}`}
          style={{ width: `${health}%` }}
        ></div>
      </div>
    </div>
  );
};

export default HealthBar;
