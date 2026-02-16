import { useEffect, useState, Suspense } from 'react';
import { io } from 'socket.io-client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { getAssetUrl } from '../utils/urlHelper';
import { VRMediaScreen } from './VRCanvas/VRMediaScreen';
import SpiralLayer from './VRCanvas/InductionLayers/SpiralLayer';
import GhostLayer from './VRCanvas/InductionLayers/GhostLayer'; // Check path: src/components/VRCanvas/InductionLayers/GhostLayer.tsx
import BreatheLayer from './VRCanvas/InductionLayers/BreatheLayer';
import FlashLayer from './VRCanvas/InductionLayers/FlashLayer';

// Connect to the specific namespace for the VR experience
const SOCKET_URL = '/experience';

// Componente dedicado al renderizado estereoscópico
const StereoRenderer = ({ calibration }: { calibration: any }) => {
    const { gl, scene, camera, size } = useThree();

    useFrame(() => {
        const { width, height } = size;
        const halfWidth = width / 2;

        // Map IPD (0-250 typically mm) to World Units (assuming 1 unit = 1 meter approx, or scaled)
        // Standard IPD is ~60-70mm. 
        // If scene is standard scale, 65mm = 0.065 units.
        // Let's assume input is in mm.
        // Also applying a factor to make the effect visible/tunable.
        const ipdWorld = (calibration.ipd || 0) * 0.001 * 0.5; // ipd is total distance, so offset is half

        // Map Vertical Offset (-100 to 100) to Camera Y
        const vOffsetWorld = (calibration.vOffset || 0) * 0.05;

        // 1. Preparamos el renderizador
        gl.autoClear = false;
        gl.clear();
        gl.setScissorTest(true);

        // Store original camera transformations
        const originalX = camera.position.x;
        const originalY = camera.position.y;

        // Apply Vertical Offset to Camera Base Position (affects both eyes)
        // Actually, we usually want to move the camera UP/DOWN to shift the view.
        // Moving camera UP moves objects DOWN.
        camera.position.y = originalY + vOffsetWorld;

        // 2. RENDER OJO IZQUIERDO
        gl.setViewport(0, 0, halfWidth, height);
        gl.setScissor(0, 0, halfWidth, height);

        camera.position.x = originalX - ipdWorld; // Desplazamos cámara a la izquierda
        camera.updateMatrixWorld();

        gl.render(scene, camera);

        // 3. RENDER OJO DERECHO
        gl.setViewport(halfWidth, 0, halfWidth, height);
        gl.setScissor(halfWidth, 0, halfWidth, height);

        camera.position.x = originalX + ipdWorld; // Desplazamos cámara a la derecha
        camera.updateMatrixWorld();

        gl.render(scene, camera);

        // Restaurar posición original para el siguiente frame
        camera.position.x = originalX;
        camera.position.y = originalY;

        // 4. Limpieza para el siguiente frame
        gl.setScissorTest(false);
    }, 1); // Prioridad 1 para que corra después de otras actualizaciones

    return null;
};

