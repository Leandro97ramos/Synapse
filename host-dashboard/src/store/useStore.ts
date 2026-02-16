import { create } from 'zustand';
import { socket } from '../services/api';

interface LayerState {
    spiral: boolean;
    flashback: boolean;
    breathing: boolean;
    [key: string]: boolean;
}

interface VRState {
    currentAsset: { type: string; url: string; name?: string } | null;
    activeLayers: LayerState;
    pacingSpeed: number;
    currentPhase: string;
    activeViewers: number;
    isConnected: boolean;

    // Actions
    setAsset: (asset: any) => void;
    toggleLayer: (layer: string, isActive: boolean) => void;
    syncState: (state: any) => void;
    updateViewerCount: (count: number) => void;
    setConnected: (connected: boolean) => void;
}

const useStore = create<VRState>((set) => ({
    currentAsset: null,
    activeLayers: {
        spiral: false,
        flashback: false,
        breathing: false
    },
    pacingSpeed: 1.0,
    currentPhase: 'neutral',
    activeViewers: 0,
    isConnected: false,

    setAsset: (asset) => set({ currentAsset: asset }),

    toggleLayer: (layer, isActive) => set((state) => ({
        activeLayers: { ...state.activeLayers, [layer]: isActive }
    })),

    syncState: (state) => set({
        currentAsset: state.currentMedia || null,
        activeLayers: state.activeLayers || {},
        pacingSpeed: state.pacingSpeed || 1.0,
        currentPhase: state.currentPhase || 'neutral'
    }),

    updateViewerCount: (count) => set({ activeViewers: count }),
    setConnected: (connected) => set({ isConnected: connected })
}));

// Socket Listeners Setup
// This can be initialized once in top-level app or within the store file if we use a subscription method.
// For simplicity, we'll set up listeners here but they need to be initialized.
// Actually, it's better to expose a setup function or just rely on the component using the store to trigger a setup effect?
// Or we can just bind them globally here if this file is imported? 
// Safer to export a helper `setupSocketListeners` to call in App.tsx or DirectorPanel.tsx

export const setupSocketListeners = () => {
    const { syncState, setAsset, updateViewerCount, setConnected } = useStore.getState();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Full Sync (Handshake)
    socket.on('director:state_sync', (data) => {
        console.log('[Store] Full Sync:', data);
        syncState(data);
        // Also update viewer count if provided in sync (it's not currently, but good practice)
        // logic below handles real-time updates
    });

    socket.on('director:viewer_count', (count) => {
        console.log('[Store] Viewer Count Update:', count);
        updateViewerCount(count);
    });

    // Incremental Updates (Monitor)
    socket.on('director:monitor_update', (event) => {
        console.log('[Store] Monitor Update:', event);
        switch (event.type) {
            case 'MEDIA_CHANGE':
                setAsset(event.data);
                break;
            case 'LAYERS':
                // Event data might be full layers object or single toggle?
                // SessionManager returns full layers object usually.
                useStore.setState({ activeLayers: event.data });
                break;
            case 'BREATHING':
                // Breathing rate update, usually implies breathing layer might be active?
                // Or just rate. If layer is part of 'activeLayers', it should be synced via LAYERS event usually?
                // Let's assume 'LAYERS' handles the boolean state.
                break;
            case 'FLASH':
                // Transient effect, might not store state unless we want to show a flash on mirror?
                // VRExperienceMirror will listen to 'viewer:flash' or we can trigger a temp state here.
                // For now, let component handle visual flash.
                break;
        }
    });

    // We can also listen to viewer events if we want strict mirroring of what viewer receives
    // But 'director:monitor_update' is cleaner if we trust the backend.
};

export default useStore;
