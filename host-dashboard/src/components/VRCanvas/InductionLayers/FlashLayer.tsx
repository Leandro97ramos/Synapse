import { useEffect, useState } from 'react';

// Simple HTML Overlay component
const FlashLayer = ({ active, color = 'white' }: { active: boolean, color?: string }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (active) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 2000); // Max duration just in case
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [active]);

    if (!active && !visible) return null;

    return (
        <div
            className={`absolute inset-0 z-[9999] pointer-events-none transition-opacity duration-300 ease-out ${active ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundColor: color }}
        />
    );
};

export default FlashLayer;
