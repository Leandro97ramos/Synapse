import React, { useEffect, useState } from 'react';
import { useActiveState } from './ActiveStateContext';
import { getAssetUrl } from '../utils/urlHelper';
import { createPortal } from 'react-dom';
import { socket } from '../services/api';

interface LiveViewerMirrorProps {
    className?: string;
}

const LiveViewerMirror: React.FC<LiveViewerMirrorProps> = ({ className }) => {
    const { activeState } = useActiveState();
    const [isExpanded, setIsExpanded] = useState(false);
    const [flashing, setFlashing] = useState(false);

    // Listen for flash event specifically for the visual effect
    useEffect(() => {
        const handleFlash = () => {
            setFlashing(true);
            setTimeout(() => setFlashing(false), 200); // 200ms flash
        };

        socket.on('viewer:flash', handleFlash);
        return () => {
            socket.off('viewer:flash', handleFlash);
        };
    }, []);

    const { currentAsset, layers } = activeState;

    const renderContent = (isFull = false) => {
        const content = (
            <div className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden ${className}`}>
                {/* 1. Base Media Layer */}
                {currentAsset ? (
                    <div className={`relative w-full h-full flex items-center justify-center transition-all duration-1000 ${layers.breathing ? 'animate-breathing substitute-vignette' : ''}`}>
                        {/* Breathing Vignette Check */}

                        {currentAsset.type === 'video' ? (
                            <video
                                src={getAssetUrl(currentAsset.url)}
                                className="w-full h-full object-contain"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                        ) : (
                            <img
                                src={getAssetUrl(currentAsset.url)}
                                className="w-full h-full object-contain"
                                alt="Live View"
                            />
                        )}
                    </div>
                ) : (
                    <div className="text-white/20 font-mono text-xs">WAITING FOR SIGNAL...</div>
                )}

                {/* 2. Induction Layers Overlays */}

                {/* Spiral Overlay */}
                {layers.spiral && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 animate-[spin_4s_linear_infinite]">
                        <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-purple-500" style={{ strokeWidth: 0.5 }}>
                            {/* Simple spiral approximation */}
                            <path d="M50 50 m0 0 a1 1 0 0 1 2 2 a2 2 0 0 1 4 4 a4 4 0 0 1 8 8 a8 8 0 0 1 16 16 a16 16 0 0 1 32 32" />
                            {/* Better visual: A repeating radial pattern or actual spiral image is better, but this proves the concept */}
                            <circle cx="50" cy="50" r="10" strokeOpacity="0.5" />
                            <circle cx="50" cy="50" r="20" strokeOpacity="0.4" />
                            <circle cx="50" cy="50" r="30" strokeOpacity="0.3" />
                            <circle cx="50" cy="50" r="40" strokeOpacity="0.2" />
                            <line x1="0" y1="50" x2="100" y2="50" strokeOpacity="0.2" />
                            <line x1="50" y1="0" x2="50" y2="100" strokeOpacity="0.2" />
                        </svg>
                        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(168,85,247,0.2)_360deg)] animate-[spin_2s_linear_infinite]" />
                    </div>
                )}

                {/* Flashback (Ghosting) Overlay */}
                {layers.flashback && currentAsset && (
                    <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen animate-pulse scale-105" style={{ filter: 'blur(4px) hue-rotate(90deg)' }}>
                        {currentAsset.type === 'video' ? (
                            <video
                                src={getAssetUrl(currentAsset.url)}
                                className="w-full h-full object-contain"
                                autoPlay
                                muted
                                loop
                            />
                        ) : (
                            <img
                                src={getAssetUrl(currentAsset.url)}
                                className="w-full h-full object-contain"
                            />
                        )}
                    </div>
                )}

                {/* Breathing Vignette Overlay */}
                {layers.breathing && (
                    <div className="absolute inset-0 pointer-events-none bg-radial-vignette animate-breathing-overlay"></div>
                )}

                {/* Flash Effect */}
                {flashing && (
                    <div className="absolute inset-0 bg-white z-50 animate-[fadeOut_0.2s_ease-out]" />
                )}

                {/* UI: Maximize Button */}
                {!isFull && (
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-white/10 text-white/50 hover:text-white p-1.5 rounded transition-all z-40 border border-white/10 hover:border-white/30 group"
                        title="Expand View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    </button>
                )}
            </div>
        );

        if (isFull) {
            return createPortal(
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-[fadeIn_0.2s_ease-out]">
                    <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-black rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                        {content}

                        <button
                            onClick={() => setIsExpanded(false)}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-white/10 text-white p-2 rounded-full transition-all z-50 border border-white/10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <div className="absolute bottom-4 left-4 text-white/50 text-xs font-mono">
                            LIVE VIEWER • EXPANDED MODE
                        </div>
                    </div>
                </div>,
                document.body
            );
        }

        return content;
    };

    return (
        <>
            {renderContent(false)}
            {isExpanded && renderContent(true)}
            <style>{`
                .animate-breathing {
                    animation: breathe 4s ease-in-out infinite;
                }
                .animate-breathing-overlay {
                    animation: breathe-opacity 4s ease-in-out infinite;
                }
                .bg-radial-vignette {
                    background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%);
                }
                @keyframes breathe {
                    0%, 100% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.05); filter: brightness(1.2); }
                }
                @keyframes breathe-opacity {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.7; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `}</style>
        </>
    );
};

export default LiveViewerMirror;
