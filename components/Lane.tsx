
import React, { useState } from 'react';
import { Tile } from '../types';
import TileRenderer from './TileRenderer';
import { HIT_ZONE_PERCENT } from '../constants';

interface LaneProps {
  laneIndex: number;
  tiles: Tile[];
  onLaneDown: (laneIndex: number) => void;
  onLaneUp: (laneIndex: number) => void;
  isFever: boolean;
}

const Lane: React.FC<LaneProps> = ({ laneIndex, tiles, onLaneDown, onLaneUp, isFever }) => {
  const [isActive, setIsActive] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsActive(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    onLaneDown(laneIndex);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsActive(false);
    try {
        (e.target as Element).releasePointerCapture(e.pointerId);
    } catch(err) { }
    onLaneUp(laneIndex);
  };

  // Colors
  const laneBorderColor = 'border-white/5';
  // When active, we want a strong laser beam effect
  const activeBg = isFever 
    ? 'bg-gradient-to-t from-pink-500/40 via-pink-500/10 to-transparent' 
    : 'bg-gradient-to-t from-cyan-400/30 via-cyan-400/5 to-transparent';
  
  return (
    <div
      className={`relative h-full flex-1 border-r ${laneBorderColor} last:border-r-0 transition-colors duration-75 cursor-pointer touch-none ${isActive ? activeBg : 'bg-transparent'}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp} 
    >
      {/* Side Guides */}
      <div className="absolute left-0 bottom-0 top-0 w-px bg-white/5" />
      
      {/* TILES */}
      <div className="relative w-full h-full z-10">
        {tiles.map((tile) => (
            <TileRenderer key={tile.id} tile={tile} isFever={isFever} />
        ))}
      </div>

      {/* HIT TARGET ZONE (The "Laser Line") */}
      <div 
        className={`absolute w-full h-[2px] pointer-events-none z-20
        ${isFever 
            ? 'bg-pink-500 shadow-[0_0_15px_#ec4899]' 
            : 'bg-cyan-400 shadow-[0_0_15px_#22d3ee]'
        }`}
        style={{ bottom: `${100 - HIT_ZONE_PERCENT}%` }} 
      />

      {/* VIRTUAL PIANO KEY (Bottom Anchor) */}
      <div className="absolute bottom-0 w-full h-[15%] flex items-end justify-center pb-2 pointer-events-none z-20">
         <div 
            className={`w-[80%] h-[60%] rounded-b-lg border-x border-b border-white/20 transition-all duration-100
            ${isActive 
                ? (isFever ? 'bg-pink-500/80 shadow-[0_0_20px_#ec4899] translate-y-1' : 'bg-cyan-500/80 shadow-[0_0_20px_#22d3ee] translate-y-1') 
                : 'bg-black/40 backdrop-blur-sm'
            }`}
         >
            {/* Key Shine */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-white/50" />
         </div>
      </div>
      
      {/* IMPACT FLASH (Above Key) */}
      <div 
         className={`absolute bottom-[15%] w-full transition-all duration-75 mix-blend-screen pointer-events-none
         ${isActive 
            ? (isFever ? 'bg-pink-400/40 h-32 blur-xl opacity-100' : 'bg-cyan-400/40 h-32 blur-xl opacity-100') 
            : 'h-0 opacity-0'
         }`} 
      />
    </div>
  );
};

export default Lane;
