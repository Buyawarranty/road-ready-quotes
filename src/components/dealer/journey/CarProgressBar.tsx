import React from 'react';
import { Check, Car } from 'lucide-react';

interface Step {
  n: number;
  label: string;
}

interface CarProgressBarProps {
  steps: Step[];
  currentStep: number; // 1-indexed
}

/**
 * Slim horizontal progress bar with an animated car that travels along
 * the completed portion of the track. Designed to be unobtrusive but delightful.
 */
export const CarProgressBar: React.FC<CarProgressBarProps> = ({ steps, currentStep }) => {
  const total = steps.length;
  // Car sits on the *current* step marker
  const progressPct = total <= 1 ? 100 : ((currentStep - 1) / (total - 1)) * 100;

  return (
    <div className="w-full">
      <div className="relative px-3 pt-6 pb-2">
        {/* Track */}
        <div className="relative h-1.5 bg-gray-200 rounded-full">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />

          {/* Animated car */}
          <div
            className="absolute -top-5 -translate-x-1/2 transition-all duration-700 ease-out"
            style={{ left: `${progressPct}%` }}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#eb4b00] shadow-lg shadow-orange-500/30 flex items-center justify-center ring-4 ring-white animate-[wiggle_2.5s_ease-in-out_infinite]">
                <Car className="w-4.5 h-4.5 text-white" strokeWidth={2.5} style={{ width: 18, height: 18 }} />
              </div>
              {/* Exhaust puffs */}
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-300/70 animate-[puff_1.6s_ease-out_infinite]" />
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-gray-300/40 animate-[puff_1.6s_ease-out_infinite_0.4s]" />
            </div>
          </div>

          {/* Step markers */}
          {steps.map((s, idx) => {
            const pos = total <= 1 ? 0 : (idx / (total - 1)) * 100;
            const done = idx + 1 < currentStep;
            const active = idx + 1 === currentStep;
            return (
              <div
                key={s.n}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${pos}%` }}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
                    done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : active
                      ? 'bg-white border-[#eb4b00] text-[#eb4b00]'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {done ? <Check className="w-3 h-3" strokeWidth={3} /> : s.n}
                </div>
              </div>
            );
          })}
        </div>

        {/* Labels */}
        <div className="relative mt-3 h-4">
          {steps.map((s, idx) => {
            const pos = total <= 1 ? 0 : (idx / (total - 1)) * 100;
            const done = idx + 1 < currentStep;
            const active = idx + 1 === currentStep;
            return (
              <div
                key={s.n}
                className="absolute -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap"
                style={{
                  left: `${pos}%`,
                  color: active ? '#eb4b00' : done ? '#059669' : '#9ca3af',
                }}
              >
                {s.label}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-1px) rotate(-2deg); }
          75% { transform: translateY(-1px) rotate(2deg); }
        }
        @keyframes puff {
          0% { opacity: 0.7; transform: translate(0, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-10px, -50%) scale(0.4); }
        }
      `}</style>
    </div>
  );
};

export default CarProgressBar;
