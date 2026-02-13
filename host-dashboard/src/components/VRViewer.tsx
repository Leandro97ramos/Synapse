import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { getAssetUrl } from '../utils/urlHelper';
import { VRMediaScreen } from './VRCanvas/VRMediaScreen';

// Connect to the specific namespace for the VR experience
const SOCKET_URL = '/experience';

// Componente dedicado al renderizado estereoscópico
const StereoRenderer = ({ calibration }: { calibration: any }) => {
    const { gl, scene, camera, size } = useThree();

    useFrame(() => {
        const { width, height } = size;
        const halfWidth = width / 2;

        // El IPD divide el valor del slider para un movimiento sutil de cámara
        // Ajuste: El slider suele ir de -50 a 50 (mm?). 
        // Si la escena está en metros (z=5), 50mm = 0.05 units.
        // User suggirió / 1000. Probemos eso o un valor razonable.
        const ipdOffset = (calibration.ipd || 0) * 0.005;

        // 1. Preparamos el renderizador
        gl.autoClear = false;
        gl.clear();
        gl.setScissorTest(true);

        // 2. RENDER OJO IZQUIERDO
        gl.setViewport(0, 0, halfWidth, height);
        gl.setScissor(0, 0, halfWidth, height);

        const originalX = camera.position.x;
        camera.position.x = originalX - ipdOffset; // Desplazamos cámara a la izquierda
        camera.updateMatrixWorld();

        gl.render(scene, camera);

        // 3. RENDER OJO DERECHO
        gl.setViewport(halfWidth, 0, halfWidth, height);
        gl.setScissor(halfWidth, 0, halfWidth, height);

        camera.position.x = originalX + ipdOffset; // Desplazamos cámara a la derecha
        camera.updateMatrixWorld();

        gl.render(scene, camera);

        // Restaurar posición original para el siguiente frame (si orbit controls u otros lo usaran)
        camera.position.x = originalX;

        // 4. Limpieza para el siguiente frame
        gl.setScissorTest(false);
    }, 1); // Prioridad 1 para que corra después de otras actualizaciones

    return null;
};

const VRViewer = () => {
    const [currentAsset, setCurrentAsset] = useState<{ type: string; url: string } | null>(null);
    const [calibration, setCalibration] = useState({ ipd: 0, scale: 1.0, vOffset: 0 });
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
            console.log('Connected to VR Experience');
            setIsConnected(true);
            socket.emit('join_room', 'viewer');
        });

        socket.on('disconnect', () => setIsConnected(false));

        socket.on('viewer:update_session', (data: any) => {
            console.log('Session Update', data);
            if (data.asset) setCurrentAsset(data.asset);
        });

        socket.on('viewer:calibration', (data: any) => {
            console.log('Calibration Update', data);
            setCalibration(data);
        });

        return () => { socket.disconnect(); };
    }, []);

    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative">

            {/* WebGL Canvas */}
            <Canvas>
                {/* Cámara Principal */}
                <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={75} />

                {/* Renderizador Estéreo Manual */}
                <StereoRenderer calibration={calibration} />

                {/* Contenido de la Escena */}
                <color attach="background" args={['#000000']} />
                <ambientLight intensity={1} />

                {currentAsset && (currentAsset.type === 'image' || currentAsset.type === 'video' || currentAsset.type === 'gif') && (
                    <VRMediaScreen
                        type={currentAsset.type}
                        url={getAssetUrl(currentAsset.url)}
                        calibration={calibration}
                    />
                )}
            </Canvas>

            {/* HTML Overlay for Audio/UI Information */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {!currentAsset && (
                    <div className="text-white/20 font-mono tracking-widest uppercase">Waiting for Host...</div>
                )}

                {/* Visualizer for Audio Only Assets */}
                {currentAsset?.type === 'audio' && (
                    <div className="flex gap-10">
                        <div className="animate-pulse text-white/50 text-6xl">🎵</div>
                        <div className="animate-pulse text-white/50 text-6xl">🎵</div>
                    </div>
                )}

                {/* Audio Element (Invisible Global Player) */}
                {currentAsset?.type === 'audio' && (
                    <audio src={getAssetUrl(currentAsset.url)} autoPlay loop className="hidden" />
                )}
            </div>

            {/* Connection Status */}
            <div className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500/20' : 'bg-red-500/20'}`} />
        </div>
    );
};

export default VRViewer;
