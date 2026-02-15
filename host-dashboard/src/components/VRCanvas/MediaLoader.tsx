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

const CurvedScreen = ({ type, url, calibration, isLatest }: { type: string, url: string, calibration: any, isLatest: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [opacity, setOpacity] = useState(0);

    useFrame((state, delta) => {
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
                // Double side to be visible from inside the cylinder
                material.side = THREE.DoubleSide;
            }
        }
    });

    // Cylinder Geometry args: [radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength]
    // Radius 5, Height 4.5, 120 degrees arc
    const geometryArgs: [number, number, number, number, number, boolean, number, number] = [5, 5, 4.5, 64, 1, true, -Math.PI / 3, 2 * Math.PI / 3];

    const isGif = url.toLowerCase().endsWith('.gif');

    return (
        <mesh ref={meshRef} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
            <cylinderGeometry args={geometryArgs} />
            {isGif ? (
                <GifTextureMaterial url={url} calibration={calibration} opacity={opacity} />
            ) : type === 'video' ? (
                <VideoTextureMaterial url={url} calibration={calibration} opacity={opacity} />
            ) : (
                <ImageTextureMaterial url={url} calibration={calibration} opacity={opacity} />
            )}
        </mesh>
    );
};

// Helper Components that return the MATERIAL attached to the parent mesh

const VideoTextureMaterial = ({ url, calibration, opacity }: { url: string, calibration: any, opacity: number }) => {
    const texture = useVideoTexture(url, {
        muted: true,
        loop: true,
        start: true,
        crossOrigin: 'Anonymous'
    });

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
