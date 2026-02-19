
import { SCTrack } from '../types';

// ==========================================
// 🎵 SONG LIST 
// ==========================================

// 1. Hand-picked Favorites
const HAND_PICKED_SONGS: SCTrack[] = [
    {
        id: 1001, 
        title: "Neon Hit (Fast)", 
        artist: "Standard MP3",
        artwork_url: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=500&auto=format&fit=crop",
        stream_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
        duration: 0
    },
    {
        id: 1002, 
        title: "Drive Track (Try)", 
        artist: "Google Drive",
        artwork_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Google_Drive_logo.png/600px-Google_Drive_logo.png",
        stream_url: "https://drive.google.com/file/d/1_DRj0ftQBy9iWg1AEf_T_qHQWVLZqtbH/view?usp=drivesdk", 
        duration: 0
    },
    {
        id: 1,
        title: "Gypsy (Balam Thanedar)",
        artist: "GD 47",
        artwork_url: "https://i1.sndcdn.com/artworks-5Y3m4a9x5y6w-0-t500x500.jpg",
        stream_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
        duration: 0
    },
    {
        id: 2,
        title: "Bling Bang Bang Born",
        artist: "Creepy Nuts",
        artwork_url: "https://i.scdn.co/image/ab67616d0000b27318728956553147771746f34f",
        stream_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        duration: 0
    }
];

// 2. Procedural Generation for "150 Songs"
const ADJECTIVES = [
    "Neon", "Cyber", "Electric", "Midnight", "Future", "Hyper", "Mega", "Ultra", "Dark", "Light", 
    "Speed", "Bass", "Quantum", "Glitch", "Synth", "Retrowave", "Techno", "Galactic", "Cosmic", "Lunar", 
    "Solar", "Digital", "Virtual", "Binary", "System", "Neural", "Void", "Abyss", "Dream", "Night",
    "Crystal", "Plasma", "Laser", "Sonic", "Atomic", "Radioactive", "Holo", "Meta", "Omni", "Zero"
];

const NOUNS = [
    "City", "Drive", "Rider", "Storm", "Pulse", "Beat", "Wave", "Vibe", "Soul", "Heart", 
    "Mind", "Grid", "Matrix", "Code", "Runner", "Hunter", "Force", "Power", "Energy", "Light", 
    "Star", "Sky", "Ocean", "World", "Dimension", "Realm", "Zone", "Sector", "Gate", "Path",
    "Engine", "Core", "Flux", "Drift", "Shift", "Overdrive", "Ignition", "Fusion", "Reactor", "Signal"
];

const ARTISTS = [
    "Daft Punk Style", "The Weeknd Vibe", "Skrillex Node", "Cyber Divas", "Neon Gods", 
    "Future Bass", "Synthwave King", "Retro Maniac", "Glitch Mob", "Techno Bunker", 
    "Bass Cannon", "Speed Demon", "Galaxy Traveller", "Void Walker", "System Overload", 
    "Neural Net", "Binary Code", "Digital Dream", "Virtual Reality", "Quantum Physics",
    "Alan Walker Flow", "Marshmello Beat", "Avicii Spirit", "Chainsmokers Echo", "Martin Garrix Drop"
];

const generateSongs = (count: number): SCTrack[] => {
    const songs: SCTrack[] = [];
    for (let i = 0; i < count; i++) {
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        const artist = ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
        
        // Cycle through reliable SoundHelix links (1-16) to ensure valid audio playback
        const songIndex = (i % 15) + 1; 
        
        songs.push({
            id: 2000 + i,
            title: `${adj} ${noun}`,
            artist: artist,
            // Use picsum for random diverse artwork
            artwork_url: `https://picsum.photos/seed/${i + 123}/300/300`, 
            stream_url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songIndex}.mp3`,
            duration: 0
        });
    }
    return songs;
};

const SONG_DATABASE: SCTrack[] = [...HAND_PICKED_SONGS, ...generateSongs(150)];

// Helper to convert Google Drive "View" links to "Download" links
const convertDriveLink = (url: string): string => {
    if (url.includes('export=download')) return url;

    // Regex to find Drive ID
    const idRegex = /(?:\/file\/d\/|id=)([a-zA-Z0-9_-]+)(?:\/|$|\?|&)/;
    const match = url.match(idRegex);
    
    if (match && match[1]) {
        return `https://docs.google.com/uc?export=download&id=${match[1]}`;
    }
    return url;
};

// Returns the full list (Simulating a search)
export const searchTracks = async (query: string): Promise<SCTrack[]> => {
    // Simulate a tiny delay for feel
    await new Promise(r => setTimeout(r, 100));
    
    // Filter logic if query exists
    let results = SONG_DATABASE;
    if (query) {
        const lowerQ = query.toLowerCase();
        results = SONG_DATABASE.filter(s => 
            s.title.toLowerCase().includes(lowerQ) || 
            s.artist.toLowerCase().includes(lowerQ)
        );
    }
    
    // Convert all links in database before returning
    return results.map(track => ({
        ...track,
        stream_url: convertDriveLink(track.stream_url)
    }));
};

export const getStreamUrl = (track: SCTrack) => {
    return convertDriveLink(track.stream_url);
};
