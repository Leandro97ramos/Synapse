import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getModuleByName } from '../services/api';
import Modal from './Modal';

const AssetViewer = () => {
    const { moduleName, folderId } = useParams();
    const navigate = useNavigate();
    const [assets, setAssets] = useState<any[]>([]);
    const [folderName, setFolderName] = useState('');
    const [loading, setLoading] = useState(true);

    // Preview State
    const [previewAsset, setPreviewAsset] = useState<any>(null);

    useEffect(() => {
        const fetchAssets = async () => {
            if (!moduleName || !folderId) return;
            try {
                setLoading(true);
                const config = await getModuleByName(moduleName);
                const folder = config.folders.find((f: any) => f.id === Number(folderId));

                if (folder) {
                    setFolderName(folder.name);
                    setAssets(folder.assets || []);
                } else {
                    console.error("Folder not found");
                }
            } catch (error) {
                console.error("Error fetching assets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssets();
    }, [moduleName, folderId]);

    const handleAssetClick = (asset: any) => {
        setPreviewAsset(asset);
    };

    const renderPreviewContent = () => {
        if (!previewAsset) return null;

        const handleMediaError = (e: any) => {
            console.error("Media Error:", e);
            alert("Error loading media. Please check the URL or file.");
        };

        switch (previewAsset.type) {
            case 'image':
                return (
                    <img
                        key={previewAsset.url}
                        src={previewAsset.url}
                        alt="Preview"
                        className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
                        onError={handleMediaError}
                    />
                );
            case 'video':
                return (
                    <video
                        key={previewAsset.url}
                        controls
                        autoPlay
                        src={previewAsset.url}
                        className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
                        onError={handleMediaError}
                    />
                );
            case 'audio':
                return (
                    <div className="w-full flex flex-col items-center justify-center p-10 bg-black/20 rounded-xl">
                        <div className="text-6xl mb-6 animate-pulse">🎵</div>
                        <audio
                            key={previewAsset.url}
                            controls
                            autoPlay
                            src={previewAsset.url}
                            className="w-full"
                            onError={handleMediaError}
                        >
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                );
            case 'special':
                return (
                    <div className="w-full flex flex-col items-center justify-center p-10 bg-black/20 rounded-xl">
                        <div className="text-6xl mb-6 text-yellow-400">✨</div>
                        <p className="text-white/80 font-mono text-sm break-all">{previewAsset.url}</p>
                        <p className="mt-4 text-xs text-white/40 uppercase tracking-widest">Special Asset Configuration</p>
                    </div>
                );
            default:
                return <p className="text-white/50">Unsupported format</p>;
        }
    };

    return (
        <main className="flex-1 h-full glass-panel rounded-xl p-6 relative overflow-hidden group">
            {/* Decorative background glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <header className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/dashboard/${moduleName}`)}
                        className="glass-button px-4 py-2 flex items-center gap-2 hover:bg-white/10"
                    >
                        <span>←</span> Back
                    </button>
                    <div>
                        <h2 className="text-2xl font-light text-white tracking-widest">{folderName || 'Folder'}</h2>
                        <p className="text-white/40 text-sm mt-1">{assets.length} Assets</p>
                    </div>
                </div>
            </header>

            {/* Assets Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 relative z-10">
                {loading ? (
                    <div className="col-span-full flex justify-center items-center py-20">
                        <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    </div>
                ) : assets.length > 0 ? (
                    assets.map((asset) => (
                        <div
                            key={asset.id}
                            onClick={() => handleAssetClick(asset)}
                            className="bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 rounded-xl p-3 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,150,255,0.15)] group/asset backdrop-blur-sm aspect-square flex flex-col"
                        >
                            <div className="flex-1 rounded-lg bg-black/20 mb-3 overflow-hidden relative flex items-center justify-center">
                                {/* Thumbnail Preview */}
                                {asset.type === 'image' && (
                                    <img src={asset.url} alt="Asset" className="w-full h-full object-cover opacity-80 group-hover/asset:opacity-100 transition-opacity" />
                                )}
                                {asset.type === 'video' && (
                                    <div className="text-4xl">🎬</div>
                                )}
                                {asset.type === 'audio' && (
                                    <div className="text-4xl">🎵</div>
                                )}
                                {asset.type === 'special' && (
                                    <div className="text-4xl">✨</div>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-white/60 uppercase tracking-wider">{asset.type}</span>
                                <button className="text-white/20 hover:text-white transition-colors">•••</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center text-white/40 py-10">
                        No assets found in this folder.
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            <Modal
                isOpen={!!previewAsset}
                onClose={() => setPreviewAsset(null)}
                title="Asset Preview"
            >
                <div className="flex justify-center items-center min-h-[200px]">
                    {renderPreviewContent()}
                </div>
            </Modal>
        </main>
    );
};

export default AssetViewer;
