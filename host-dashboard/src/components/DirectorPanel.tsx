import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModules, syncAssetToViewer, sendIntensity, sendFlash } from '../services/api';
import { getAssetUrl } from '../utils/urlHelper';

const DirectorPanel = () => {
    const navigate = useNavigate();

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

    // Initial Fetch
    useEffect(() => {
        const fetchFolders = async () => {
            try {
                // Fetch all modules to get folders (Phases)
                const modules = await getModules();
                const allFolders: any[] = [];
                modules.forEach((m: any) => {
                    if (m.folders) {
                        m.folders.forEach((f: any) => {
                            // Only include folders that have assets? Or all?
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
                setIsPlaying(true); // Auto-start playing folder? Or wait for user?
                // Logic: "Organize media by Intensity Phases". Click phase -> load assets.
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

    // calculate timer interval
    // T = 11 - Intensity (1 -> 10s, 10 -> 1s)
    const getIntervalMs = () => (11 - intensity) * 1000;

    // Timer Logic
    useEffect(() => {
        if (!isPlaying || assets.length === 0) {
            setTimeLeft(0);
            return;
        }

        const intervalMs = getIntervalMs();
        let startTime = Date.now();

        // Use recursive setTimeout or requestAnimationFrame for visual sync?
        // User asked for "setInterval or requestAnimationFrame for local dashboard timer... synced visually".

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

        return () => {
            if (timerRef.current) cancelAnimationFrame(timerRef.current);
        };
    }, [isPlaying, assets, currentIndex, intensity]); // Dependencies restart timer logic

    const handleNext = () => {
        if (assets.length === 0) return;
        const nextIndex = (currentIndex + 1) % assets.length;
        setCurrentIndex(nextIndex);
        syncAsset(assets[nextIndex]);
    };

    const handleNextNow = () => {
        // "Siguiente Ahora" - Skip timer
        handleNext();
        // Reset timer implicitly by effect dependency change (currentIndex) -> wait, effect depends on currentIndex?
        // Yes, if currentIndex changes, effect reruns, resetting startTime.
    };

    const handleFlash = () => {
        sendFlash();
        // Visual feedback
        const btn = document.getElementById('flash-btn');
        if (btn) {
            btn.classList.add('animate-[flash_0.2s_ease-in-out]');
            setTimeout(() => btn.classList.remove('animate-[flash_0.2s_ease-in-out]'), 200);
        }
    };

    const syncAsset = (asset: any) => {
        syncAssetToViewer(asset);
        // Also emit 'host:next' if useful, but update_session does the job.
    };

    // Toggle Play/Pause
    const togglePlay = () => setIsPlaying(!isPlaying);

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-[#050510] text-white">Loading...</div>;
    }

    return (
        <div className="flex h-screen bg-[#050510] text-white">
            {/* Left Sidebar: Phases / Folders */}
            <div className="w-64 bg-black/20 border-r border-white/10 p-4 overflow-y-auto">
                <button onClick={() => navigate('/')} className="mb-6 text-white/50 hover:text-white">← Back</button>
                <h2 className="text-xl font-light tracking-widest mb-4">DIRECTOR</h2>
                <div className="space-y-2">
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => setActiveFolderId(folder.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${activeFolderId === folder.id ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
                        >
                            <div className="font-medium">{folder.name}</div>
                            <div className="text-xs text-white/40">{folder.moduleName}</div>
                            <div className="text-xs text-white/30 mt-1">{folder.assets?.length || 0} Assets</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-6 relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                {/* Top Bar: Current Status */}
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                        <h1 className="text-3xl font-bold">{activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 'Select a Phase'}</h1>
                        <p className="text-white/40">{isPlaying ? 'Running' : 'Paused'} • Intensity: {intensity}</p>
                    </div>
                    <div className="text-4xl font-mono opacity-50">
                        {assets.length > 0 ? `${currentIndex + 1} / ${assets.length}` : '0 / 0'}
                    </div>
                </div>

                {/* Center: Preview & Timer */}
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                    {assets.length > 0 && assets[currentIndex] ? (
                        <div className="relative w-full max-w-2xl aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                            {/* Timer Bar */}
                            <div className="absolute top-0 left-0 h-1 bg-cyan-500 transition-all duration-100 ease-linear" style={{ width: `${(timeLeft / getIntervalMs()) * 100}%` }} />

                            <img
                                src={getAssetUrl(assets[currentIndex].url)}
                                className="w-full h-full object-contain opacity-80"
                                alt="Current"
                            />
                            <div className="absolute bottom-4 left-4 text-xs font-mono bg-black/50 px-2 py-1 rounded">
                                NEXT IN: {(timeLeft / 1000).toFixed(1)}s
                            </div>
                        </div>
                    ) : (
                        <div className="text-white/20 text-xl">No assets loaded</div>
                    )}
                </div>

                {/* Bottom Control Bar */}
                <div className="h-32 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-6 flex items-center justify-between gap-8 relative z-20 mt-6">

                    {/* Intensity Slider */}
                    <div className="flex-1">
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-bold tracking-widest text-cyan-400">INTENSITY</label>
                            <span className="text-xl font-bold">{intensity}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={intensity}
                            onChange={(e) => handleIntensityChange(Number(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-xs text-white/30 mt-1">
                            <span>Calm (10s)</span>
                            <span>Intense (1s)</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            id="flash-btn"
                            onClick={handleFlash}
                            className="h-16 w-32 bg-white text-black font-bold rounded-lg hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        >
                            FLASH
                        </button>

                        <button
                            onClick={handleNextNow}
                            className="h-16 w-32 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] flex flex-col items-center justify-center"
                        >
                            <span>NEXT</span>
                            <span className="text-[10px] font-normal opacity-70">NOW</span>
                        </button>

                        <button
                            onClick={togglePlay}
                            className={`h-16 w-16 rounded-lg flex items-center justify-center font-bold text-2xl transition-all ${isPlaying ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500/20 text-green-500 border border-green-500/50'}`}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                    </div>
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

export default DirectorPanel;
