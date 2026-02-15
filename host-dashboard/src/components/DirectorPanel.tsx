import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModules, syncAssetToViewer, sendIntensity, sendFlash, sendInduction } from '../services/api';
import { getAssetUrl } from '../utils/urlHelper';
import { useActiveState } from './ActiveStateContext';

// Define Induction Layer States (Local for now, eventually synced)
interface InductionState {
    spiral: boolean;
    flashback: boolean;
    breathing: boolean;
}

const DirectorPanel = () => {
    const navigate = useNavigate();
    const { activeState } = useActiveState();

    // Data State
    const [folders, setFolders] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Playback State
    const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Control State
    const [intensity, setIntensity] = useState(5); // 1-10
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<number | null>(null);

    // Induction Layers
    const [induction, setInduction] = useState<InductionState>({
        spiral: false,
        flashback: false,
        breathing: false
    });

    // Initial Fetch
    useEffect(() => {
        const fetchFolders = async () => {
            try {
                const modules = await getModules();
                const allFolders: any[] = [];
                modules.forEach((m: any) => {
                    if (m.folders) {
                        m.folders.forEach((f: any) => {
                            allFolders.push({ ...f, moduleName: m.name });
                        });
                    }
                });
                setFolders(allFolders);
            } catch (error) {
                console.error("Error fetching folders:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFolders();
    }, []);

    // Load assets when folder changes
    useEffect(() => {
        if (activeFolderId) {
            const folder = folders.find(f => f.id === activeFolderId);
            if (folder && folder.assets) {
                setAssets(folder.assets);
                setCurrentIndex(0);
                setIsPlaying(true);
            } else {
                setAssets([]);
            }
        }
    }, [activeFolderId, folders]);

    // Intensity Change Handler
    const handleIntensityChange = (val: number) => {
        setIntensity(val);
        sendIntensity(val);
    };

    // Toggle Induction Layer
    const toggleInduction = (layer: keyof InductionState) => {
        setInduction(prev => {
            const newState = { ...prev, [layer]: !prev[layer] };
            sendInduction(layer, newState[layer]);
            return newState;
        });
    };

    // Timer Logic
    const getIntervalMs = () => (11 - intensity) * 1000;

    useEffect(() => {
        if (!isPlaying || assets.length === 0) {
            setTimeLeft(0);
            return;
        }

        const intervalMs = getIntervalMs();
        let startTime = Date.now();

        const tick = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, intervalMs - elapsed);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                handleNext();
                startTime = Date.now();
            }

            if (isPlaying) {
                timerRef.current = requestAnimationFrame(tick);
            }
        };

        timerRef.current = requestAnimationFrame(tick);
        return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current); };
    }, [isPlaying, assets, currentIndex, intensity]);

    const handleNext = () => {
        if (assets.length === 0) return;
        const nextIndex = (currentIndex + 1) % assets.length;
        setCurrentIndex(nextIndex);
        syncAsset(assets[nextIndex]);
    };

    const jumpToAsset = (index: number) => {
        setCurrentIndex(index);
        syncAsset(assets[index]);
        // Reset timer implicitly? Yes, effect dependency
    };

    const handleNextNow = () => {
        handleNext();
    };

    const handleFlash = () => {
        sendFlash();
        const btn = document.getElementById('flash-btn');
        if (btn) {
            btn.classList.add('animate-[flash_0.2s_ease-in-out]');
            setTimeout(() => btn.classList.remove('animate-[flash_0.2s_ease-in-out]'), 200);
        }
    };

    const syncAsset = (asset: any) => {
        syncAssetToViewer(asset);
    };

    const togglePlay = () => setIsPlaying(!isPlaying);

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#050510] text-white">Loading...</div>;

    const currentAsset = assets[currentIndex];

    return (
        <div className="flex h-screen bg-[#050510] text-white overflow-hidden">
            {/* COLUMN 1: PHASES (Succession of folders) */}
            <div className="w-64 bg-black/20 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <button onClick={() => navigate('/')} className="text-white/50 hover:text-white text-sm">← Back</button>
                    <h2 className="text-xl font-light tracking-widest mt-2">PHASES</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {folders.map(folder => (
                        <div key={folder.id} className="rounded-lg overflow-hidden transition-all border border-transparent hover:border-white/10 bg-white/5">
                            <div
                                onClick={() => setActiveFolderId(folder.id === activeFolderId ? null : folder.id)}
                                className={`p-3 cursor-pointer flex justify-between items-center ${activeFolderId === folder.id ? 'bg-cyan-500/20 text-white' : 'text-white/60'}`}
                            >
                                <div className="font-medium truncate">{folder.name}</div>
                                <div className="text-[10px] opacity-50">{activeFolderId === folder.id ? '▼' : '▶'}</div>
                            </div>

                            {/* Accordion Content: Thumbnails? or just info? User asked for thumbnails */}
                            {activeFolderId === folder.id && (
                                <div className="bg-black/20 p-2 grid grid-cols-4 gap-1 animate-[fadeIn_0.2s_ease-out]">
                                    {folder.assets?.slice(0, 8).map((a: any) => (
                                        <div key={a.id} className="aspect-square bg-white/10 rounded overflow-hidden opacity-60 hover:opacity-100">
                                            {a.type === 'image' ? <img src={getAssetUrl(a.url)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px]">{(a.type === 'video' ? '🎬' : '🎵')}</div>}
                                        </div>
                                    ))}
                                    {folder.assets?.length > 8 && <div className="aspect-square flex items-center justify-center text-[8px] bg-white/5 text-white/30">+{folder.assets.length - 8}</div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUMN 2: CENTER CONTROL (Dual Monitor + Induction) */}
            <div className="flex-1 flex flex-col relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

                {/* Header */}
                <div className="p-6 pb-2 z-10">
                    <h1 className="text-2xl font-bold tracking-tight">{activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 'Select a Phase'}</h1>
                    <div className="flex gap-4 text-sm text-white/40 mt-1 font-mono">
                        <span>{isPlaying ? 'RUNNING' : 'PAUSED'}</span>
                        <span>INTENSITY: {intensity}</span>
                        <span>{assets.length > 0 ? `${currentIndex + 1}/${assets.length}` : '0/0'}</span>
                    </div>
                </div>

                {/* Dual Monitor Area */}
                <div className="flex-1 grid grid-cols-2 gap-4 p-6 pt-2 overflow-hidden z-10">
                    {/* Left: Now Playing (Controller View) */}
                    <div className="bg-black/40 rounded-xl border border-white/10 flex flex-col overflow-hidden relative group">
                        <div className="absolute top-2 left-2 z-20 bg-black/60 px-2 py-1 rounded text-[10px] font-bold tracking-widest text-cyan-400 border border-cyan-500/30">
                            NOW PLAYING
                        </div>
                        {/* Timer Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30">
                            <div className="h-full bg-cyan-500 transition-all duration-100 ease-linear" style={{ width: `${(timeLeft / getIntervalMs()) * 100}%` }} />
                        </div>

                        <div className="flex-1 relative flex items-center justify-center bg-black/50">
                            {currentAsset ? (
                                assetPreview(currentAsset)
                            ) : <div className="text-white/20">Idle</div>}
                        </div>
                        <div className="p-3 bg-black/60 border-t border-white/5">
                            <div className="text-sm font-medium truncate">{currentAsset?.name || 'Unknown'}</div>
                            <div className="text-xs text-white/40 font-mono">{currentAsset?.type}</div>
                        </div>
                    </div>

                    {/* Right: Live Preview (Viewer View from Context) */}
                    <div className="bg-black/40 rounded-xl border border-white/10 flex flex-col overflow-hidden relative">
                        <div className="absolute top-2 left-2 z-20 bg-black/60 px-2 py-1 rounded text-[10px] font-bold tracking-widest text-pink-500 border border-pink-500/30 animate-pulse">
                            LIVE VIEWER
                        </div>
                        <div className="flex-1 relative flex items-center justify-center bg-black/50">
                            {activeState.currentAsset ? (
                                assetPreview(activeState.currentAsset)
                            ) : <div className="text-white/20">Waiting for Stream...</div>}
                        </div>
                        {/* Active Layers Indicators */}
                        <div className="p-2 bg-black/60 border-t border-white/5 flex gap-2">
                            {induction.spiral && <span className="text-[10px] px-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">SPIRAL</span>}
                            {induction.flashback && <span className="text-[10px] px-1 bg-yellow-500/20 text-yellow-300 rounded border border-yellow-500/30">FLASHBACK</span>}
                            {induction.breathing && <span className="text-[10px] px-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">BREATHE</span>}
                            {!induction.spiral && !induction.flashback && !induction.breathing && <span className="text-[10px] text-white/20">No active layers</span>}
                        </div>
                    </div>
                </div>

                {/* Controls Area */}
                <div className="h-48 bg-black/30 border-t border-white/10 p-6 z-20 flex gap-6">
                    {/* Intensity & Transport */}
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-cyan-400 tracking-widest mb-1 block">INTENSITY LEVEL</label>
                                <input
                                    type="range"
                                    min="1" max="10"
                                    value={intensity}
                                    onChange={(e) => handleIntensityChange(Number(e.target.value))}
                                    className="w-full accent-cyan-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="text-2xl font-bold font-mono w-12 text-center">{intensity}</div>
                        </div>

                        <div className="flex gap-2 h-full">
                            <button onClick={togglePlay} className={`flex-1 rounded-lg font-bold text-xl border flex items-center justify-center transition-all ${isPlaying ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                                {isPlaying ? 'PAUSE' : 'PLAY'}
                            </button>
                            <button onClick={handleNextNow} className="flex-1 rounded-lg font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex flex-col items-center justify-center">
                                <span>NEXT</span>
                                <span className="text-[10px] opacity-50">SKIP TIMER</span>
                            </button>
                        </div>
                    </div>

                    {/* Induction Controls */}
                    <div className="w-1/3 flex flex-col gap-2">
                        <label className="text-xs font-bold text-purple-400 tracking-widest mb-1 block">INDUCTION LAYERS</label>
                        <div className="grid grid-cols-2 gap-2 flex-1">
                            <button onClick={() => toggleInduction('spiral')} className={`rounded border text-xs font-bold transition-all ${induction.spiral ? 'bg-purple-500/30 border-purple-500 text-white' : 'bg-transparent border-white/10 text-white/50 hover:border-white/30'}`}>SPIRAL</button>
                            <button onClick={() => toggleInduction('flashback')} className={`rounded border text-xs font-bold transition-all ${induction.flashback ? 'bg-yellow-500/30 border-yellow-500 text-white' : 'bg-transparent border-white/10 text-white/50 hover:border-white/30'}`}>GHOST</button>
                            <button onClick={() => toggleInduction('breathing')} className={`rounded border text-xs font-bold transition-all ${induction.breathing ? 'bg-blue-500/30 border-blue-500 text-white' : 'bg-transparent border-white/10 text-white/50 hover:border-white/30'}`}>BREATHE</button>
                            <button id="flash-btn" onClick={handleFlash} className="rounded border border-white/50 bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-transform">FLASH</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMN 3: PLAYLIST (Right Sidebar) */}
            <div className="w-72 bg-black/20 border-l border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-sm font-bold tracking-widest text-white/70">PLAYLIST QUEUE</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {assets.map((asset, idx) => (
                        <div
                            key={asset.id}
                            onClick={() => jumpToAsset(idx)}
                            className={`p-2 rounded flex gap-3 items-center cursor-pointer transition-all border ${currentIndex === idx ? 'bg-cyan-500/10 border-cyan-500/30' : 'border-transparent hover:bg-white/5'}`}
                        >
                            <div className="w-10 h-10 bg-black/40 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {asset.type === 'image' ? <img src={getAssetUrl(asset.url)} className="w-full h-full object-cover opacity-70" /> : <span className="text-xs">{(asset.type === 'video' ? '🎬' : (asset.type === 'audio' ? '🎵' : 'GIF'))}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${currentIndex === idx ? 'text-cyan-400' : 'text-white/80'}`}>{asset.name || 'Untitled'}</div>
                                <div className="text-[10px] text-white/30 truncate">{asset.type}</div>
                            </div>
                            {currentIndex === idx && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>}
                        </div>
                    ))}
                    {assets.length === 0 && <div className="text-center text-white/30 py-10 text-sm">Select a phase to load playlist</div>}
                </div>
            </div>

            <style>{`
                @keyframes flash {
                    0% { box-shadow: 0 0 50px rgba(255,255,255,0.8); transform: scale(1.05); }
                    100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

// Helper for Preview
const assetPreview = (asset: any) => {
    const url = getAssetUrl(asset.url);
    if (!url) return null;
    if (asset.type === 'video') return <video src={url} className="w-full h-full object-contain opacity-80" autoPlay muted loop />;
    if (asset.type === 'image' || asset.type === 'gif') return <img src={url} className="w-full h-full object-contain opacity-80" />;
    return <div className="text-4xl">🎵</div>;
}

export default DirectorPanel;
