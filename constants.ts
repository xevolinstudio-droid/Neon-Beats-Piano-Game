
import { Difficulty, DifficultyConfig } from './types';

export const LANE_COUNT = 4;
export const TILE_HEIGHT_PERCENT = 25; 
export const HIT_ZONE_PERCENT = 85; 

// Long Tile Config
export const TILE_LONG_MIN_LENGTH = 50;
export const TILE_LONG_MAX_LENGTH = 80;

// Colors
export const COLOR_PERFECT = '#22d3ee'; // Cyan
export const COLOR_GREAT = '#a78bfa';   // Purple
export const COLOR_GOOD = '#fbbf24';    // Amber
export const COLOR_MISS = '#ef4444';    // Red

// Advanced Features
export const FEVER_THRESHOLD = 20;
export const COLOR_FEVER = '#f472b6';   // Pink/Magenta for Fever

// Difficulty Settings
export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  EASY: {
    id: 'EASY',
    label: 'EASY',
    speed: 45,       // Slower
    spawnRate: 450,  // Less frequent
    hitWindow: {
      perfect: 15,   // Easier to get perfect
      great: 30,
      good: 45       // Very forgiving miss window
    },
    scoreMultiplier: 1.0
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'MEDIUM',
    speed: 65,       // Standard
    spawnRate: 350,
    hitWindow: {
      perfect: 10,
      great: 25,
      good: 35
    },
    scoreMultiplier: 1.5
  },
  HARD: {
    id: 'HARD',
    label: 'HARD',
    speed: 95,       // Fast!
    spawnRate: 280,  // Chaotic
    hitWindow: {
      perfect: 7,    // Strict
      great: 15,
      good: 25       // Tight miss window
    },
    scoreMultiplier: 2.0
  }
};