const VRViewer = () => {
    const [currentAsset, setCurrentAsset] = useState<{ type: string; url: string } | null>(null);
    const [calibration, setCalibration] = useState({ ipd: 0, scale: 1.0, vOffset: 0 });
    const [isConnected, setIsConnected] = useState(false);

    // Induction State
    const [induction, setInduction] = useState({ spiral: false, ghost: false, breathing: false });
    const [intensity, setIntensity] = useState(5);
    const [flashActive, setFlashActive] = useState(false);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            upgrade: false
        });

        socket.on('connect', () => {
            console.log('Connected to VR Experience');
            setIsConnected(true);
            socket.emit('join_room', 'viewer');
        });

        socket.on('disconnect', () => setIsConnected(false));

        socket.on('viewer:update_session', async (data: any) => {
            console.log('Session Update', data);
            if (data.asset) {
                // If it's an image, we can await decode to ensure it's ready for GPU
                if (data.asset.type === 'image') {
                    const img = new Image();
                    img.src = getAssetUrl(data.asset.url);
                    try {
                        await img.decode();
                        console.log('Image decoded and ready to swap');
                    } catch (e) {
                        console.warn('Image decode failed, swapping anyway', e);
                    }
                }
                setCurrentAsset(data.asset);
                // Notify Director we are ready (Handshake)
                socket.emit('viewer:asset_ready', { assetId: data.asset.id });
            }
        });

        // Induction Listeners
        socket.on('viewer:sync_layers', (data: any) => {
            // data: { spiral: true, ghost: false, breathing: false }
            // Ensure keys match what we expect. 
            // Server sends 'ghost' but Director sends 'flashback'. 
            // If Server sends 'ghost', we map it to our state?
            // Let's assume server sends what it gets.
            // If data has 'flashback', use it.
            setInduction(prev => ({
                ...prev,
                spiral: data.spiral ?? prev.spiral,
                ghost: data.ghost ?? data.flashback ?? prev.ghost,
                breathing: data.breathing ?? prev.breathing
            }));
        });

        socket.on('viewer:intensity', (data: any) => {
            setIntensity(typeof data === 'object' ? data.intensity : data);
        });

        socket.on('viewer:trigger_flash', () => {
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 200); // Quick flash
        });

        // Preload Next Asset (Invisible Buffer)
        socket.on('viewer:prepare_next', (data: any) => {
            console.log('Preloading Next Asset:', data);
            if (data.type === 'image') {
                const img = new Image();
                img.src = getAssetUrl(data.url);
                // Just let it load in browser cache
            } else if (data.type === 'video') {
                const vid = document.createElement('video');
                vid.src = getAssetUrl(data.url);
                vid.preload = 'auto';
                // vid.load(); // Browsers might block auto-load without user gesture validation, but usually fine for non-playing
            }
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
                {/* Renderizador Estéreo Manual */}
                <StereoRenderer calibration={calibration} />

                {/* Induction Layers (Head-Locked / Camera Children) */}
                {/* We can put them as children of the camera so they follow the head */}
                {/* BUT PerspectiveCamera here is default. StereoRenderer manipulates it. */}
                {/* If we put them inside Camera, StereoRenderer moving camera x/y will move layers too. */}
                {/* Spiral/Breathe should loop WITH the eyes? Yes. */}
                {/* But if they are 2D effects (screenspace), they should be fixed to camera. */}

                {/* However, standard R3F: <PerspectiveCamera><Children/></PerspectiveCamera> */}
                {/* Let's try adding them to the scene but parenting to camera ref if possible. */}
                {/* Easier: Just put them here. If StereoRenderer moves camera position, these stay at 0,0,0? No. */}
                {/* If they are at 0,0,-1 world space, and camera moves to 0.03, then they appear shifted. */}
                {/* We want them LOCKED to camera. */}

                {/* HACK: Put them inside a group that follows camera? OR use <Hud>? */}
                {/* <Hud> is great for UI overlaid on top. */}
                {/* Let's try simple parenting to camera first. */}
                {/* But we don't have ref to camera here easily without creating another component. */}
                {/* Actually, let's use <createPortal> or just put them in scene and let StereoRenderer handle them? */}
                {/* If StereoRenderer relies on scene objects being in world space, then Layers at 0,0,-1 are World Space. */}
                {/* When Camera moves left (for left eye), looking at 0,0,-1, the object shifts right in view. Correct parallax. */}
                {/* Spiral/Ghost SHOULD have parallax? */}
                {/* Spiral is "2D Texture". Ideally no parallax if it's "on the lens". */}
                {/* But if it's "in the air", parallax is fine/trippy. */}
                {/* Breathe (Vignette) should NOT have parallax. It's screen space. */}
                {/* ShaderMaterial for Breathe uses `uv`. `planeGeometry` in world space. */}
                {/* If we want Screen Space Vignette, we need it to follow camera perfectly. */}

                {/* Solution: Attached to Camera. */}
                <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={75}>
                    {induction.spiral && <SpiralLayer speed={intensity * 0.2} />}
                    {induction.ghost && <GhostLayer currentAsset={currentAsset} active={induction.ghost} />}
                    {induction.breathing && <BreatheLayer active={induction.breathing} speed={intensity} />}
                </PerspectiveCamera>

                {/* Contenido de la Escena */}
                <color attach="background" args={['#000000']} />
                <ambientLight intensity={1} />

                <Suspense fallback={null}>
                    {currentAsset && (currentAsset.type === 'image' || currentAsset.type === 'video' || currentAsset.type === 'gif') && (
                        <VRMediaScreen
                            type={currentAsset.type}
                            url={getAssetUrl(currentAsset.url)}
                            calibration={calibration}
                        />
                    )}
                </Suspense>
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

            <FlashLayer active={flashActive} />
        </div>
    );
};

export default VRViewer;
