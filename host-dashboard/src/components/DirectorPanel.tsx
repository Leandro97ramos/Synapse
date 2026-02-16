import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModules, getModuleByName, syncAssetToViewer, sendIntensity, sendFlash, sendInduction, socket } from '../services/api';
import { getAssetUrl } from '../utils/urlHelper';
// import { useActiveState } from './ActiveStateContext'; // Migrated to Zustand
import useStore, { setupSocketListeners } from '../store/useStore';
import SkeletonLoader from './SkeletonLoader';
import PlaylistQueue from './PlaylistQueue';

// Define Induction Layer States (Local for now, eventually synced)
interface InductionState {
    spiral: boolean;
    flashback: boolean;
    breathing: boolean;
}

const DirectorPanel = () => {
    const navigate = useNavigate();

    // Zustand Store
    const activeState = useStore(); // Get whole state or selectors

    // Initialize Socket Listeners for Store on Mount
    useEffect(() => {
        setupSocketListeners();

        // Ensure we join the director room (handshake)
        socket.emit('join_room', 'director');

        return () => {
            // Maybe leave room?
            socket.emit('leave_room', 'director');
        }
    }, []);

    // Data State
    const [availableModules, setAvailableModules] = useState<any[]>([]);
    const [currentModuleName, setCurrentModuleName] = useState<string>(() => {
        return localStorage.getItem('lastModule') || 'Bubbles';
    });

    const [folders, setFolders] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadingModule, setLoadingModule] = useState(false);
    const [isWaitingForViewer, setIsWaitingForViewer] = useState(false);

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

    // 1. Fetch Available Modules
    useEffect(() => {
        const fetchModulesList = async () => {
            try {
                const modules = await getModules();
                setAvailableModules(modules);
            } catch (error) {
                console.error("Error fetching modules list:", error);
            }
        };
        fetchModulesList();
    }, []);

    // 2. Fetch Selected Module Data
    useEffect(() => {
        const fetchModuleData = async () => {
            setLoadingModule(true);
            try {
                const data = await getModuleByName(currentModuleName);
                // Data structure: { id, name, folders: [ { id, name, assets: [] } ] }

                // Helper to attach moduleName to folders (legacy support if needed)
                const mappedFolders = data.folders.map((f: any) => ({
                    ...f,
                    moduleName: data.name
                }));

                setFolders(mappedFolders);

                // Reset selection when module changes
                setActiveFolderId(null);
                setAssets([]);
                setIsPlaying(false);

                // Persist
                localStorage.setItem('lastModule', currentModuleName);

            } catch (error) {
                console.error(`Error fetching module ${currentModuleName}:`, error);
            } finally {
                setLoading(false);
                setLoadingModule(false);
            }
        };

        fetchModuleData();
    }, [currentModuleName]);

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
    const preparedNext = useRef<boolean>(false); // Track if we anticipated

    useEffect(() => {
        if (!isPlaying || assets.length === 0) {
            setTimeLeft(0);
            return;
        }

        const intervalMs = getIntervalMs();
        let startTime = Date.now();

        // Reset preparation state on new asset play
        preparedNext.current = false;

        const tick = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, intervalMs - elapsed);
            setTimeLeft(remaining);

            // ANTICIPATION: 5 seconds before end
            if (remaining <= 5000 && !preparedNext.current && assets.length > 1) {
                const nextIndex = (currentIndex + 1) % assets.length;
                // Only prepare if it's not the same one (or loop?) - Playlist usually loops
                const nextAsset = assets[nextIndex];

                console.log('Sending Anticipation for:', nextAsset.name);
                socket.emit('host:prepare_next', {
                    id: nextAsset.id,
                    url: nextAsset.url,
                    type: nextAsset.type
                });

                preparedNext.current = true;
            }

            if (remaining <= 0) {
                handleNext();
                startTime = Date.now();
                preparedNext.current = false; // Reset for next cycle
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
        setIsWaitingForViewer(true);
        syncAssetToViewer(asset);
    };

    // Reset waiting state when store updates
    useEffect(() => {
        setIsWaitingForViewer(false);
    }, [activeState.currentAsset]);

    const togglePlay = () => setIsPlaying(!isPlaying);

    const handleShuffle = () => {
        if (assets.length <= 1) return;

        const shuffled = [...assets];
        // Fisher-Yates shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        handleReorder(shuffled);
    };

    const handleReorder = (newAssets: any[]) => {
        if (assets.length > 0) {
            const currentAsset = assets[currentIndex];
            setAssets(newAssets);
            if (currentAsset) {
                const newIndex = newAssets.findIndex((a: any) => a.id === currentAsset.id);
                if (newIndex !== -1 && newIndex !== currentIndex) {
                    setCurrentIndex(newIndex);
                }
            }
        } else {
            setAssets(newAssets);
        }
    };

    const currentAsset = assets[currentIndex];

    return (
        <div className="flex h-screen bg-[#050510] text-white overflow-hidden">
            {/* COLUMN 1: PHASES (Succession of folders) */}
            <div className="w-64 bg-black/20 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <button onClick={() => navigate('/')} className="text-white/50 hover:text-white text-sm mb-2">← Back</button>

                    {/* Module Selector */}
                    <div className="relative">
                        <select
                            value={currentModuleName}
                            onChange={(e) => setCurrentModuleName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm font-bold text-white uppercase tracking-wider focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                        >
                            {availableModules.map(m => (
                                <option key={m.id} value={m.name} className="bg-[#050510] text-white">
                                    {m.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs opacity-50">▼</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading || loadingModule ? (
                        <div className="space-y-2">
                            <SkeletonLoader className="h-10 w-full" count={5} />
                        </div>
                    ) : (
                        folders.length === 0 ? (
                            <div className="text-center text-white/30 text-xs py-4">No phases found.</div>
                        ) : (
                            folders.map(folder => (
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
                                                    {a.type === 'image' || a.type === 'gif' ? <img src={getAssetUrl(a.url)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px]">{(a.type === 'video' ? '🎬' : '🎵')}</div>}
                                                </div>
                                            ))}
                                            {folder.assets?.length > 8 && <div className="aspect-square flex items-center justify-center text-[8px] bg-white/5 text-white/30">+{folder.assets.length - 8}</div>}
                                            {(!folder.assets || folder.assets.length === 0) && <div className="col-span-4 text-[10px] text-center text-white/30 py-2">Empty</div>}
                                        </div>
                                    )}
                                </div>
                            ))
                        )
                    )}
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

                {/* Dual Monitor Area -> Single Monitor Area */}
                <div className="flex-1 p-6 pt-2 overflow-hidden z-10 flex flex-col">
                    {/* Main Monitor: Now Playing */}
                    <div className="flex-1 bg-black/40 rounded-xl border border-white/10 flex flex-col overflow-hidden relative group">
                        <div className="absolute top-2 left-2 z-20 bg-black/60 px-2 py-1 rounded text-[10px] font-bold tracking-widest text-cyan-400 border border-cyan-500/30">
                            NOW PLAYING
                        </div>

                        {/* Connection Status Badge (moved from Mirror) */}
                        <div className="absolute top-2 right-2 z-20 bg-black/60 px-2 py-1 rounded text-[10px] font-bold tracking-widest border border-white/10 flex items-center gap-2">
                            <span className={activeState.activeViewers > 0 ? "text-green-400" : "text-red-400"}>
                                {activeState.activeViewers > 0 ? '📱' : '👁️'}
                            </span>
                            <span className={activeState.activeViewers > 0 ? "text-green-400" : "text-white/40"}>
                                {activeState.activeViewers} VIEWER{activeState.activeViewers !== 1 && 'S'}
                            </span>
                        </div>

                        {/* Timer Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30">
                            <div className="h-full bg-cyan-500 transition-all duration-100 ease-linear" style={{ width: `${(timeLeft / getIntervalMs()) * 100}%` }} />
                        </div>

                        <div className="flex-1 relative flex items-center justify-center bg-black/50 overflow-hidden" id="monitor-container">
                            {isWaitingForViewer && (
                                <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mb-2"></div>
                                    <span className="text-[10px] tracking-widest text-cyan-400 uppercase animate-pulse">Syncing to Viewer...</span>
                                </div>
                            )}

                            {/* Fullscreen Toggle */}
                            <button
                                onClick={() => {
                                    const elem = document.getElementById('monitor-container');
                                    if (elem) {
                                        if (!document.fullscreenElement) {
                                            elem.requestFullscreen().catch(err => console.log(err));
                                        } else {
                                            document.exitFullscreen();
                                        }
                                    }
                                }}
                                className="absolute top-2 left-2 z-40 p-1.5 bg-black/50 hover:bg-white/20 text-white/50 hover:text-white rounded border border-white/10 opacity-0 group-hover/monitor:opacity-100 transition-opacity"
                                title="Fullscreen Monitor"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                            </button>

                            {currentAsset ? (
                                <div className="w-full h-full flex items-center justify-center group/monitor relative">
                                    {assetPreview(currentAsset)}
                                </div>
                            ) : <div className="text-white/20">Idle</div>}
                        </div>
                        <div className="p-3 bg-black/60 border-t border-white/5 flex justify-between items-center z-10">
                            <div>
                                <div className="text-sm font-medium truncate">{currentAsset?.name || 'Unknown'}</div>
                                <div className="text-xs text-white/40 font-mono">{currentAsset?.type}</div>
                            </div>

                            {/* Active Layers Status */}
                            <div className="flex gap-2">
                                {activeState.activeLayers.spiral && <span className="text-[10px] px-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">SPIRAL</span>}
                                {activeState.activeLayers.flashback && <span className="text-[10px] px-1 bg-yellow-500/20 text-yellow-300 rounded border border-yellow-500/30">FLASHBACK</span>}
                                {activeState.activeLayers.breathing && <span className="text-[10px] px-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">BREATHE</span>}
                            </div>
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
                <PlaylistQueue
                    assets={assets}
                    currentIndex={currentIndex}
                    onReorder={handleReorder}
                    onJumpTo={jumpToAsset}
                    onShuffle={handleShuffle}
                />
            </div>

            <style>{`
                @keyframes flash {
                    0% { box-shadow: 0 0 50px rgba(255,255,255,0.8); transform: scale(1.05); }
                    100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); transform: scale(1); }
                }
            `}</style>
        </div >
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
