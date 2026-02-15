import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getModuleByName, createFolder, createAsset, updateFolder, deleteFolder } from '../services/api';
import Modal from './Modal';

const FolderPanel = () => {
    const { moduleName } = useParams();
    const navigate = useNavigate();
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [moduleId, setModuleId] = useState<number | null>(null);

    // Modal States
    const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
    const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
    const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
    const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);

    // Form States
    const [newFolderName, setNewFolderName] = useState('');

    // Asset Creation State
    const [assetCategory, setAssetCategory] = useState<'visual' | 'audio'>('visual');
    const [assetSourceType, setAssetSourceType] = useState<'url' | 'file'>('url');
    const [newAssetUrl, setNewAssetUrl] = useState('');
    const [newAssetFile, setNewAssetFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [targetFolderId, setTargetFolderId] = useState<number | string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit/Delete State
    const [selectedFolder, setSelectedFolder] = useState<any>(null);
    const [editFolderName, setEditFolderName] = useState('');

    const fetchFolders = async () => {
        if (!moduleName) return;
        try {
            setLoading(true);
            const config = await getModuleByName(moduleName);
            setModuleId(config.id);
            if (config.folders) {
                setFolders(config.folders.map((f: any) => ({
                    id: f.id,
                    name: f.name,
                    count: f.assets ? f.assets.length : 0
                })));
                if (config.folders.length > 0 && !targetFolderId) {
                    setTargetFolderId(config.folders[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching folders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (moduleName) {
            localStorage.setItem('lastModule', moduleName);
        }
        fetchFolders();
    }, [moduleName]);

    // Cleanup preview URL on unmount or when modal closes
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, []);

    const resetAssetForm = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setNewAssetUrl('');
        setNewAssetFile(null);
        setPreviewUrl(null);
        setIsAddSourceModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCreateFolder = async () => {
        if (!moduleId || !newFolderName.trim()) return;
        try {
            await createFolder(moduleId, newFolderName);
            setIsNewFolderModalOpen(false);
            setNewFolderName('');
            fetchFolders();
        } catch (error) {
            console.error("Error creating folder:", error);
            alert("Failed to create folder");
        }
    };

    const handleCreateAsset = async () => {
        if (!targetFolderId) return;

        if (assetSourceType === 'url' && !newAssetUrl.trim()) return;
        if (assetSourceType === 'file' && !newAssetFile) return;

        try {
            setIsUploading(true);
            // Determine type hinted to backend (backend can auto-detect from file MIME too)
            let type = 'special';
            if (assetCategory === 'audio') type = 'audio';
            else if (assetCategory === 'visual') type = 'image'; // Default hint, backend fixes if video file

            const urlOrFile = assetSourceType === 'file' ? newAssetFile! : newAssetUrl;

            await createAsset(Number(targetFolderId), type, urlOrFile, undefined, moduleId || undefined);

            resetAssetForm();
            fetchFolders();
        } catch (error) {
            console.error("Error creating asset:", error);
            alert("Failed to create asset");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setNewAssetFile(file);

            // Generate Preview
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const openEditModal = (e: React.MouseEvent, folder: any) => {
        e.stopPropagation();
        setSelectedFolder(folder);
        setEditFolderName(folder.name);
        setIsEditFolderModalOpen(true);
    };

    const openDeleteModal = (e: React.MouseEvent, folder: any) => {
        e.stopPropagation();
        setSelectedFolder(folder);
        setIsDeleteFolderModalOpen(true);
    };

    const handleUpdateFolder = async () => {
        if (!selectedFolder || !editFolderName.trim()) return;
        try {
            await updateFolder(selectedFolder.id, editFolderName);
            setIsEditFolderModalOpen(false);
            setSelectedFolder(null);
            fetchFolders();
        } catch (error) {
            console.error("Error updating folder:", error);
            alert("Failed to update folder");
        }
    };

    const handleDeleteFolder = async () => {
        if (!selectedFolder) return;
        try {
            await deleteFolder(selectedFolder.id);
            setIsDeleteFolderModalOpen(false);
            setSelectedFolder(null);
            fetchFolders();
        } catch (error) {
            console.error("Error deleting folder:", error);
            alert("Failed to delete folder");
        }
    };

    return (
        <main className="flex-1 h-full glass-panel rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

            <header className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="glass-button px-4 py-2 flex items-center gap-2 hover:bg-white/10"
                    >
                        <span>←</span> Back
                    </button>
                    <div>
                        <h2 className="text-2xl font-light text-white tracking-widest">Library</h2>
                        <p className="text-white/40 text-sm mt-1">Browse your media collections</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setIsNewFolderModalOpen(true)}
                        className="glass-button bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300"
                    >
                        + New Folder
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                {loading ? (
                    <div className="col-span-full flex justify-center items-center py-20">
                        <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    </div>
                ) : folders.length > 0 ? (
                    <>
                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                onClick={() => navigate(`/dashboard/${moduleName}/folder/${folder.id}`)}
                                className="bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,150,255,0.15)] hover:-translate-y-1 group/folder backdrop-blur-sm relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-4xl opacity-70 group-hover/folder:scale-110 transition-transform duration-300">📂</span>

                                    <div className="relative group/actions" onClick={(e) => e.stopPropagation()}>
                                        <button className="text-white/20 hover:text-white transition-colors p-1">•••</button>
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-20">
                                            <button
                                                onClick={(e) => openEditModal(e, folder)}
                                                className="w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white first:rounded-t-lg"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => openDeleteModal(e, folder)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 last:rounded-b-lg"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-medium text-lg text-white/90 truncate">{folder.name}</h3>
                                <p className="text-sm text-white/40 mt-1">{folder.count} items</p>
                            </div>
                        ))}
                    </>
                ) : (
                    <div className="col-span-full text-center text-white/40 py-10">
                        No folders found in this module.
                    </div>
                )}

                <div
                    onClick={() => setIsAddSourceModalOpen(true)}
                    className="border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-white/20 hover:text-white/60 hover:border-white/30 cursor-pointer transition-all duration-300 min-h-[140px]"
                >
                    <span className="text-3xl mb-2">+</span>
                    <span className="text-sm font-medium">Add Source</span>
                </div>
            </div>

            {/* Create Folder Modal */}
            <Modal
                isOpen={isNewFolderModalOpen}
                onClose={() => setIsNewFolderModalOpen(false)}
                title="Create New Folder"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Folder Name</label>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors"
                            placeholder="e.g., Action Movies"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleCreateFolder}
                            className="glass-button bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 w-full justify-center"
                        >
                            Create Folder
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Folder Modal */}
            <Modal
                isOpen={isEditFolderModalOpen}
                onClose={() => setIsEditFolderModalOpen(false)}
                title="Edit Folder"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Folder Name</label>
                        <input
                            type="text"
                            value={editFolderName}
                            onChange={(e) => setEditFolderName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end pt-4 gap-3">
                        <button
                            onClick={() => setIsEditFolderModalOpen(false)}
                            className="glass-button text-white/50 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdateFolder}
                            className="glass-button bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Folder Modal */}
            <Modal
                isOpen={isDeleteFolderModalOpen}
                onClose={() => setIsDeleteFolderModalOpen(false)}
                title="Delete Folder"
            >
                <div className="space-y-4">
                    <p className="text-white/70">
                        Are you sure you want to delete <strong className="text-white">{selectedFolder?.name}</strong>?
                        This action cannot be undone and will delete all assets inside.
                    </p>
                    <div className="flex justify-end pt-4 gap-3">
                        <button
                            onClick={() => setIsDeleteFolderModalOpen(false)}
                            className="glass-button text-white/50 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteFolder}
                            className="glass-button bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
                        >
                            Delete Folder
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add Source Modal - Refactored */}
            <Modal
                isOpen={isAddSourceModalOpen}
                onClose={resetAssetForm}
                title="Add New Asset"
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Target Folder</label>
                        <select
                            value={targetFolderId}
                            onChange={(e) => setTargetFolderId(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none"
                        >
                            <option value="" disabled>Select a folder</option>
                            {folders.map(f => (
                                <option key={f.id} value={f.id} className="bg-[#1a1a2e]">{f.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Asset Category Toggle */}
                    <div>
                        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Category</label>
                        <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-lg">
                            <button
                                onClick={() => { setAssetCategory('visual'); setPreviewUrl(null); }}
                                className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${assetCategory === 'visual'
                                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                                    : 'text-white/40 hover:text-white/60'
                                    }`}
                            >
                                Visual
                            </button>
                            <button
                                onClick={() => { setAssetCategory('audio'); setPreviewUrl(null); }}
                                className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${assetCategory === 'audio'
                                    ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                                    : 'text-white/40 hover:text-white/60'
                                    }`}
                            >
                                Audio
                            </button>
                        </div>
                    </div>

                    {/* Source Type Toggle */}
                    <div className="flex gap-4 text-sm border-b border-white/5 pb-2">
                        <button
                            onClick={() => setAssetSourceType('url')}
                            className={`pb-2 border-b-2 transition-colors ${assetSourceType === 'url' ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-white/40 hover:text-white'}`}
                        >
                            External URL
                        </button>
                        <button
                            onClick={() => setAssetSourceType('file')}
                            className={`pb-2 border-b-2 transition-colors ${assetSourceType === 'file' ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-white/40 hover:text-white'}`}
                        >
                            Upload File
                        </button>
                    </div>

                    {/* Input Area */}
                    <div>
                        {assetSourceType === 'url' ? (
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Source URL</label>
                                <input
                                    type="text"
                                    value={newAssetUrl}
                                    onChange={(e) => setNewAssetUrl(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    placeholder={assetCategory === 'visual' ? "https://example.com/image.jpg" : "https://example.com/audio.mp3"}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Upload File</label>
                                <div
                                    className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-white/30 transition-colors cursor-pointer relative"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept={assetCategory === 'visual' ? "image/*,video/*" : "audio/*"}
                                    />

                                    {previewUrl ? (
                                        <div className="mt-2 flex flex-col items-center">
                                            {assetCategory === 'visual' ? (
                                                newAssetFile?.type.startsWith('video') ? (
                                                    <video src={previewUrl} className="max-h-32 rounded-lg" controls />
                                                ) : (
                                                    <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg object-contain" />
                                                )
                                            ) : (
                                                <audio src={previewUrl} controls className="w-full mt-2" />
                                            )}
                                            <p className="text-cyan-300 text-sm mt-2 truncate max-w-full">{newAssetFile?.name}</p>
                                            <p className="text-xs text-white/40 mt-1">Click to replace</p>
                                        </div>
                                    ) : (
                                        <div className="text-white/40">
                                            <span className="block text-2xl mb-2">📁</span>
                                            Click to select {assetCategory} file
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleCreateAsset}
                            disabled={isUploading}
                            className={`glass-button w-full justify-center flex items-center gap-2 ${isUploading
                                ? 'bg-white/5 text-white/40 cursor-not-allowed'
                                : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30'
                                }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                'Add Asset'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    );
};

export default FolderPanel;
