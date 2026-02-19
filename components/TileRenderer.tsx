
import React from 'react';
import { Tile } from '../types';
import { TILE_HEIGHT_PERCENT } from '../constants';

interface TileRendererProps {
  tile: Tile;
  isFever: boolean;
}

const TileRenderer: React.FC<TileRendererProps> = ({ tile, isFever }) => {
  if (!tile.visible) return null;

  const renderHeight = tile.length || TILE_HEIGHT_PERCENT;
  const isHolding = tile.isHolding;

  // --- Premium "Cyber Gem" Aesthetics ---

  // Common colors
  const mainColor = isFever ? 'pink' : 'cyan';
  const secondaryColor = isFever ? 'purple' : 'blue';
  
  // Dynamic tail for long notes (shortens as you hold it)
  // Since we don't track original length vs remaining length in current simple physics, 
  // we just render the full tile moving down. 
  // Ideally for "osu mania" style, the tail stays fixed at the top, but here the whole tile moves.
  // We will keep the current behavior but make it look cool.

  return (
    <div
      className={`absolute left-[5%] w-[90%] z-20 transition-transform will-change-transform ${tile.clicked && !tile.isLong ? 'opacity-0 scale-125 duration-150' : ''}`}
      style={{
        height: `${renderHeight}%`, 
        top: `${tile.y}%`,
      }}
    >
      {/* 1. SHORT TILE DESIGN */}
      {!tile.isLong && (
        <div className="relative w-full h-full">
           {/* Main Body - Gem Shape */}
           <div className={`absolute inset-0 rounded-lg bg-gradient-to-b ${isFever ? 'from-fuchsia-400 to-purple-700' : 'from-cyan-300 to-blue-600'} shadow-lg`}>
               {/* Inner Highlight (Glass effect) */}
               <div className="absolute inset-x-1 top-1 bottom-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-t-md opacity-80" />
               
               {/* Center Crystal Core */}
               <div className="absolute inset-0 m-auto w-1/2 h-1/2 bg-white/30 rotate-45 rounded-sm blur-[1px] shadow-[0_0_10px_white]" />
               
               {/* Bottom Bevel */}
               <div className="absolute bottom-0 w-full h-1/4 bg-black/30 rounded-b-lg" />
           </div>
           
           {/* Outer Glow */}
           <div className={`absolute -inset-1 rounded-lg bg-${mainColor}-400 blur-md opacity-50 animate-pulse`} />
        </div>
      )}

      {/* 2. LONG TILE DESIGN */}
      {tile.isLong && (
        <div className="relative w-full h-full">
            {/* The Trail / Body */}
            <div className={`absolute top-2 bottom-2 left-1 right-1 rounded-full overflow-hidden
                ${isFever 
                    ? 'bg-purple-900/80 border-x-2 border-pink-500/50 shadow-[0_0_15px_#ec4899_inset]' 
                    : 'bg-blue-900/80 border-x-2 border-cyan-500/50 shadow-[0_0_15px_#22d3ee_inset]'}
            `}>
                {/* Moving Data Stream Texture */}
                <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTAgMjBMMjAgMEgwdjIweiIvPjwvc3ZnPg==')] animate-scroll-y bg-[length:20px_20px]" />
                
                {/* Center Beam */}
                <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-white/80 blur-[2px] ${isHolding ? 'animate-pulse scale-x-150' : ''}`} />
            </div>

            {/* The Head (Bottom) */}
            <div className={`absolute bottom-0 w-full h-[15%] min-h-[30px] rounded-b-lg z-10
                bg-gradient-to-b ${isFever ? 'from-pink-400 to-purple-600' : 'from-cyan-400 to-blue-700'}
                shadow-[0_4px_10px_rgba(0,0,0,0.5)]
            `}>
                <div className="absolute inset-x-2 top-1 h-1/2 bg-white/40 rounded-full blur-[1px]" />
            </div>

            {/* The Tail (Top) */}
            <div className={`absolute top-0 w-full h-[10%] min-h-[20px] rounded-t-lg
                bg-gradient-to-t ${isFever ? 'from-pink-600 to-purple-800' : 'from-cyan-600 to-blue-800'}
            `}>
                <div className="absolute inset-x-1/4 top-1 h-1 bg-white/30 rounded-full" />
            </div>
            
            {/* Holding Effects */}
            {isHolding && (
                <div className={`absolute inset-0 border-2 ${isFever ? 'border-yellow-200' : 'border-white'} rounded-lg shadow-[0_0_30px_rgba(255,255,255,0.6)] z-30`} />
            )}
        </div>
      )}
    </div>
  );
};

export default TileRenderer;
