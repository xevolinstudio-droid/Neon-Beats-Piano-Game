// Improved synth with Delay for a fuller sound & Audio Analysis

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let audioElement: HTMLAudioElement | null = null;
let proceduralDrumInterval: any = null; // ID for the backup drum machine

// Track active oscillators for sustained notes
const activeNotes: Map<number, { osc: OscillatorNode, gain: GainNode }> = new Map();

// Switched back to SoundHelix as it is often more permissive than modern CDNs in strict webviews
const FALLBACK_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

const PENTATONIC_SCALE = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
  1046.50 // C6
];

export const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.4;
        
        delayNode = audioCtx.createDelay();
        delayNode.delayTime.value = 0.25; 
        const delayFeedback = audioCtx.createGain();
        delayFeedback.gain.value = 0.3; 
        
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256; 

        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        delayNode.connect(masterGain);
        
        masterGain.connect(analyser); 
        analyser.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
};

/**
 * Procedural Drum Engine
 * Generates a kick beat using raw oscillators if MP3s fail.
 */
export const startProceduralDrums = () => {
    stopProceduralDrums(); // Clear existing
    if (!audioCtx) initAudio();
    
    console.log("Starting Procedural Drum Engine (Offline Mode)");
    const tempo = 428; // ~140 BPM
    
    proceduralDrumInterval = setInterval(() => {
        if (!audioCtx) return;
        
        // Kick Drum Synthesis
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination); // Direct output for drums
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);

        // Optional: Add a Hi-hat every off-beat
        setTimeout(() => {
             if (!audioCtx) return;
             const hatOsc = audioCtx.createOscillator();
             const hatGain = audioCtx.createGain();
             // White noise approximation using high frequency random-ish waves usually needs buffer, 
             // but here we use a high square wave for 'digital' hat
             hatOsc.type = 'square';
             hatOsc.frequency.setValueAtTime(800, audioCtx.currentTime);
             hatGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
             hatGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
             
             hatOsc.connect(hatGain);
             hatGain.connect(audioCtx.destination);
             hatOsc.start();
             hatOsc.stop(audioCtx.currentTime + 0.05);
        }, tempo / 2);

    }, tempo);
};

export const stopProceduralDrums = () => {
    if (proceduralDrumInterval) {
        clearInterval(proceduralDrumInterval);
        proceduralDrumInterval = null;
    }
};

/**
 * Tries to load audio. 
 */
const attemptLoad = (url: string, allowCors: boolean): Promise<boolean> => {
    return new Promise((resolve) => {
        // Destroy old instance
        if (audioElement) {
            audioElement.pause();
            audioElement.removeAttribute('src'); 
            audioElement = null;
        }

        const audio = new Audio();
        audioElement = audio;
        
        const isDrive = url.includes('drive.google.com') || url.includes('docs.google.com');

        if (allowCors && !isDrive) {
            audio.crossOrigin = "anonymous";
        } else {
            audio.removeAttribute('crossOrigin'); 
        }

        const onSuccess = () => {
            cleanup();
            try {
                if (audioCtx && analyser && allowCors && !isDrive) {
                    if (sourceNode) { try{ sourceNode.disconnect(); }catch(e){} }
                    sourceNode = audioCtx.createMediaElementSource(audio);
                    sourceNode.connect(analyser);
                    analyser.connect(audioCtx.destination);
                }
            } catch (e) {
                // Visualizer skipped
            }
            
            const p = audio.play();
            if (p !== undefined) {
                p.then(() => resolve(true)).catch(() => resolve(true));
            } else {
                resolve(true);
            }
        };

        const onError = (e: Event | string) => {
            cleanup();
            // We resolve FALSE here to trigger the next backup
            resolve(false);
        };

        const cleanup = () => {
            audio.removeEventListener('canplay', onSuccess);
            audio.removeEventListener('error', onError);
        };

        audio.addEventListener('canplay', onSuccess, { once: true });
        audio.addEventListener('error', onError, { once: true });

        // Set Source
        audio.src = url;
        audio.load();
    });
};

export const playSoundCloudTrack = async (url: string) => {
  stopProceduralDrums(); // Stop any backup beat
  initAudio();
  
  // 1. Try Primary URL (Standard)
  let success = await attemptLoad(url, true);
  
  // 2. If failed, Try Primary URL (No CORS)
  if (!success) {
      success = await attemptLoad(url, false);
  }

  // 3. If still failed, Try Fallback URL
  if (!success) {
      console.log("Switching to standard backup track...");
      success = await attemptLoad(FALLBACK_AUDIO_URL, true);
  }

  // 4. "Brahmastra" - If everything fails, generate our own music
  if (!success) {
      console.warn("All files failed. Activating Procedural Audio Engine.");
      startProceduralDrums();
      // We return true because effectively, "Music" is playing now
  }
};

export const stopSoundCloudTrack = () => {
  stopProceduralDrums();
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
};

export const getAudioData = () => {
  // If procedural drums are playing, we simulate data for visualizer
  if (proceduralDrumInterval && analyser) {
     const bufferLength = analyser.frequencyBinCount;
     const dataArray = new Uint8Array(bufferLength);
     // Create fake visualizer data
     for(let i=0; i<bufferLength; i++) {
         dataArray[i] = Math.random() * 100; // Random noise visual
     }
     // Add a kick spike
     dataArray[0] = 255;
     dataArray[1] = 200;
     return dataArray;
  }

  if (!analyser) return new Uint8Array(0);
  if (!sourceNode) return new Uint8Array(0);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
};

const getFreq = (index: number) => PENTATONIC_SCALE[index % PENTATONIC_SCALE.length];

export const playNote = (index: number) => {
  if (!audioCtx) initAudio();
  if (!audioCtx || !masterGain || !delayNode) return;

  const oscillator = audioCtx.createOscillator();
  const noteGain = audioCtx.createGain();

  const freq = getFreq(index);
  
  oscillator.type = 'triangle'; 
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

  noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
  noteGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
  noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

  oscillator.connect(noteGain);
  noteGain.connect(masterGain);
  noteGain.connect(delayNode); 

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.5);
};

export const startSustainNote = (laneIndex: number, noteIndex: number) => {
  if (!audioCtx) initAudio();
  if (!audioCtx || !masterGain || !delayNode) return;

  stopSustainNote(laneIndex);

  const oscillator = audioCtx.createOscillator();
  const noteGain = audioCtx.createGain();
  const freq = getFreq(noteIndex);

  oscillator.type = 'sawtooth'; 
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

  noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
  noteGain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);

  oscillator.connect(noteGain);
  noteGain.connect(masterGain);
  noteGain.connect(delayNode);

  oscillator.start();
  
  activeNotes.set(laneIndex, { osc: oscillator, gain: noteGain });
};

export const stopSustainNote = (laneIndex: number) => {
  const active = activeNotes.get(laneIndex);
  if (active && audioCtx) {
    active.gain.gain.cancelScheduledValues(audioCtx.currentTime);
    active.gain.gain.setValueAtTime(active.gain.gain.value, audioCtx.currentTime);
    active.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    
    active.osc.stop(audioCtx.currentTime + 0.1);
    activeNotes.delete(laneIndex);
  }
};

export const playMistakeSound = () => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination); 
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
};