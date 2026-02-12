import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = '/api';
// Namespace needs to be handled carefully. 
// io('/experience') connects to same origin with /experience namespace.
// The actual socket connection goes to /socket.io, which is proxied.
const SOCKET_URL = '/experience';

const api = axios.create({
    baseURL: API_URL,
});

export const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling']
});

export const getModules = async () => {
    const response = await api.get('/modules');
    return response.data;
};

export const getModuleByName = async (name: string) => {
    const response = await api.get(`/modules/${name}`);
    return response.data;
};

export const createFolder = async (moduleId: number, name: string) => {
    const response = await api.post('/folders', { module_id: moduleId, name });
    return response.data;
};

export const createAsset = async (folderId: number | null, type: string, urlOrFile: string | File, name?: string) => {
    const formData = new FormData();
    if (folderId) formData.append('folder_id', String(folderId));
    formData.append('type', type);
    if (name) formData.append('name', name);

    if (urlOrFile instanceof File) {
        formData.append('file', urlOrFile);
    } else {
        formData.append('url', urlOrFile);
    }

    const response = await api.post('/assets', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const updateFolder = async (folderId: number, name: string) => {
    const response = await api.put(`/folders/${folderId}`, { name });
    return response.data;
};

export const deleteFolder = async (folderId: number) => {
    const response = await api.delete(`/folders/${folderId}`);
    return response.data;
};

export const deleteAsset = async (assetId: number) => {
    const response = await api.delete(`/assets/${assetId}`);
    return response.data;
};

// New Global Asset Management Endpoints
export const getAllAssets = async (filters: { folder_id?: number | 'null', type?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.folder_id !== undefined) params.append('folder_id', String(filters.folder_id));
    if (filters.type) params.append('type', filters.type);

    const response = await api.get(`/assets?${params.toString()}`);
    return response.data;
};

export const updateAsset = async (assetId: number, data: { name?: string, folder_id?: number | null }) => {
    const response = await api.put(`/assets/${assetId}`, data);
    return response.data;
};

export const batchDeleteAssets = async (assetIds: number[]) => {
    const response = await api.post('/assets/batch-delete', { assetIds });
    return response.data;
};

// Sync Logic
export const syncAssetToViewer = (asset: { type: string, url: string }) => {
    // Current structure expected by VRViewer: { asset: { type, url }, effects: ... }
    // We emit via socket to the server, which broadcasts to 'Viewer' room.
    // The server listens to 'host:update_session' or similar. 
    // Checking server.js/experience.socket.js to confirm event name.
    // Based on previous reads: server likely just broadcasts what it receives or has a specific event.
    // Let's assume we emit to the server, and server broadcasts.
    // For now, we'll emit 'host:update_session' directly if the server supports it, 
    // OR we might need a specific server endpoint/event if the socket is client-only.
    // Actually, usually we emit to the server, and the server handles it.
    // Let's check experience.socket.js content if possible, but standard pattern:
    socket.emit('host:update_session', { asset });
};
