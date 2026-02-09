import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getModules } from '../services/api';

interface Module {
    id: number;
    name: string;
    category_type: string;
    is_active: boolean;
}

const Home = () => {
    const navigate = useNavigate();
    const [textIndex, setTextIndex] = useState(0);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [fadeProp, setFadeProp] = useState({ opacity: 1, transition: 'opacity 1s ease-in-out' });

    const descriptions = [
        "Experience the Future",
        "Dive into VR",
        "Unleash Your Imagination",
        "Connect Beyond Reality"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setFadeProp((prev) => ({ ...prev, opacity: 0 }));
            setTimeout(() => {
                setTextIndex((prev) => (prev + 1) % descriptions.length);
                setFadeProp((prev) => ({ ...prev, opacity: 1 }));
            }, 500); // Wait for fade out
        }, 3500); // 3s visible + 0.5s transition
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchModules = async () => {
            try {
                const data = await getModules();
                setModules(data);
            } catch (error) {
                console.error("Error fetching modules:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchModules();
    }, []);

    return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-[#0a0a12] text-white">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-0 w-[70vw] h-[70vw] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-0 w-[60vw] h-[60vw] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Top Navigation - Glassmorphic */}
            <nav className="absolute top-0 left-0 w-full px-8 py-6 flex justify-between items-center z-50 backdrop-blur-[24px] bg-black/10 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                    <span className="text-xl font-bold tracking-[0.2em] uppercase text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                        Synapse
                    </span>
                </div>

                <div className="flex items-center space-x-4 pl-4 border-l border-white/10 bg-white/5 rounded-full p-1 pr-4 backdrop-blur-md">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-inner border border-white/20"></div>
                    <span className="text-xs font-medium tracking-wide text-white/80 uppercase">Host</span>
                </div>
            </nav>

            {/* Content */}
            <div className="z-10 text-center space-y-12 w-full max-w-6xl px-4 flex flex-col items-center">
                <div className="space-y-6">
                    <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase relative">
                        <span className="absolute -inset-1 blur-xl bg-gradient-to-r from-purple-600/30 to-cyan-600/30 opacity-70"></span>
                        <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-[length:200%_auto] animate-[gradient_5s_linear_infinite] drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                            Lean33
                        </span>
                    </h1>

                    {/* Rotating Description - Smooth Transition */}
                    <div className="h-8 flex items-center justify-center">
                        <p
                            className="text-xl md:text-2xl text-white/60 tracking-[0.3em] font-light uppercase"
                            style={{ ...fadeProp }}
                        >
                            {descriptions[textIndex]}
                        </p>
                    </div>
                </div>

                {/* Modules Grid - Square Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-8 mt-12 w-full">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-[3px] border-white/10 border-t-cyan-500 animate-spin shadow-[0_0_20px_rgba(6,182,212,0.2)]"></div>
                            <span className="text-white/30 tracking-[0.2em] uppercase text-xs animate-pulse">Loading Experience</span>
                        </div>
                    ) : modules.length > 0 ? (
                        modules.map((module) => {
                            const isActive = module.is_active;
                            return (
                                <button
                                    key={module.id}
                                    disabled={!isActive}
                                    onClick={() => isActive && navigate(`/dashboard/${module.name}`)}
                                    className={`
                                        group relative aspect-square w-40 flex flex-col items-center justify-center rounded-2xl p-4 transition-all duration-500
                                        ${!isActive
                                            ? 'bg-white/5 border border-white/5 text-white/20 grayscale cursor-not-allowed hover:bg-white/5'
                                            : 'bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-900/10 hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:-translate-y-1'
                                        }
                                    `}
                                >
                                    {/* Glow Effect for Active */}
                                    {isActive && (
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    )}

                                    <div className="relative z-10 flex flex-col items-center gap-3">
                                        <span className={`text-3xl transition-transform duration-500 ${isActive ? 'group-hover:scale-110 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]' : 'opacity-50'}`}>
                                            {isActive ? '💠' : '🔒'}
                                        </span>
                                        <span className={`text-sm font-bold tracking-widest uppercase ${isActive ? 'text-white' : 'text-white/30'}`}>
                                            {module.name}
                                        </span>
                                    </div>

                                    {isActive && (
                                        <div className="absolute bottom-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_cyan]"></div>
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-white/40 tracking-widest uppercase text-sm border border-white/10 px-6 py-4 rounded-xl backdrop-blur-sm">
                            No active modules
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Footer */}
            <div className="absolute bottom-8 flex flex-col items-center space-y-3 opacity-30">
                <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white to-transparent"></div>
            </div>

            <style>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </div>
    );
};

export default Home;
