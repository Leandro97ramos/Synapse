import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../services/api';

interface ActiveState {
    currentAsset: { type: string; url: string; name?: string } | null;
    intensity: number;
    // Add other state as needed (e.g. layers active)
    layers: {
        spiral: boolean;
        flashback: boolean;
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
        }
    });

    useEffect(() => {
        // Join a room to receive updates? 
        // If Relay broadcasts to 'viewer', maybe we should join 'viewer' too to stay in sync?
        // Or 'monitor' room?
        // For now, let's join 'viewer' so we see exactly what they see.
        socket.emit('join_room', 'viewer');

        const handleUpdate = (data: any) => {
            console.log('Monitor received update:', data);
            setActiveState(prev => ({
                ...prev,
                currentAsset: data.asset || prev.currentAsset,
                // If backend sends intensity/layers in update_session, update here.
                // Currently only asset is sent in 'update_session' based on previous code.
                // We might need to standardise the event payload to include full state.
            }));
        };

        const handleCalibration = (data: any) => {
            // Handle calibration updates if useful for monitor
        };

        // We should also listen to 'host:intensity' if it's broadcasted back?
        // Usually Relay broadcasts to 'viewer'. 
        // If we emit host:intensity, relay might broadcast viewer:intensity?
        // Let's assume we need to listen to all 'viewer:*' events.

        socket.on('viewer:update_session', handleUpdate);

        return () => {
            socket.off('viewer:update_session', handleUpdate);
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
