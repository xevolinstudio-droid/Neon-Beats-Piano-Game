
export interface Tile {
  id: number;
  lane: number; // 0, 1, 2, 3
  y: number; // Percentage 0-100+
  clicked: boolean;
  length: number; // Height in %
  isLong: boolean; 
  isHolding: boolean;
  note: number; 
  visible: boolean;
}

export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  speed: number;
  spawnRate: number;
  hitWindow: {
    perfect: number;
    great: number;
    good: number;
  };
  scoreMultiplier: number;
}

export interface GameConfig {
  laneCount: number;
  speed: number;
  spawnRate: number;
}

export interface Particle {
  id: number;
  x: number; // percent
  y: number; // percent
  vx: number;
  vy: number;
  life: number; // 0 to 1
  color: string;
  size: number;
}

export type Judgment = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';

export interface PopText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
}

// Renamed and simplified for custom links
export interface SCTrack {
  id: number;
  title: string;
  artist: string; // Changed from complex user object to simple string
  artwork_url: string | null;
  stream_url: string; // Now mandatory
  duration: number; // Optional or estimate
}
