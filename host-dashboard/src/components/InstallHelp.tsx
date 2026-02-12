import { useState, useEffect } from 'react';

const InstallHelp = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check for iOS
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIos);

        // Check if already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (!isStandalone) {
            // Capture install prompt event (Chrome/Android)
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setIsVisible(true);
            });

            // Show help for iOS (manual) or if prompt is supported later
            if (isIos) {
                setIsVisible(true);
            }
        }
    }, []);

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                setDeferredPrompt(null);
                setIsVisible(false);
            });
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-[slideIn_0.5s_ease-out]">
            <div className="bg-gradient-to-br from-purple-900/90 to-black/90 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-2xl max-w-sm">
                <div className="flex justify-between items-start mb-2 gap-4">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider">Install App for VR</h3>
                    <button onClick={() => setIsVisible(false)} className="text-white/40 hover:text-white text-xs">&times;</button>
                </div>

                <p className="text-white/70 text-xs mb-4 leading-relaxed">
                    For the best VR experience (Fullscreen & Landscape), install this app to your home screen.
                </p>

                {isIOS ? (
                    <div className="text-xs text-white/50 bg-white/5 p-2 rounded border border-white/10">
                        Tap <span className="text-white font-bold">Share</span> button <br />
                        and select <span className="text-white font-bold">"Add to Home Screen"</span>
                    </div>
                ) : (
                    <button
                        onClick={handleInstallClick}
                        className="w-full glass-button bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs py-2"
                        disabled={!deferredPrompt}
                    >
                        {deferredPrompt ? "Install App Now" : "Install Manually via Menu"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default InstallHelp;
