import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getAssetUrl } from '../utils/urlHelper';

// Connect to the specific namespace for the VR experience
// Use relative path to leverage Vite Proxy (avoids Mixed Content)
const SOCKET_URL = '/experience';

const VRViewer = () => {
    const [currentAsset, setCurrentAsset] = useState<{ type: string; url: string } | null>(null);
    const [effects, setEffects] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('VR Viewer connected to /experience namespace', socket.id);
            setIsConnected(true);
            // Join the 'Viewer' room to receive updates
            socket.emit('join_room', 'Viewer');
        });

        socket.on('disconnect', () => {
            console.log('VR Viewer disconnected');
            setIsConnected(false);
        });

        // Listen for session updates from the Host
        // Server relays 'host:update_session' as 'viewer:update_session'
        socket.on('viewer:update_session', (data: any) => {
            console.log('Received session update:', data);

            // data structure expected: { asset: { type, url }, effects: {...} }
            if (data.asset) {
                setCurrentAsset(data.asset);
            }
            if (data.effects) {
                setEffects(data.effects);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const renderAsset = () => {
        if (!currentAsset) return null;

        const { type, url } = currentAsset;
        const safeUrl = getAssetUrl(url);

        // Basic error handling for media
        const handleError = (e: any) => console.error(`Error loading ${type}:`, e);

        switch (type) {
            case 'image':
                return (
                    <img
                        src={safeUrl}
                        alt="VR Content"
                        className="w-full h-full object-contain"
                        onError={handleError}
                    />
                );
            case 'video':
                return (
                    <video
                        src={safeUrl}
                        autoPlay
                        loop
                        muted={false} // VR implementation might need user interaction first for audio
                        className="w-full h-full object-cover"
                        onError={handleError}
                    />
                );
            case 'audio':
                return (
                    <div className="flex items-center justify-center w-full h-full">
                        <audio src={safeUrl} autoPlay loop controls className="hidden" />
                        <div className="animate-pulse text-white/50 text-6xl">🎵</div>
                    </div>
                );
            default:
                return <div className="text-white/20">Unknown Asset Type</div>;
        }
    };

    return (
        <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center relative">
            {/* Status Indicator (Optional, can be hidden in production) */}
            <div className="absolute top-4 right-4 z-50">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`} />
            </div>

            {/* Content Container */}
            <div className={`w-full h-full transition-opacity duration-1000 ${currentAsset ? 'opacity-100' : 'opacity-0'}`}>
                {renderAsset()}
            </div>

            {/* Effects Layer (Overlay) */}
            {effects && effects.filter === 'grayscale' && (
                <div className="absolute inset-0 pointer-events-none backdrop-grayscale z-40" />
            )}
            {effects && effects.flash && (
                <div className="absolute inset-0 bg-white animate-flash z-50 pointer-events-none" />
            )}

            {/* Idle State */}
            {!currentAsset && isConnected && (
                <div className="text-white/10 font-mono text-sm tracking-widest uppercase">
                    Waiting for Host...
                </div>
            )}
        </div>
    );
};

export default VRViewer;
