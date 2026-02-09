import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true
});

export const getBubblesConfig = async () => {
    const response = await api.get('/bubbles/config');
    return response.data;
};
