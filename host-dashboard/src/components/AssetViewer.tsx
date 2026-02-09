import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getModuleByName, updateAsset, getModules, batchDeleteAssets } from '../services/api';
import Modal from './Modal';

const AssetViewer = () => {
    const { moduleName, folderId } = useParams();
    const navigate = useNavigate();
    const [assets, setAssets] = useState<any[]>([]);
    const [folderName, setFolderName] = useState('');
    const [loading, setLoading] = useState(true);

    // Preview State
    const [previewAsset, setPreviewAsset] = useState<any>(null);

    // Selection State
    const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Batch Action Modals
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [allFolders, setAllFolders] = useState<any[]>([]);
    const [moveToFolderId, setMoveToFolderId] = useState<string>('');

    // Single Edit (Rename) Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [editName, setEditName] = useState('');

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
            setSelectedAssetIds([]);
        } catch (error) {
            console.error("Error fetching assets:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllFolders = async () => {
        try {
            const modules = await getModules();
            const folders: any[] = [];
            modules.forEach((m: any) => {
                if (m.folders) {
                    m.folders.forEach((f: any) => {
                        folders.push({ ...f, moduleName: m.name });
                    });
                }
            });
            setAllFolders(folders);
        } catch (error) {
            console.error("Error fetching folders:", error);
        }
    };

    useEffect(() => {
        fetchAssets();
        fetchAllFolders();
    }, [moduleName, folderId]);

    // Handlers
    const handleAssetClick = (asset: any) => {
        if (isSelectionMode) {
            toggleSelection(asset.id);
        } else {
            setPreviewAsset(asset);
        }
    };

    const toggleSelection = (id: number) => {
        if (selectedAssetIds.includes(id)) {
            setSelectedAssetIds(selectedAssetIds.filter(aid => aid !== id));
        } else {
            setSelectedAssetIds([...selectedAssetIds, id]);
        }
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedAssetIds([]); // Clear on toggle
    };

    // Actions
    const handleDeleteSelected = async () => {
        if (confirm(`Delete ${selectedAssetIds.length} assets?`)) {
            try {
                await batchDeleteAssets(selectedAssetIds);
                fetchAssets();
            } catch (error) {
                console.error(error);
                alert("Failed to delete assets");
            }
        }
    };

    const handleMoveSelected = async () => {
        try {
            const targetId = moveToFolderId === 'unassigned' ? null : Number(moveToFolderId);
            const promises = selectedAssetIds.map(id => updateAsset(id, { folder_id: targetId }));
            await Promise.all(promises);
            setIsMoveModalOpen(false);
            fetchAssets();
        } catch (error) {
            console.error(error);
            alert("Failed to move assets");
        }
    };

    const openRenameModal = (e: React.MouseEvent, asset: any) => {
        e.stopPropagation();
        setEditingAsset(asset);
        setEditName(asset.name || '');
        setIsEditModalOpen(true);
    };

    const handleRename = async () => {
        if (!editingAsset) return;
        try {
            await updateAsset(editingAsset.id, { name: editName });
            setIsEditModalOpen(false);
            fetchAssets();
        } catch (error) {
            console.error(error);
            alert("Failed to rename asset");
        }
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
                    <img key={previewAsset.url} src={previewAsset.url} alt="Preview" className="max-w-full max-h-[70vh] rounded-lg shadow-2xl" onError={handleMediaError} />
                );
            case 'video':
                return (
                    <video key={previewAsset.url} controls autoPlay src={previewAsset.url} className="max-w-full max-h-[70vh] rounded-lg shadow-2xl" onError={handleMediaError} />
                );
            case 'audio':
                return (
                    <div className="w-full flex flex-col items-center justify-center p-10 bg-black/20 rounded-xl">
                        <div className="text-6xl mb-6 animate-pulse">🎵</div>
                        <audio key={previewAsset.url} controls autoPlay src={previewAsset.url} className="w-full" onError={handleMediaError}>Your browser does not support the audio element.</audio>
                    </div>
                );
            case 'special':
                return (
                    <div className="w-full flex flex-col items-center justify-center p-10 bg-black/20 rounded-xl">
                        <div className="text-6xl mb-6 text-yellow-400">✨</div>
                        <p className="text-white/80 font-mono text-sm break-all">{previewAsset.url}</p>
                    </div>
                );
            default:
                return <p className="text-white/50">Unsupported format</p>;
        }
    };

    return (
        <main className="flex-1 h-full glass-panel rounded-xl p-6 relative overflow-hidden group flex flex-col">
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <header className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/dashboard/${moduleName}`)} className="glass-button px-4 py-2 flex items-center gap-2 hover:bg-white/10">
                        <span>←</span> Back
                    </button>
                    <div>
                        <h2 className="text-2xl font-light text-white tracking-widest">{folderName || 'Folder'}</h2>
                        <p className="text-white/40 text-sm mt-1">{assets.length} Assets</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={toggleSelectionMode}
                        className={`glass-button ${isSelectionMode ? 'bg-cyan-500/20 text-cyan-300' : ''}`}
                    >
                        {isSelectionMode ? 'Cancel Selection' : 'Select'}
                    </button>
                </div>
            </header>

            {/* Selection Toolbar */}
            {selectedAssetIds.length > 0 && (
                <div className="bg-cyan-900/40 border border-cyan-500/30 rounded-lg p-3 mb-6 flex justify-between items-center animate-[fadeIn_0.3s_ease-out] relative z-20">
                    <span className="text-cyan-300 font-medium ml-2">{selectedAssetIds.length} Selected</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsMoveModalOpen(true)}
                            className="glass-button text-sm py-1 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200"
                        >
                            Move
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            className="glass-button text-sm py-1 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Assets Grid */}
            <div className="flex-1 overflow-y-auto pr-2 relative z-10">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    </div>
                ) : assets.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {assets.map((asset) => (
                            <div
                                key={asset.id}
                                onClick={() => handleAssetClick(asset)}
                                className={`
                                    bg-white/5 border rounded-xl p-3 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,150,255,0.15)] group/asset backdrop-blur-sm aspect-square flex flex-col relative
                                    ${selectedAssetIds.includes(asset.id) ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 hover:border-white/20'}
                                `}
                            >
                                {/* Selection Checkbox */}
                                {isSelectionMode && (
                                    <div className={`
                                        absolute top-2 left-2 z-20 w-5 h-5 rounded border flex items-center justify-center transition-all
                                        ${selectedAssetIds.includes(asset.id) ? 'bg-cyan-500 border-cyan-500' : 'bg-black/40 border-white/30 hover:border-white'}
                                    `}>
                                        {selectedAssetIds.includes(asset.id) && <span className="text-white text-xs">✓</span>}
                                    </div>
                                )}

                                <div className="flex-1 rounded-lg bg-black/20 mb-3 overflow-hidden relative flex items-center justify-center">
                                    {asset.type === 'image' && <img src={asset.url} alt="Asset" className="w-full h-full object-cover opacity-80 group-hover/asset:opacity-100 transition-opacity" />}
                                    {['audio', 'video', 'special'].includes(asset.type) && <div className="text-4xl">{asset.type === 'audio' ? '🎵' : asset.type === 'video' ? '🎬' : '✨'}</div>}
                                </div>
                                <div className="flex justify-between items-center relative z-10">
                                    <span className="text-xs text-white/60 uppercase tracking-wider truncate max-w-[80px]">{asset.name || asset.type}</span>
                                    {!isSelectionMode && (
                                        <button
                                            onClick={(e) => openRenameModal(e, asset)}
                                            className="text-white/20 hover:text-white transition-colors p-1"
                                            title="Rename"
                                        >
                                            ✎
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="col-span-full text-center text-white/40 py-10">
                        No assets found in this folder.
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            <Modal isOpen={!!previewAsset} onClose={() => setPreviewAsset(null)} title="Asset Preview">
                <div className="flex justify-center items-center min-h-[200px]">{renderPreviewContent()}</div>
            </Modal>

            {/* Rename Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Rename Asset">
                <div>
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 mb-4 focus:outline-none focus:border-cyan-500/50"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsEditModalOpen(false)} className="glass-button text-white/50 hover:text-white">Cancel</button>
                        <button onClick={handleRename} className="glass-button bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30">Save</button>
                    </div>
                </div>
            </Modal>

            {/* Move Modal */}
            <Modal isOpen={isMoveModalOpen} onClose={() => setIsMoveModalOpen(false)} title={`Move ${selectedAssetIds.length} Assets`}>
                <div>
                    <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Select Destination</label>
                    <select
                        value={moveToFolderId}
                        onChange={(e) => setMoveToFolderId(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white mb-6 focus:outline-none"
                    >
                        <option value="" disabled>Select Folder</option>
                        <option value="unassigned" className="text-yellow-400">Unassigned (Remove from folder)</option>
                        {allFolders.map(f => (
                            <option key={f.id} value={f.id}>{f.name} ({f.moduleName})</option>
                        ))}
                    </select>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsMoveModalOpen(false)} className="glass-button text-white/50 hover:text-white">Cancel</button>
                        <button onClick={handleMoveSelected} className="glass-button bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30">Move Assets</button>
                    </div>
                </div>
            </Modal>
        </main>
    );
};

export default AssetViewer;
