import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../services/api';

interface ActiveState {
    currentAsset: { type: string; url: string; name?: string } | null;
    intensity: number;
    // Add other state as needed (e.g. layers active)
    layers: {
        spiral: boolean;
        flashback: boolean;
        breathing: boolean;
    };
}

interface ActiveStateContextType {
    activeState: ActiveState;
    setActiveState: React.Dispatch<React.SetStateAction<ActiveState>>;
}

const ActiveStateContext = createContext<ActiveStateContextType | undefined>(undefined);

export const ActiveStateProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeState, setActiveState] = useState<ActiveState>({
        currentAsset: null,
        intensity: 5,
        layers: {
            spiral: false,
            flashback: false,
            breathing: false,
        }
    });

    useEffect(() => {
        // Join 'host-watch' room to receive updates that are broadcasted to 'viewer' or specifically for monitoring
        // Ideally we should listen to 'viewer' room events if we want to see exactly what they see.
        socket.emit('join_room', 'viewer');

        const handleUpdate = (data: any) => {
            console.log('Monitor received update session:', data);
            setActiveState(prev => ({
                ...prev,
                currentAsset: data.asset?.url ? data.asset : prev.currentAsset,
            }));
        };

        const handleInduction = (data: { layer: string; active: boolean }) => {
            console.log('Monitor received induction:', data);
            setActiveState(prev => ({
                ...prev,
                layers: {
                    ...prev.layers,
                    [data.layer]: data.active
                }
            }));
        };

        const handleFlash = () => {
            // We might want to trigger a temporary flash state or just let the component handle the event if it listens directly.
            // But context is better for global state. 
            // However, flash is transient. We can use a timestamp or toggle to trigger effects.
            // For now, let's just log it. Components can listen to socket directly for transient effects or we add a 'lastFlash' timestamp.
            console.log('Monitor received flash');
        };

        socket.on('viewer:update_session', handleUpdate);
        socket.on('viewer:induction', handleInduction);
        socket.on('viewer:flash', handleFlash);

        return () => {
            socket.off('viewer:update_session', handleUpdate);
            socket.off('viewer:induction', handleInduction);
            socket.off('viewer:flash', handleFlash);
            socket.emit('leave_room', 'viewer');
        };
    }, []);

    return (
        <ActiveStateContext.Provider value={{ activeState, setActiveState }}>
            {children}
        </ActiveStateContext.Provider>
    );
};

export const useActiveState = () => {
    const context = useContext(ActiveStateContext);
    if (context === undefined) {
        throw new Error('useActiveState must be used within an ActiveStateProvider');
    }
    return context;
};
