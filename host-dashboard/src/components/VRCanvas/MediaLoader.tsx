import { useRef, useState, useEffect } from 'react';
import { useTexture, useVideoTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GifMedia } from './GifMedia';

interface MediaLoaderProps {
    type: string;
    url: string;
    calibration: {
        scale: number;
        k1?: number;
        k2?: number;
    };
}

export const MediaLoader = ({ type, url, calibration }: MediaLoaderProps) => {
    // State to manage cross-fading
    const [items, setItems] = useState<{ id: string, type: string, url: string }[]>([]);

    useEffect(() => {
        // When URL changes, add new item
        setItems(prev => {
            // If same url as last item, do nothing
            if (prev.length > 0 && prev[prev.length - 1].url === url) return prev;

            // Add new item, keep max 2 items to crossfade between
            const newItem = { id: url + Date.now(), type, url };
            const newItems = [...prev, newItem];
            if (newItems.length > 2) newItems.shift(); // Remove oldest
            return newItems;
        });
    }, [url, type]);

    return (
        <group>
            {items.map((item, index) => {
                const isIsLatest = index === items.length - 1;
                return (
                    <CurvedScreen
                        key={item.id}
                        type={item.type}
                        url={item.url}
                        calibration={calibration}
                        isLatest={isIsLatest}
                    />
                );
            })}
        </group>
    );
};

// Helper: Determine strict media type
const getStrictMediaType = (type: string, url: string): 'gif' | 'video' | 'image' => {
    const lowerUrl = url.toLowerCase();

    // 1. Check for GIF extension explicitly first (overrides 'image' type which might be generic)
    if (lowerUrl.endsWith('.gif')) return 'gif';

    // 2. Check provided type field
    if (type === 'video' || type === 'audio') return 'video'; // Audio visualized as video/texture logic if needed, or handled elsewhere
    if (type === 'image') return 'image';

    // 3. Fallback: Check extensions
    if (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov')) return 'video';

    return 'image'; // Default to image
};

const CurvedScreen = ({ type, url, calibration, isLatest }: { type: string, url: string, calibration: any, isLatest: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [opacity, setOpacity] = useState(0);
    const strictType = getStrictMediaType(type, url);

    useEffect(() => {
        console.log(`[Synapse VR] Cargando tipo: ${strictType} (${type}) desde URL: ${url}`);
    }, [url, strictType]);

    useFrame((_, delta) => {
        // Animate opacity
        const target = isLatest ? 1 : 0;
        const speed = 2.0; // Fade speed
        let newOpacity = opacity;

        if (Math.abs(newOpacity - target) > 0.01) {
            newOpacity += (target - newOpacity) * speed * delta;
            setOpacity(newOpacity);
        } else {
            newOpacity = target;
            setOpacity(target);
        }

        if (meshRef.current) {
            const material = meshRef.current.material as THREE.Material;
            if (material) {
                material.opacity = newOpacity;
                material.transparent = true;
                material.side = THREE.DoubleSide;
                material.depthWrite = true; // Ensure depth write is enabled used for layering?
            }
        }
    });

    const geometryArgs: [number, number, number, number, number, boolean, number, number] = [5, 5, 4.5, 64, 1, true, -Math.PI / 3, 2 * Math.PI / 3];

    return (
        <mesh ref={meshRef} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
            <cylinderGeometry args={geometryArgs} />
            {strictType === 'gif' ? (
                <GifTextureMaterial url={url} calibration={calibration} opacity={opacity} />
            ) : strictType === 'video' ? (
                <VideoTextureMaterial url={url} calibration={calibration} opacity={opacity} />
            ) : (
                <ImageTextureMaterial url={url} calibration={calibration} opacity={opacity} />
            )}
        </mesh>
    );
};

// Helper Components

const VideoTextureMaterial = ({ url, calibration, opacity }: { url: string, calibration: any, opacity: number }) => {
    const texture = useVideoTexture(url, {
        muted: true,
        loop: true,
        start: true,
        crossOrigin: 'Anonymous',
        playsInline: true
    });

    useEffect(() => {
        return () => {
            if (texture) texture.dispose();
        };
    }, [texture]);

    const materialRef = useRef<any>(null);
    useFrame(() => {
        if (materialRef.current) {
            materialRef.current.uK1 = calibration.k1 || 0.2;
            materialRef.current.uK2 = calibration.k2 || 0.05;
            materialRef.current.uScale = 1.0 / calibration.scale;
            materialRef.current.uOpacity = opacity;
        }
    });

    return (
        // @ts-ignore
        <distortionMaterial ref={materialRef} uTexture={texture} transparent />
    );
}

const ImageTextureMaterial = ({ url, calibration, opacity }: { url: string, calibration: any, opacity: number }) => {
    const texture = useTexture(url);

    useEffect(() => {
        return () => {
            if (texture) texture.dispose();
        };
    }, [texture]);

    const materialRef = useRef<any>(null);
    useFrame(() => {
        if (materialRef.current) {
            materialRef.current.uK1 = calibration.k1 || 0.2;
            materialRef.current.uK2 = calibration.k2 || 0.05;
            materialRef.current.uScale = 1.0 / calibration.scale;
            materialRef.current.uOpacity = opacity;
        }
    });

    return (
        // @ts-ignore
        <distortionMaterial ref={materialRef} uTexture={texture} transparent />
    );
}

const GifTextureMaterial = ({ url, calibration, opacity }: { url: string, calibration: any, opacity: number }) => {
    // @ts-ignore
    return <GifMedia url={url} calibration={calibration} opacity={opacity} />;
}
