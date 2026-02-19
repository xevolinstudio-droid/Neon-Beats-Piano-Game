
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Tile, Particle, PopText, Judgment, SCTrack, Difficulty } from '../types';
import { 
  LANE_COUNT, TILE_HEIGHT_PERCENT, HIT_ZONE_PERCENT,
  TILE_LONG_MIN_LENGTH, TILE_LONG_MAX_LENGTH,
  COLOR_PERFECT, COLOR_GREAT, COLOR_GOOD, COLOR_MISS,
  FEVER_THRESHOLD, COLOR_FEVER, DIFFICULTIES
} from '../constants';
import Lane from './Lane';
import { 
  playNote, startSustainNote, stopSustainNote, playMistakeSound, 
  getAudioData, playSoundCloudTrack, stopSoundCloudTrack, initAudio, stopProceduralDrums 
} from '../utils/audio';
import { getStreamUrl } from '../utils/soundcloud';

interface GameProps {
  onGameOver: (score: number) => void;
  track?: SCTrack | null;
  difficulty: Difficulty;
}

const Game: React.FC<GameProps> = ({ onGameOver, track, difficulty }) => {
  const config = DIFFICULTIES[difficulty];

  // --- Rendering State ---
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [popTexts, setPopTexts] = useState<PopText[]>([]);
  const [combo, setCombo] = useState(0);
  const [screenShake, setScreenShake] = useState(0);
  
  // Advanced Features State
  const [isFever, setIsFever] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [bgIntensity, setBgIntensity] = useState(0);
  
  // --- Game Flow State ---
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [loadingText, setLoadingText] = useState("SYSTEM INITIALIZING...");

  // --- Refs ---
  const gameStateRef = useRef<GameState>(GameState.PLAYING);
  const tilesRef = useRef<Tile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popTextsRef = useRef<PopText[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const screenShakeRef = useRef(0); 
  
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const speedRef = useRef(config.speed);
  const tileIdCounter = useRef(0);
  const particleIdCounter = useRef(0);
  const popTextIdCounter = useRef(0);
  const animationFrameId = useRef<number>(0);
  const isGameRunningRef = useRef(false);

  // Audio Analysis Refs
  const laneCooldowns = useRef<number[]>([0,0,0,0]);
  const beatCounter = useRef(0); 

  const startCountdown = () => {
      setCountdown(3);
      let count = 3;
      const interval = setInterval(() => {
          count--;
          if (count > 0) {
              setCountdown(count);
          } else if (count === 0) {
              setCountdown(0); 
          } else {
              clearInterval(interval);
              setCountdown(null);
              isGameRunningRef.current = true;
          }
      }, 600);
  };

  const handleStart = async () => {
      initAudio();
      setIsLoadingAudio(true);
      setLoadingText("SYNCING...");
      
      if (track) {
          const url = getStreamUrl(track);
          setLoadingText("ESTABLISHING LINK...");
          await playSoundCloudTrack(url);
      }
      
      setIsLoadingAudio(false);
      setIsReady(true);
      startCountdown();
  };

  // --- Visual Helpers ---
  const spawnParticles = (laneIndex: number, yPos: number, color: string, count = 12) => {
    const laneWidth = 25; 
    const centerX = laneIndex * laneWidth + laneWidth / 2;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 80 + 30; // Faster, snappier particles
      
      particlesRef.current.push({
        id: particleIdCounter.current++,
        x: centerX,
        y: yPos, 
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: color,
        size: Math.random() * 1.0 + 0.2 // Smaller, sharper particles
      });
    }
  };

  const spawnText = (text: string, color: string) => {
    popTextsRef.current.push({
      id: popTextIdCounter.current++,
      text,
      color,
      x: 50, 
      y: 35, 
      life: 0.5 
    });
  };

  const triggerShake = (amount: number) => {
    // Add cumulative shake for intensity
    screenShakeRef.current = Math.min(screenShakeRef.current + amount, 20);
    setScreenShake(screenShakeRef.current);
  };

  // --- Spawning Logic with Collision Detection ---
  const spawnTile = useCallback((laneIndex?: number) => {
    const isLaneFree = (l: number) => {
        const laneTiles = tilesRef.current.filter(t => t.lane === l);
        if (laneTiles.length === 0) return true;
        const topTile = laneTiles.reduce((prev, curr) => prev.y < curr.y ? prev : curr);
        return topTile.y > -5; 
    };

    let lane = laneIndex;

    if (lane === undefined) {
        const freeLanes = [0, 1, 2, 3].filter(l => isLaneFree(l));
        if (freeLanes.length === 0) return;
        lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    } else {
        if (!isLaneFree(lane)) return;
    }

    const isLong = Math.random() < 0.25; 
    const length = isLong 
        ? Math.random() * (TILE_LONG_MAX_LENGTH - TILE_LONG_MIN_LENGTH) + TILE_LONG_MIN_LENGTH
        : TILE_HEIGHT_PERCENT;

    const tile: Tile = {
        id: tileIdCounter.current++,
        lane,
        y: -length, 
        clicked: false,
        length,
        isLong,
        isHolding: false,
        note: Math.floor(Math.random() * 11), 
        visible: true
    };

    tilesRef.current.push(tile);
  }, []);

  // --- Main Update Loop ---
  const update = useCallback((time: number) => {
    if (gameStateRef.current !== GameState.PLAYING) return;
    
    if (!isGameRunningRef.current) {
        lastTimeRef.current = time;
        animationFrameId.current = requestAnimationFrame(update);
        return;
    }

    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    // 1. Audio Logic & Spawning
    let spawnedFromMusic = false;

    if (track) {
      const data = getAudioData();
      let totalEnergy = 0;
      for(let i=0; i<data.length; i++) totalEnergy += data[i];
      
      if (data.length > 0 && totalEnergy > 500) { 
        setBgIntensity(Math.min(1, totalEnergy / 20000));

        const getAverageEnergy = (start: number, end: number) => {
           let sum = 0;
           for(let i=start; i<end; i++) sum += data[i];
           return sum / (end-start);
        };

        const bands = [
            getAverageEnergy(0, 4),    
            getAverageEnergy(4, 12),   
            getAverageEnergy(12, 40),  
            getAverageEnergy(40, 100)  
        ];

        const thresholds = [200, 190, 180, 170];
        
        for(let i=0; i<4; i++) {
            if (laneCooldowns.current[i] > 0) laneCooldowns.current[i] -= deltaTime;
        }

        bands.forEach((energy, i) => {
             if (energy > thresholds[i] && laneCooldowns.current[i] <= 0) {
                 spawnTile(i);
                 laneCooldowns.current[i] = 0.25 + Math.random() * 0.2; 
                 spawnedFromMusic = true;
             }
        });
      } 
    }
    
    if (!spawnedFromMusic) {
      const baseRate = config.spawnRate;
      const difficultyMod = Math.min(200, scoreRef.current * 1.5);
      let currentSpawnRate = Math.max(150, baseRate - difficultyMod); 
      
      beatCounter.current += deltaTime;
      if (beatCounter.current > 1.0) beatCounter.current = 0; 
      if (beatCounter.current > 0.8 && beatCounter.current < 0.9) currentSpawnRate = currentSpawnRate * 0.5;

      if (time - lastSpawnRef.current > currentSpawnRate) {
          spawnTile();
          if (Math.random() > 0.9 && scoreRef.current > 50) {
             const lane1 = tilesRef.current[tilesRef.current.length-1].lane;
             const lane2 = (lane1 + 1 + Math.floor(Math.random()*2)) % 4;
             spawnTile(lane2);
          }
          lastSpawnRef.current = time;
      }
    }

    // 2. Move Tiles & Scoring Logic
    const speed = speedRef.current;
    let gameOver = false;
    const hitZoneY = HIT_ZONE_PERCENT;

    tilesRef.current.forEach(tile => {
        tile.y += speed * deltaTime;

        // --- HOLDING LOGIC ---
        if (tile.isHolding && tile.visible) {
            if (tile.y > hitZoneY) {
                // Completed the long tile
                tile.visible = false;
                tile.isHolding = false;
                stopSustainNote(tile.lane);
                
                const points = 50 * config.scoreMultiplier * (isFever ? 2 : 1);
                scoreRef.current += Math.floor(points);
                
                spawnParticles(tile.lane, 90, isFever ? COLOR_FEVER : COLOR_PERFECT, 20);
                spawnText("PERFECT", isFever ? COLOR_FEVER : COLOR_PERFECT);
                setScore(scoreRef.current);
            } else {
                // Currently holding (Tick Score)
                // Add score continuously while holding!
                const holdBonus = isFever ? 4 : 2; 
                scoreRef.current += holdBonus;
                setScore(scoreRef.current);

                // Frequent feedback for holding
                if (Math.random() > 0.8) {
                    spawnParticles(tile.lane, hitZoneY, '#fff', 1); 
                }
            }
        }

        const tileBottom = tile.y + tile.length;
        if (tileBottom > 100 && !tile.clicked && tile.visible) {
            gameOver = true;
        }
        if (!tile.isLong && tile.y > 100 && !tile.clicked && tile.visible) {
            gameOver = true;
        }
    });

    particlesRef.current.forEach(p => {
        p.x += p.vx * deltaTime * 0.5;
        p.y += p.vy * deltaTime;
        p.life -= deltaTime * 3;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    popTextsRef.current.forEach(pt => {
        pt.y -= 10 * deltaTime;
        pt.life -= deltaTime * 2; // Faster text fade for cleaner UI
    });
    popTextsRef.current = popTextsRef.current.filter(pt => pt.life > 0);

    tilesRef.current = tilesRef.current.filter(t => t.y < 120 && (t.visible || t.y < 120));

    if (gameOver) {
        handleGameOver();
    } else {
        setTiles([...tilesRef.current]);
        setParticles([...particlesRef.current]);
        setPopTexts([...popTextsRef.current]);
        
        if (screenShakeRef.current > 0) {
            screenShakeRef.current = Math.max(0, screenShakeRef.current - deltaTime * 30);
            setScreenShake(screenShakeRef.current);
        }

        animationFrameId.current = requestAnimationFrame(update);
    }
  }, [spawnTile, track, isFever, config]);

  const updateMultiplier = (currentCombo: number) => {
      let mul = 1;
      if (currentCombo >= 50) mul = 8;
      else if (currentCombo >= 25) mul = 4;
      else if (currentCombo >= 10) mul = 2;
      setMultiplier(mul);

      if (currentCombo >= FEVER_THRESHOLD && !isFever) {
          setIsFever(true);
          spawnText("MAXIMUM OVERDRIVE", COLOR_FEVER);
          triggerShake(5); 
      } else if (currentCombo < FEVER_THRESHOLD && isFever) {
          setIsFever(false);
      }
  };

  const handleGameOver = () => {
    isGameRunningRef.current = false;
    gameStateRef.current = GameState.GAME_OVER;
    playMistakeSound();
    stopSoundCloudTrack(); 
    [0,1,2,3].forEach(l => stopSustainNote(l));
    cancelAnimationFrame(animationFrameId.current);
    triggerShake(15);
    setTimeout(() => {
        onGameOver(scoreRef.current);
    }, 600);
  };

  const handleLaneDown = (laneIndex: number) => {
    if (gameStateRef.current !== GameState.PLAYING) return;
    if (!isGameRunningRef.current) return;

    const laneTiles = tilesRef.current
        .filter(t => t.lane === laneIndex && !t.clicked && t.visible)
        .sort((a, b) => b.y - a.y);

    const targetTile = laneTiles[0];

    if (targetTile) {
        const tileBottom = targetTile.y + targetTile.length;
        const dist = Math.abs(tileBottom - HIT_ZONE_PERCENT);
        
        if (dist < config.hitWindow.good) {
            let judgment: Judgment = 'GOOD';
            let color = COLOR_GOOD;
            let basePoints = 1;

            if (dist < config.hitWindow.perfect) {
                judgment = 'PERFECT';
                color = COLOR_PERFECT;
                basePoints = 3;
                triggerShake(2); // Shake on perfect hit
            } else if (dist < config.hitWindow.great) {
                judgment = 'GREAT';
                color = COLOR_GREAT;
                basePoints = 2;
                triggerShake(1);
            }

            if (isFever) {
                color = COLOR_FEVER;
                basePoints *= 2;
            }

            targetTile.clicked = true;
            
            if (targetTile.isLong) {
                targetTile.isHolding = true;
                startSustainNote(laneIndex, targetTile.note);
            } else {
                playNote(targetTile.note);
                targetTile.visible = false; 
            }
            
            const currentMul = multiplier; 
            scoreRef.current += Math.floor(basePoints * currentMul * config.scoreMultiplier);
            comboRef.current += 1;
            
            setScore(scoreRef.current);
            setCombo(comboRef.current);
            updateMultiplier(comboRef.current);
            
            if (speedRef.current < config.speed * 1.5) speedRef.current += 0.05; 

            spawnParticles(laneIndex, HIT_ZONE_PERCENT, color, isFever ? 20 : 12);
            spawnText(judgment, color);
        } else {
          spawnText("MISS", COLOR_MISS);
          comboRef.current = 0;
          setCombo(0);
          updateMultiplier(0);
          handleGameOver();
        }
    } else {
        spawnText("MISS", COLOR_MISS);
        comboRef.current = 0;
        setCombo(0);
        updateMultiplier(0);
        handleGameOver();
    }
  };

  const handleLaneUp = (laneIndex: number) => {
      const heldTile = tilesRef.current.find(t => t.lane === laneIndex && t.isHolding && t.visible);
      
      if (heldTile) {
          stopSustainNote(laneIndex);
          heldTile.isHolding = false;
          
          if (heldTile.y < HIT_ZONE_PERCENT - 10) {
               spawnText("SLIP", '#ffa500');
               setCombo(0);
               comboRef.current = 0;
               updateMultiplier(0);
               heldTile.visible = false; 
          } else {
              heldTile.visible = false;
              spawnParticles(laneIndex, HIT_ZONE_PERCENT, isFever ? COLOR_FEVER : COLOR_PERFECT, 10);
          }
      }
  };

  useEffect(() => {
    return () => {
        [0,1,2,3].forEach(l => stopSustainNote(l));
        stopSoundCloudTrack();
        stopProceduralDrums();
    };
  }, []);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(update);
    return () => {
        cancelAnimationFrame(animationFrameId.current);
    };
  }, [update]);

  // Smoother Shake
  const bgStyle = {
      transform: `translate(${Math.random() * screenShake * 0.5}px, ${Math.random() * screenShake * 0.5}px)`,
  };

  return (
    <div 
        className="relative w-full h-full bg-black overflow-hidden select-none font-['Rajdhani']"
        style={bgStyle}
    >
      {/* 1. CINEMATIC BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none" style={{ perspective: '800px', overflow: 'hidden' }}>
          {/* Deep Space Atmosphere */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e1b4b_0%,_#000_80%)]"></div>
          
          {/* Moving Stars/Dust */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50"></div>

          {/* Floor Grid with Horizon Fog */}
          <div 
             className="absolute inset-x-[-100%] top-0 h-[200%] cyber-grid-floor opacity-40"
             style={{ 
                 transform: 'rotateX(55deg) translateY(-20%)',
                 boxShadow: `inset 0 0 150px 100px #000`, // Heavy vignette on grid
                 filter: `drop-shadow(0 0 10px ${isFever ? '#ec4899' : '#06b6d4'})`
             }}
          />
          
          {/* Horizon Line Light */}
          <div className={`absolute top-[25%] left-0 w-full h-1 bg-gradient-to-r from-transparent ${isFever ? 'via-pink-500' : 'via-cyan-500'} to-transparent blur-md opacity-50`}></div>
      </div>
      
      {/* 2. GAME BOARD (3D Perspective) */}
      <div className="absolute inset-0 flex flex-col" style={{ perspective: '800px' }}>
         <div 
            className="relative w-full h-[110%] -top-[5%] flex flex-row z-10 px-0 md:px-2"
            style={{ 
                transform: 'rotateX(25deg)', // Deeper angle for arcade feel
                transformStyle: 'preserve-3d'
            }}
         >
            {[0, 1, 2, 3].map(i => (
              <Lane 
                key={i} 
                laneIndex={i} 
                tiles={tiles.filter(t => t.lane === i)} 
                onLaneDown={handleLaneDown} 
                onLaneUp={handleLaneUp}
                isFever={isFever}
              />
            ))}
         </div>
      </div>

      {/* 3. PARTICLES & TEXT */}
      <div className="absolute inset-0 pointer-events-none z-20">
         {particles.map(p => (
            <div 
                key={p.id}
                className="absolute rounded-full"
                style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.size}vh`, 
                    height: `${p.size}vh`,
                    backgroundColor: p.color,
                    opacity: p.life,
                    boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`, // Intense glow
                    transform: 'translate(-50%, -50%)'
                }}
            />
         ))}
      </div>

      <div className="absolute inset-0 pointer-events-none z-30 flex justify-center">
         {popTexts.map(pt => (
            <div 
                key={pt.id}
                className="absolute text-5xl font-black italic tracking-tighter drop-shadow-[0_0_15px_currentColor]"
                style={{
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    color: pt.color,
                    opacity: pt.life,
                    transform: `translate(-50%, 0) scale(${1 + (0.5-pt.life * 0.5)}) rotate(${Math.random() * 10 - 5}deg)` // Random tilt
                }}
            >
                {pt.text}
            </div>
         ))}
      </div>

      {/* 4. PROFESSIONAL HUD (Heads Up Display) */}
      <div className="absolute top-0 w-full p-6 flex flex-col pointer-events-none z-40">
         
         {/* Top Bar Status */}
         <div className="flex w-full justify-between items-start">
             {/* Score Container */}
             <div className="flex flex-col items-start">
                 <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isFever ? 'bg-pink-500 animate-ping' : 'bg-cyan-500'}`}></div>
                    <span className="text-[10px] text-gray-400 tracking-[0.2em] font-bold">CURRENT SCORE</span>
                 </div>
                 <div className={`text-5xl font-mono font-bold text-white leading-none ${isFever ? 'text-pink-300 drop-shadow-[0_0_15px_#ec4899]' : ''}`}>
                    {score.toLocaleString().padStart(6, '0')}
                 </div>
             </div>

             {/* Multiplier / Fever Gauge */}
             <div className="flex flex-col items-end">
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-gray-400 tracking-[0.2em] font-bold">MULTIPLIER</span>
                 </div>
                 <div className="flex items-baseline gap-1">
                     <span className="text-2xl text-gray-500 font-bold">x</span>
                     <span className={`text-4xl font-black italic ${multiplier >= 4 ? 'text-yellow-400' : 'text-white'}`}>{multiplier}</span>
                 </div>
             </div>
         </div>

         {/* Center Combo Display (Dynamic) */}
         <div className="absolute top-24 left-0 w-full flex flex-col items-center justify-center transition-transform duration-100" style={{ transform: `scale(${1 + (combo > 10 ? 0.1 : 0)})` }}>
             {isFever && <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 animate-pulse tracking-widest drop-shadow-[0_0_20px_rgba(236,72,153,0.8)] italic transform -skew-x-12">OVERDRIVE</div>}
             {combo > 5 && (
                 <div className="flex flex-col items-center">
                    <div className={`text-6xl font-black ${isFever ? 'text-white' : 'text-cyan-200'} tracking-tighter drop-shadow-lg`}>{combo}</div>
                    <div className="text-xs font-bold tracking-[0.5em] text-cyan-500/80">COMBO</div>
                 </div>
             )}
         </div>

         {/* Track Info (Subtle Bottom Left) */}
         {track && (
             <div className="fixed bottom-4 left-4 flex items-center gap-3 opacity-60">
                 <div className="w-1 h-8 bg-cyan-500"></div>
                 <div className="flex flex-col">
                     <span className="text-xs font-bold text-white uppercase tracking-wider">{track.title}</span>
                     <span className="text-[10px] text-gray-400 uppercase">{track.artist}</span>
                 </div>
             </div>
         )}
      </div>

      {/* 5. OVERLAY UI ELEMENTS */}
      {!isReady && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
           {/* Futuristic Spinner */}
           <div className="w-16 h-16 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-6"></div>
           
           <h2 className="text-2xl font-black text-white tracking-[0.3em] animate-pulse">
               {isLoadingAudio ? 'SYNCHRONIZING AUDIO...' : 'SYSTEM READY'}
           </h2>
           {!isLoadingAudio && (
               <button 
                onClick={handleStart}
                className="mt-8 px-12 py-4 bg-white text-black font-black tracking-widest uppercase hover:bg-cyan-400 transition-colors skew-x-[-10deg]"
               >
                   <span className="skew-x-[10deg] block">Engage</span>
               </button>
           )}
           <div className="mt-4 text-[10px] text-gray-500 font-mono">{loadingText}</div>
        </div>
      )}

      {/* COUNTDOWN (Cinematic) */}
      {countdown !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div key={countdown} className="text-[150px] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 animate-ping drop-shadow-[0_0_50px_rgba(255,255,255,0.8)]">
                  {countdown === 0 ? "GO" : countdown}
              </div>
          </div>
      )}
      
      {/* Post-Processing Layers */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-40 z-40"></div>
    </div>
  );
};

export default Game;
