import React, { useState, useEffect, useCallback } from 'react';
import { sendCalibration } from '../services/api';
import debounce from 'lodash/debounce';

interface CalibrationData {
    ipd: number;
    scale: number;
    vOffset: number;
}

const DEFAULT_CALIBRATION: CalibrationData = {
    ipd: 0,
    scale: 1.0,
    vOffset: 0,
};

const PROFILES: Record<string, CalibrationData> = {
    'Default': DEFAULT_CALIBRATION,
    'Google Cardboard V1': { ipd: 0, scale: 0.8, vOffset: 0 },
    'Google Cardboard V2': { ipd: 0, scale: 1.0, vOffset: 0 },
    'TechRise / Generic': { ipd: 5, scale: 1.1, vOffset: -10 },
};

const CalibrationPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [calibration, setCalibration] = useState<CalibrationData>(DEFAULT_CALIBRATION);
    const [selectedProfile, setSelectedProfile] = useState<string>('Default');

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('vr_calibration');
        if (saved) {
            setCalibration(JSON.parse(saved));
            setSelectedProfile('Custom');
        }
    }, []);

    // Create a debounced sender to avoid flooding the socket
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSend = useCallback(
        debounce((data: CalibrationData) => {
            console.log('Sending calibration:', data);
            sendCalibration(data);
        }, 100), // 100ms delay
        []
    );

    // Handle slider changes
    const handleChange = (key: keyof CalibrationData, value: number) => {
        const newData = { ...calibration, [key]: value };
        setCalibration(newData);
        setSelectedProfile('Custom');
        debouncedSend(newData);
        // Do NOT save to localStorage on every slide, only when explicitly saved or maybe on unmount
    };

    // Handle profile selection
    const handleProfileSelect = (name: string) => {
        if (PROFILES[name]) {
            const data = PROFILES[name];
            setCalibration(data);
            setSelectedProfile(name);
            debouncedSend(data);
        }
    };

    const saveProfile = () => {
        localStorage.setItem('vr_calibration', JSON.stringify(calibration));
        alert('Profile saved to local storage!');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed top-20 right-4 w-80 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl z-50 text-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    VR Calibration
                </h3>
                <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
            </div>

            {/* Profile Selector */}
            <div className="mb-6">
                <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Profile</label>
                <select
                    value={selectedProfile}
                    onChange={(e) => handleProfileSelect(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                    <option value="Custom">Custom</option>
                    {Object.keys(PROFILES).map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            {/* Sliders */}
            <div className="space-y-6">
                {/* IPD Slider */}
                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-white/60">IPD (Eye Spacing)</span>
                        <span className="font-mono text-blue-400">{calibration.ipd}px</span>
                    </div>
                    <input
                        type="range"
                        min="-100"
                        max="250"
                        value={calibration.ipd}
                        onChange={(e) => handleChange('ipd', Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                {/* Scale Slider */}
                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-white/60">Scale (Zoom)</span>
                        <span className="font-mono text-purple-400">{calibration.scale.toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.01"
                        value={calibration.scale}
                        onChange={(e) => handleChange('scale', Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>

                {/* Vertical Offset Slider */}
                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-white/60">Vertical Offset</span>
                        <span className="font-mono text-green-400">{calibration.vOffset}px</span>
                    </div>
                    <input
                        type="range"
                        min="-100"
                        max="100"
                        value={calibration.vOffset}
                        onChange={(e) => handleChange('vOffset', Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-4 border-t border-white/10 flex justify-between">
                <button
                    onClick={() => {
                        setCalibration(DEFAULT_CALIBRATION);
                        debouncedSend(DEFAULT_CALIBRATION);
                    }}
                    className="px-3 py-1.5 text-xs text-white/40 hover:text-white transition-colors"
                >
                    Reset
                </button>
                <button
                    onClick={saveProfile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    Save As Default
                </button>
            </div>
        </div>
    );
};

export default CalibrationPanel;
