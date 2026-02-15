
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
    const navigate = useNavigate();

    const modules = [
        { id: 1, name: 'Media Library', icon: '🎬', path: '/library' },
        { id: 2, name: 'Director', icon: '🎮', path: '/director' },
        { id: 3, name: 'Sessions', icon: '🕐', path: '/' }, // Assuming Home is Sessions or Dashboard
        { id: 4, name: 'Settings', icon: '⚙️', path: '/' },
    ];

    return (
        <aside className="w-64 h-full glass-panel flex flex-col p-4 rounded-xl mr-4 transition-transform hover:scale-[1.01] duration-500 border-white/5">
            <div className="mb-8 p-2">
                <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                    Synapse
                </h1>
            </div>

            <nav className="flex-1 space-y-2">
                {modules.map((mod) => (
                    <button
                        key={mod.id}
                        onClick={() => navigate(mod.path)}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all duration-300 group text-left"
                    >
                        <span className="text-lg group-hover:scale-110 transition-transform duration-300">{mod.icon}</span>
                        <span className="font-medium tracking-wide">{mod.name}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-white/10 mt-auto">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-[0_0_10px_rgba(100,100,255,0.5)]"></div>
                    <div className="text-sm">
                        <div className="text-white font-medium">Host User</div>
                        <div className="text-white/40 text-xs">Online</div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
