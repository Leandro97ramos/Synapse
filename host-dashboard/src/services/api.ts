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

export const createAsset = async (folderId: number | null, type: string, urlOrFile: string | File, name?: string, moduleId?: number) => {
    const formData = new FormData();
    if (folderId) formData.append('folder_id', String(folderId));
    if (moduleId) formData.append('module_id', String(moduleId)); // Added per user request
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
    // 1. Obtenemos la IP real desde la que estás usando el Dashboard (ej: 192.168.0.103)
    const currentHost = window.location.hostname;

    // 2. Transformamos la URL de localhost a la IP real y aseguramos HTTPS
    const reachableUrl = asset.url
        .replace('localhost', currentHost) // Cambia localhost por tu IP real
        .replace('http://', 'https://');   // Evita bloqueos por "Mixed Content" en el celular

    console.log('📡 Sincronizando Asset:', reachableUrl);

    // 3. Enviamos el asset corregido al servidor
    socket.emit('host:update_session', {
        asset: {
            ...asset,
            url: reachableUrl
        }
    });
};

export const sendCalibration = (data: { ipd: number; scale: number; vOffset: number }) => {
    socket.emit('host:calibration', data);
};

// Calibration Profiles
export const saveProfile = async (userId: number, profileName: string, calibrationData: object) => {
    const response = await api.post('/profiles', { user_id: userId, profile_name: profileName, calibration_data: calibrationData });
    return response.data;
};

export const getProfiles = async (userId: number) => {
    const response = await api.get(`/profiles/${userId}`);
    return response.data;
};

// Director Controls
export const sendIntensity = (intensity: number) => {
    socket.emit('host:intensity', { intensity });
};

export const sendFlash = () => {
    socket.emit('host:flash', {});
};

export const sendInduction = (layer: string, active: boolean) => {
    socket.emit('host:induction', { layer, active });
};
