import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

export const api = axios.create({
    baseURL: API_URL,
    // headers:Content-Type is set automatically for FormData
});

export const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true
});

export const getBubblesConfig = async () => {
    const response = await api.get('/bubbles/config');
    return response.data;
};

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

export const createAsset = async (folderId: number, type: string, urlOrFile: string | File) => {
    if (urlOrFile instanceof File) {
        const formData = new FormData();
        formData.append('folder_id', String(folderId));
        formData.append('type', type); // Optional hint, backend handles detection too
        formData.append('file', urlOrFile);

        const response = await api.post('/assets', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } else {
        const response = await api.post('/assets', { folder_id: folderId, type, url: urlOrFile });
        return response.data;
    }
};

export const updateFolder = async (folderId: number, name: string) => {
    const response = await api.put(`/folders/${folderId}`, { name });
    return response.data;
};

export const deleteFolder = async (folderId: number) => {
    const response = await api.delete(`/folders/${folderId}`);
    return response.data;
};
