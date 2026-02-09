import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 p-6 text-left shadow-2xl transition-all animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white tracking-wide uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white transition-colors text-2xl leading-none"
                    >
                        &times;
                    </button>
                </div>

                <div className="mt-2">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
