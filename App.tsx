
import React, { useState, useEffect } from 'react';
import { GameState, SCTrack, Difficulty } from './types';
import Game from './components/Game';
import { initAudio } from './utils/audio';
import { searchTracks } from './utils/soundcloud';
import { DIFFICULTIES } from './constants';
import { 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  getUserHighScore, 
  saveUserHighScore, 
  isConfigured, 
  User,
  onAuthStateChanged
} from './utils/firebase';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Song State
  const [songs, setSongs] = useState<SCTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SCTrack | null>(null);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Initialize PWA Install Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    }
  };

  // Initialize Auth Listener
  useEffect(() => {
      if (auth) {
          const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
              setUser(currentUser);
              if (currentUser) {
                  // Load cloud score
                  const cloudScore = await getUserHighScore(currentUser.uid);
                  setHighScore(prev => Math.max(prev, cloudScore));
              }
              setIsAuthLoading(false);
          });
          return () => unsubscribe();
      } else {
          setIsAuthLoading(false);
      }
  }, []);

  useEffect(() => {
      const loadSongs = async () => {
          const list = await searchTracks("");
          setSongs(list);
          if (list.length > 0) setSelectedTrack(list[0]);
      };
      loadSongs();
  }, []);

  const handleLogin = async () => {
      if (!isConfigured) {
          alert("Firebase is not configured in code. Please check utils/firebase.ts");
          return;
      }
      try {
          await loginWithGoogle();
      } catch (e) {
          alert("Login Failed. Check console.");
      }
  };

  const handleLogout = async () => {
      await logoutUser();
      setHighScore(0); 
  };

  const startGame = () => {
    initAudio(); 
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (score: number) => {
    setLastScore(score);
    if (score > highScore) {
      setHighScore(score);
      if (user) {
          saveUserHighScore(user, score);
      }
    }
    setGameState(GameState.GAME_OVER);
  };

  const goToMenu = () => {
    setGameState(GameState.MENU);
  };

  // Background Component for that "Menu Depth" feel
  const MovingBackground = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050510] via-[#0a0a20] to-[#020205]"></div>
        {/* Animated Orbs */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-900/20 rounded-full blur-[120px] animate-[float_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-900/20 rounded-full blur-[100px] animate-[float_15s_ease-in-out_infinite_reverse]" />
        {/* Grid Floor */}
        <div className="absolute bottom-0 w-full h-1/2 opacity-20 cyber-grid-floor" style={{ transform: 'perspective(1000px) rotateX(60deg) scale(2)' }}></div>
    </div>
  );

  return (
    <div className="w-full h-screen text-white overflow-hidden relative selection:bg-cyan-500/30">
      
      {/* --- GLOBAL CINEMATIC BACKGROUND --- */}
      <div className="fixed inset-0 z-0">
         <MovingBackground />
      </div>

      {/* --- MAIN CONTAINER --- */}
      <div className="relative z-10 w-full h-full flex flex-col md:max-w-md md:mx-auto md:h-[95vh] md:mt-[2.5vh] md:rounded-[30px] md:border border-white/10 md:shadow-2xl overflow-hidden bg-black/40 backdrop-blur-sm">
        
        {/* TOP BAR / HEADER */}
        {gameState === GameState.MENU && (
          <header className="w-full p-6 pb-2 flex-shrink-0 z-20">
             {/* User Profile Pill */}
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md pl-1 pr-4 py-1 rounded-full border border-white/10 shadow-lg">
                    {user ? (
                        <>
                           <img src={user.photoURL || 'https://placehold.co/40x40'} className="w-8 h-8 rounded-full border-2 border-cyan-400" alt="Avatar" />
                           <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-white leading-tight uppercase">{user.displayName}</span>
                               <span className="text-[8px] text-cyan-400 font-mono tracking-wider">ONLINE</span>
                           </div>
                        </>
                    ) : (
                        <>
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/20">
                               <span className="text-[10px] font-bold">?</span>
                           </div>
                           <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-gray-400 leading-tight uppercase">GUEST</span>
                               <span className="text-[8px] text-gray-600 font-mono tracking-wider">OFFLINE</span>
                           </div>
                        </>
                    )}
                </div>

                <div className="flex gap-2">
                    {/* INSTALL BUTTON (PWA) */}
                    {installPrompt && (
                        <button 
                            onClick={handleInstallClick}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full text-[10px] font-bold tracking-widest uppercase hover:scale-105 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse"
                        >
                            Install App
                        </button>
                    )}

                    {!user ? (
                        <button 
                            onClick={handleLogin}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full text-[10px] font-bold tracking-widest uppercase hover:scale-105 transition-transform shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                        >
                            Sync Data
                        </button>
                    ) : (
                        <button 
                            onClick={handleLogout}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] text-gray-400 font-bold tracking-widest uppercase transition-colors"
                        >
                            Logout
                        </button>
                    )}
                </div>
             </div>
             
             {/* LOGO HERO */}
             <div className="relative text-center transform hover:scale-105 transition-transform duration-500 cursor-default">
                 <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
                     NEON
                 </h1>
                 <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 -mt-4 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                     BEATS
                 </h1>
                 <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mt-4"></div>
             </div>
          </header>
        )}

        {/* --- MENU CONTENT --- */}
        {gameState === GameState.MENU && (
            <div className="flex-1 overflow-hidden flex flex-col relative px-6 pb-6">
                
                {/* DIFFICULTY SLIDER - Inspired by Racing Games */}
                <div className="mb-6">
                    <div className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase mb-2 ml-1">Sync Intensity</div>
                    <div className="relative p-1 bg-black/40 rounded-xl border border-white/10 backdrop-blur-md flex">
                        {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`flex-1 py-3 relative overflow-hidden rounded-lg transition-all duration-300 group ${difficulty === d ? 'text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                {difficulty === d && (
                                    <div className={`absolute inset-0 opacity-100 transition-opacity bg-gradient-to-br ${
                                        d === 'HARD' ? 'from-red-600 to-rose-900' : 
                                        d === 'MEDIUM' ? 'from-amber-500 to-orange-700' : 
                                        'from-cyan-500 to-blue-700'
                                    }`}></div>
                                )}
                                <span className={`relative z-10 text-xs font-black tracking-widest ${difficulty === d ? 'scale-110' : ''} block transition-transform`}>{d}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* TRACK SELECTION - Holographic List */}
                <div className="flex-1 min-h-0 flex flex-col relative group">
                    <div className="flex justify-between items-baseline mb-2 px-1">
                        <span className="text-[10px] text-cyan-400 font-bold tracking-[0.2em] uppercase animate-pulse">Select Protocol</span>
                        <span className="text-[9px] text-gray-500 font-mono">{songs.length} STREAMS AVAILABLE</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-20 mask-image-b">
                        {songs.map(track => (
                            <div 
                                key={track.id}
                                onClick={() => setSelectedTrack(track)}
                                className={`relative w-full p-3 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                                    selectedTrack?.id === track.id 
                                    ? 'bg-gradient-to-r from-gray-900 to-gray-800 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.15)] translate-x-2' 
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                }`}
                            >
                                {selectedTrack?.id === track.id && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent pointer-events-none" />
                                )}
                                
                                <div className="flex items-center gap-4 relative z-10">
                                    {/* Album Art with Equalizer effect */}
                                    <div className="relative w-12 h-12 shrink-0">
                                        <img 
                                            src={track.artwork_url || ''} 
                                            className={`w-full h-full object-cover rounded-lg shadow-lg ${selectedTrack?.id === track.id ? 'ring-2 ring-cyan-400 grayscale-0' : 'grayscale opacity-60'}`}
                                            alt=""
                                        />
                                        {selectedTrack?.id === track.id && (
                                            <div className="absolute -bottom-1 -right-1 flex gap-0.5 items-end h-3">
                                                <div className="w-1 bg-cyan-400 animate-[bounce_0.5s_infinite] h-full rounded-full"></div>
                                                <div className="w-1 bg-cyan-400 animate-[bounce_0.7s_infinite] h-2/3 rounded-full"></div>
                                                <div className="w-1 bg-cyan-400 animate-[bounce_0.6s_infinite] h-1/2 rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <h4 className={`text-sm font-bold uppercase tracking-wider truncate ${selectedTrack?.id === track.id ? 'text-white' : 'text-gray-400'}`}>
                                            {track.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${selectedTrack?.id === track.id ? 'bg-cyan-900 text-cyan-300' : 'bg-gray-800 text-gray-500'}`}>
                                                MP3
                                            </span>
                                            <span className="text-[10px] text-gray-500 truncate">{track.artist}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* START BUTTON - Fixed Bottom Gradient Overlay */}
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black via-black/90 to-transparent flex items-end justify-center pb-0 z-30">
                        <button 
                            onClick={startGame}
                            className="w-full group relative"
                        >
                             <div className={`absolute -inset-1 rounded-xl blur-lg opacity-60 group-hover:opacity-100 transition duration-500 animate-pulse ${
                                 difficulty === 'HARD' ? 'bg-red-600' : 'bg-cyan-500'
                             }`}></div>
                             <div className={`relative w-full py-5 rounded-xl border flex items-center justify-center gap-3 transition-transform active:scale-[0.98] ${
                                 difficulty === 'HARD' 
                                 ? 'bg-gradient-to-r from-red-900 to-rose-950 border-red-500/50' 
                                 : 'bg-gradient-to-r from-cyan-900 to-slate-900 border-cyan-500/50'
                             }`}>
                                 <span className="font-display font-black text-xl italic tracking-widest text-white drop-shadow-md">
                                     INITIATE LINK
                                 </span>
                                 <svg className="w-5 h-5 text-white animate-bounce-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                 </svg>
                             </div>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- GAMEPLAY VIEW --- */}
        {gameState === GameState.PLAYING && (
          <Game onGameOver={handleGameOver} track={selectedTrack} difficulty={difficulty} />
        )}

        {/* --- GAME OVER VIEW --- */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
             
             {/* "You Died" Style Text */}
             <div className="relative mb-12">
                 <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 tracking-tighter italic scale-y-125 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] glitch-effect">
                     SYSTEM<br/>FAILURE
                 </h2>
                 <div className="w-full h-1 bg-red-600 mt-2 shadow-[0_0_15px_red]"></div>
             </div>

             {/* Score Card */}
             <div className="w-[85%] bg-zinc-900/80 border border-white/10 p-8 rounded-2xl backdrop-blur-md shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                 
                 <div className="flex justify-between items-end mb-6 border-b border-white/5 pb-6">
                     <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">Session Score</span>
                         <span className="text-5xl font-mono font-bold text-white tracking-tighter">{lastScore.toLocaleString()}</span>
                     </div>
                     <div className="text-right">
                         <div className={`text-xs px-2 py-1 rounded bg-white/10 text-white font-bold uppercase tracking-wider ${lastScore > highScore ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : ''}`}>
                             {lastScore >= highScore && highScore > 0 ? 'NEW RECORD' : 'COMPLETE'}
                         </div>
                     </div>
                 </div>

                 <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-400 font-bold uppercase tracking-wider">Cloud Record</span>
                     <span className="text-cyan-400 font-mono font-bold text-xl">{Math.max(lastScore, highScore).toLocaleString()}</span>
                 </div>
             </div>

             {/* Actions */}
             <div className="flex flex-col w-[85%] gap-4 mt-8">
                 <button 
                    onClick={startGame}
                    className="w-full py-4 bg-white text-black font-black text-lg tracking-[0.2em] rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)] uppercase"
                 >
                    Retry Sequence
                 </button>
                 <button 
                    onClick={goToMenu}
                    className="w-full py-4 text-gray-500 font-bold text-xs tracking-[0.2em] hover:text-white transition-colors uppercase"
                 >
                    Abort to Menu
                 </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
