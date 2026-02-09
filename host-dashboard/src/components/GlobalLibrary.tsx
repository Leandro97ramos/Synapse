import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAssets, updateAsset, batchDeleteAssets, getModules } from '../services/api';
import Modal from './Modal';

const GlobalLibrary = () => {
    const navigate = useNavigate();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [folders, setFolders] = useState<any[]>([]); // For move functionality

    // Filters
    const [filterType, setFilterType] = useState<string>('');
    const [filterFolder, setFilterFolder] = useState<string>('');

    // Selection
    const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [moveToFolderId, setMoveToFolderId] = useState<string>('');

    // Fetch Assets
    const fetchAssets = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterType) params.type = filterType;
            if (filterFolder) params.folder_id = filterFolder;

            const data = await getAllAssets(params);
            setAssets(data);
            setSelectedAssetIds([]); // Clear selection on refresh
        } catch (error) {
            console.error("Error fetching assets:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Folders for Move/Filter
    const fetchFolders = async () => {
        try {
            const modules = await getModules();
            const allFolders: any[] = [];
            modules.forEach((m: any) => {
                if (m.folders) {
                    m.folders.forEach((f: any) => {
                        allFolders.push({ ...f, moduleName: m.name });
                    });
                }
            });
            setFolders(allFolders);
        } catch (error) {
            console.error("Error fetching folders:", error);
        }
    };

    useEffect(() => {
        fetchFolders();
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [filterType, filterFolder]);

    // Selection Handler
    const toggleSelection = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (selectedAssetIds.includes(id)) {
            setSelectedAssetIds(selectedAssetIds.filter(aid => aid !== id));
        } else {
            setSelectedAssetIds([...selectedAssetIds, id]);
        }
    };

    // Batch Delete
    const handleBatchDelete = async () => {
        if (!window.confirm(`Delete ${selectedAssetIds.length} assets? This cannot be undone.`)) return;
        try {
            await batchDeleteAssets(selectedAssetIds);
            fetchAssets();
        } catch (error) {
            console.error(error);
            alert("Failed to delete assets");
        }
    };

    // Edit (Single)
    const openEditModal = (asset: any) => {
        setEditingAsset(asset);
        setEditName(asset.name || '');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingAsset) return;
        try {
            await updateAsset(editingAsset.id, { name: editName });
            setIsEditModalOpen(false);
            fetchAssets();
        } catch (error) {
            console.error(error);
            alert("Failed to update asset");
        }
    };

    // Move (Batch)
    const handleBatchMove = async () => {
        try {
            const folderId = moveToFolderId === 'unassigned' ? null : Number(moveToFolderId);
            // We have to loop because backend updateAsset is single by default, 
            // but we could have made a batch update endpoint. 
            // For now, looping in frontend is acceptable for small batches.
            // Ideally backend would have updateAssets(ids, {folder_id})

            const promises = selectedAssetIds.map(id => updateAsset(id, { folder_id: folderId }));
            await Promise.all(promises);

            setIsMoveModalOpen(false);
            fetchAssets();
        } catch (error) {
            console.error(error);
            alert("Failed to move assets");
        }
    };

    return (
        <main className="flex-1 h-full glass-panel rounded-xl p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Header / Toolbar */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 relative z-10 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="glass-button px-4 py-2 flex items-center gap-2 hover:bg-white/10"
                    >
                        <span>←</span> Back
                    </button>
                    <div>
                        <h2 className="text-2xl font-light text-white tracking-widest">Global Library</h2>
                        <p className="text-white/40 text-sm mt-1">{assets.length} Total Files</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <select
                        value={filterFolder}
                        onChange={(e) => setFilterFolder(e.target.value)}
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    >
                        <option value="">All Folders</option>
                        <option value="null">Unassigned</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name} ({f.moduleName})</option>
                        ))}
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    >
                        <option value="">All Types</option>
                        <option value="image">Images</option>
                        <option value="audio">Audio</option>
                        <option value="video">Video</option>
                    </select>
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
                            Move to Folder
                        </button>
                        <button
                            onClick={handleBatchDelete}
                            className="glass-button text-sm py-1 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto pr-2 relative z-10">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    </div>
                ) : assets.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {assets.map(asset => (
                            <div
                                key={asset.id}
                                onClick={() => openEditModal(asset)}
                                className={`
                                    relative group rounded-xl bg-white/5 border overflow-hidden cursor-pointer transition-all duration-200
                                    ${selectedAssetIds.includes(asset.id) ? 'ring-2 ring-cyan-500 border-transparent bg-cyan-500/10' : 'border-white/5 hover:border-white/20'}
                                `}
                            >
                                {/* Selection Checkbox */}
                                <div
                                    onClick={(e) => toggleSelection(e, asset.id)}
                                    className={`
                                        absolute top-2 left-2 z-20 w-5 h-5 rounded border flex items-center justify-center transition-all
                                        ${selectedAssetIds.includes(asset.id) ? 'bg-cyan-500 border-cyan-500' : 'bg-black/40 border-white/30 hover:border-white'}
                                    `}
                                >
                                    {selectedAssetIds.includes(asset.id) && <span className="text-white text-xs">✓</span>}
                                </div>

                                {/* Thumbnail */}
                                <div className="aspect-square bg-black/20 flex items-center justify-center overflow-hidden">
                                    {asset.type === 'image' && (
                                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80" />
                                    )}
                                    {['audio', 'video', 'special'].includes(asset.type) && (
                                        <span className="text-3xl opacity-50">
                                            {asset.type === 'audio' ? '🎵' : asset.type === 'video' ? '🎬' : '✨'}
                                        </span>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-2 bg-black/40">
                                    <p className="text-xs font-medium text-white/90 truncate">{asset.name || 'Untitled'}</p>
                                    <p className="text-[10px] text-white/40 truncate mt-0.5">
                                        {folders.find(f => f.id === asset.folder_id)?.name || 'Unassigned'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/30">
                        <span className="text-4xl mb-4">📂</span>
                        <p>No assets found.</p>
                    </div>
                )}
            </div>

            {/* Edit Modal (Name) */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Asset"
            >
                <div>
                    <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Asset Name</label>
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 mb-4 focus:outline-none focus:border-cyan-500/50"
                        placeholder="Enter name"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsEditModalOpen(false)} className="glass-button text-white/50 hover:text-white">Cancel</button>
                        <button onClick={handleSaveEdit} className="glass-button bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30">Save Changes</button>
                    </div>
                </div>
            </Modal>

            {/* Move Modal (Folder) */}
            <Modal
                isOpen={isMoveModalOpen}
                onClose={() => setIsMoveModalOpen(false)}
                title={`Move ${selectedAssetIds.length} Assets`}
            >
                <div>
                    <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Select Destination</label>
                    <select
                        value={moveToFolderId}
                        onChange={(e) => setMoveToFolderId(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white mb-6 focus:outline-none"
                    >
                        <option value="" disabled>Select Folder</option>
                        <option value="unassigned" className="text-yellow-400">Unassigned (Remove from folder)</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name} ({f.moduleName})</option>
                        ))}
                    </select>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsMoveModalOpen(false)} className="glass-button text-white/50 hover:text-white">Cancel</button>
                        <button onClick={handleBatchMove} className="glass-button bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30">Move Assets</button>
                    </div>
                </div>
            </Modal>

        </main>
    );
};

export default GlobalLibrary;
