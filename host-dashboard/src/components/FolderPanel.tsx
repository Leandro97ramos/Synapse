

import { useState, useEffect } from 'react';
import { getBubblesConfig } from '../services/api';

const FolderPanel = () => {
    const [folders, setFolders] = useState<any[]>([]);

    useEffect(() => {
        const fetchFolders = async () => {
            try {
                const config = await getBubblesConfig();
                if (config.folders) {
                    setFolders(config.folders.map((f: any) => ({
                        id: f.id,
                        name: f.name,
                        count: 0 // Count not in DB yet, defaulting to 0
                    })));
                }
            } catch (error) {
                console.error("Error fetching folders:", error);
            }
        };

        fetchFolders();
    }, []);

    return (
        <main className="flex-1 h-full glass-panel rounded-xl p-6 relative overflow-hidden group">
            {/* Decorative background glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

            <header className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-light text-white tracking-widest">Library</h2>
                    <p className="text-white/40 text-sm mt-1">Browse your media collections</p>
                </div>
                <div className="flex space-x-3">
                    <button className="glass-button">
                        New Folder
                    </button>
                    <button className="glass-button">
                        Scan Library
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                {folders.map((folder) => (
                    <div
                        key={folder.id}
                        className="bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,150,255,0.15)] hover:-translate-y-1 group/folder backdrop-blur-sm"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-4xl opacity-70 group-hover/folder:scale-110 transition-transform duration-300">📂</span>
                            <button className="text-white/20 hover:text-white transition-colors">•••</button>
                        </div>
                        <h3 className="font-medium text-lg text-white/90 truncate">{folder.name}</h3>
                        <p className="text-sm text-white/40 mt-1">{folder.count} items</p>
                    </div>
                ))}

                {/* Add New Placeholder */}
                <div className="border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-white/20 hover:text-white/60 hover:border-white/30 cursor-pointer transition-all duration-300 min-h-[140px]">
                    <span className="text-3xl mb-2">+</span>
                    <span className="text-sm font-medium">Add Source</span>
                </div>
            </div>
        </main>
    );
};

export default FolderPanel;
