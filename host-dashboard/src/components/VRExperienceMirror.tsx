import React, { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { getAssetUrl } from '../utils/urlHelper';
import { createPortal } from 'react-dom';
import { socket } from '../services/api';

interface VRExperienceMirrorProps {
    className?: string;
}

const VRExperienceMirror: React.FC<VRExperienceMirrorProps> = ({ className }) => {
    const { currentAsset, activeLayers, activeViewers } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [flashing, setFlashing] = useState(false);

    // Flash Effect Listener
    useEffect(() => {
        const handleFlash = () => {
            setFlashing(true);
            setTimeout(() => setFlashing(false), 200);
        };

        // Listen to both viewer broadcast and director monitor
        socket.on('viewer:flash', handleFlash);
        socket.on('viewer:trigger_flash', handleFlash);

        return () => {
            socket.off('viewer:flash', handleFlash);
            socket.off('viewer:trigger_flash', handleFlash);
        };
    }, []);

    // Helper to toggle full view
    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Render Content Logic
    const renderContent = (isModeExpanded: boolean = false) => {
        const expansionClass = isModeExpanded ? 'fixed inset-0 z-[9999]' : 'relative w-full h-full';

        return (
            <div className={`bg-black flex items-center justify-center overflow-hidden font-sans ${expansionClass} ${className || ''}`}>

                {/* BACKGROUND / MEDIA */}
                {currentAsset ? (
                    <div className={`relative w-full h-full flex items-center justify-center transition-all duration-1000 ${activeLayers.breathing ? 'animate-breathing substitute-vignette' : ''}`}>
                        {currentAsset.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <video
                                    src={getAssetUrl(currentAsset.url)}
                                    className="w-full h-full object-contain"
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                />
                            </div>
                        ) : (
                            <img
                                src={getAssetUrl(currentAsset.url)}
                                className="w-full h-full object-contain"
                                alt="Mirror"
                            />
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-white/20 select-none">
                        <div className="text-4xl mb-2">{activeViewers > 0 ? '📱' : '👁️'}</div>
                        <div className="font-mono text-xs tracking-[0.2em] uppercase text-center">
                            {activeViewers > 0 ? 'VIEWER CONNECTED' : 'WAITING FOR VIEWER'}
                        </div>
                        <div className="text-[10px] mt-2 opacity-50 text-center">
                            {activeViewers > 0 ? 'Waiting for Content...' : 'Open /viewer on Device'}
                        </div>
                    </div>
                )}

                {/* OVERLAYS */}

                {/* Spiral */}
                {activeLayers.spiral && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 animate-[spin_4s_linear_infinite] mix-blend-screen overflow-hidden">
                        <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-purple-500" style={{ strokeWidth: 0.5 }}>
                            <path d="M50 50 m0 0 a1 1 0 0 1 2 2 a2 2 0 0 1 4 4 a4 4 0 0 1 8 8 a8 8 0 0 1 16 16 a16 16 0 0 1 32 32" />
                            <circle cx="50" cy="50" r="20" strokeOpacity="0.4" />
                            <circle cx="50" cy="50" r="40" strokeOpacity="0.2" />
                        </svg>
                        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(168,85,247,0.3)_360deg)] animate-[spin_2s_linear_infinite]" />
                    </div>
                )}

                {/* Flashback */}
                {activeLayers.flashback && currentAsset && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen animate-pulse scale-105 overflow-hidden" style={{ filter: 'blur(8px) hue-rotate(180deg)' }}>
                        {currentAsset.type === 'video' ? (
                            <video src={getAssetUrl(currentAsset.url)} className="w-full h-full object-cover" autoPlay muted loop />
                        ) : (
                            <img src={getAssetUrl(currentAsset.url)} className="w-full h-full object-cover" />
                        )}
                    </div>
                )}

                {/* Breathing Overlay */}
                {activeLayers.breathing && (
                    <div className="absolute inset-0 pointer-events-none bg-radial-vignette animate-breathing-overlay"></div>
                )}

                {/* Flash */}
                {flashing && (
                    <div className="absolute inset-0 bg-white z-[100] animate-[fadeOut_0.2s_ease-out]" />
                )}

                {/* HUD INFO (Only in Fullscreen?) */}
                <div className="absolute top-4 left-4 bg-black/50 text-white/50 text-xs font-mono px-2 py-1 rounded border border-white/10 select-none pointer-events-none z-50 flex gap-2">
                    <span>LIVE MONITOR</span>
                    <span className={activeViewers > 0 ? 'text-green-400' : 'text-red-400'}>
                        • {activeViewers} VIEWERS
                    </span>
                    {currentAsset && <span>• {currentAsset.name}</span>}
                </div>

                {/* TOGGLE BUTTON */}
                <button
                    onClick={toggleExpand}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-white/20 text-white/70 hover:text-white p-2 rounded transition-all z-50 border border-white/10 backdrop-blur-sm"
                    title={isModeExpanded ? "Exit Fullscreen" : "Expand View"}
                >
                    {isModeExpanded ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    )}
                </button>
            </div>
        );
    };

    if (isExpanded) {
        return createPortal(
            <div className="fixed inset-0 z-[9999] bg-black animate-[fadeIn_0.2s_ease-out] flex items-center justify-center">
                {renderContent(true)}
            </div>,
            document.body
        );
    }

    return renderContent(false);
};

export default VRExperienceMirror;
