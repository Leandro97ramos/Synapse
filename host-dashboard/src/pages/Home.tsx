import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Home = () => {
    const navigate = useNavigate();
    const [textIndex, setTextIndex] = useState(0);

    const descriptions = [
        "Experience the Future",
        "Dive into VR",
        "Unleash Your Imagination",
        "Connect Beyond Reality"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % descriptions.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const categories = [
        { id: 'landscapes', label: 'Paisajes', disabled: true },
        { id: 'horror', label: 'Terror', disabled: true },
        { id: 'adrenaline', label: 'Adrenalina', disabled: true },
        { id: 'calm', label: 'Tranquilo', disabled: true },
        { id: 'bubbles', label: 'Bubbles', disabled: false, primary: true },
    ];

    return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-[#0a0a12] text-white">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-0 w-[70vw] h-[70vw] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-0 w-[60vw] h-[60vw] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Top Navigation */}
            <nav className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
                {/*Debe ir al lado derecho*/}
                <div className="flex w-full items-center justify-end  space-x-3">
                    <span className="text-sm font-medium tracking-wide text-white/70">Lean33</span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] border border-white/20"></div>
                </div>
            </nav>

            {/* Content */}
            <div className="z-10 text-center space-y-10 w-full max-w-5xl px-4">
                <div className="space-y-4">
                    <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                            Synapse
                        </span>
                    </h1>

                    {/* Dynamic Description with Fade Key */}
                    <div className="h-8 overflow-hidden relative">
                        <p
                            key={textIndex}
                            className="text-xl md:text-2xl text-white/60 tracking-[0.2em] font-light uppercase animate-[fadeIn_0.5s_ease-in-out]"
                        >
                            {descriptions[textIndex]}
                        </p>
                    </div>
                </div>

                {/* Square Buttons Grid */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-16 w-full">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            disabled={cat.disabled}
                            onClick={() => !cat.disabled && cat.id === 'bubbles' && navigate('/dashboard')}
                            className={`
                                w-32 h-32 md:w-40 md:h-40 flex flex-col items-center justify-center rounded-2xl text-lg font-bold tracking-wider transition-all duration-300 uppercase
                                border backdrop-blur-md
                                ${cat.disabled
                                    ? 'bg-white/5 text-white/20 cursor-not-allowed border-white/5 grayscale'
                                    : 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] border-cyan-400/50 cursor-pointer hover:bg-cyan-500/30'
                                }
                            `}
                        >
                            <span className={cat.primary ? "drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" : ""}>
                                {cat.label}
                            </span>
                            {cat.primary && <div className="w-12 h-1 bg-cyan-400 mt-2 rounded-full shadow-[0_0_10px_rgba(0,255,255,1)]"></div>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Decorative Element */}
            <div className="absolute bottom-10 flex flex-col items-center space-y-2 opacity-50 animate-pulse">
                <span className="text-white/30 text-xs tracking-[0.5em] uppercase">Scroll Down</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-white/0 via-white/50 to-white/0"></div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Home;
