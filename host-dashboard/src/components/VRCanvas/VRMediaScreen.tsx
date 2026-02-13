import { useRef } from 'react';
import { useTexture, useVideoTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './DistortionMaterial'; // Import to register 'distortionMaterial'
import { GifMedia } from './GifMedia';

import { extend } from '@react-three/fiber';
import { DistortionMaterial } from './DistortionMaterial';

extend({ DistortionMaterial });

declare global {
    namespace JSX {
        interface IntrinsicElements {
            distortionMaterial: any;
        }
    }
}

interface VRMediaScreenProps {
    type: string;
    url: string;
    calibration: {
        ipd: number;
        scale: number;
        vOffset: number;
        k1?: number; // Optional advanced calibration
        k2?: number;
    };
}

// Helper to handle video textures correctly
const VideoMaterial = ({ url, calibration }: { url: string; calibration: any }) => {
    const texture = useVideoTexture(url, {
        muted: true, // Audio handled separately or by Left Eye? R3F video texture usually muted by default to autoplay
        loop: true,
        start: true,
        crossOrigin: 'Anonymous'
    });

    const materialRef = useRef<any>(null);

    useFrame(() => {
        if (materialRef.current) {
            materialRef.current.uK1 = calibration.k1 || 0.2; // Default if not provided
            materialRef.current.uK2 = calibration.k2 || 0.05;
            materialRef.current.uScale = 1.0 / calibration.scale; // Scale slider usually zooms IN (inverse of shader scale) or matches directly?
        }
    });

    return (
        // @ts-ignore
        <distortionMaterial ref={materialRef} uTexture={texture} />
    );
};

const ImageMaterial = ({ url, calibration }: { url: string; calibration: any }) => {
    const texture = useTexture(url);
    const materialRef = useRef<any>(null);

    useFrame(() => {
        if (materialRef.current) {
            materialRef.current.uK1 = calibration.k1 || 0.2;
            materialRef.current.uK2 = calibration.k2 || 0.05;
            materialRef.current.uScale = 1.0 / calibration.scale;
        }
    });

    return (
        // @ts-ignore
        <distortionMaterial ref={materialRef} uTexture={texture} transparent />
    );
};

export const VRMediaScreen = ({ type, url, calibration }: VRMediaScreenProps) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Apply Vertical Offset via Position
    // vOffset in PX needs to be mapped to World Units.
    // Assuming camera at z=5, screen height ~5 units.
    // map calibration.vOffset (-100..100) to (-1..1) approx
    const vOffsetWorld = calibration.vOffset * 0.01;

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.y = vOffsetWorld;
        }
    });

    const isGif = url.toLowerCase().endsWith('.gif');

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <planeGeometry args={[16 / 9 * 4, 4]} /> {/* Aspect ratio? adjust based on content? Fixed for now */}
            {isGif ? (
                <GifMedia url={url} calibration={calibration} />
            ) : type === 'video' ? (
                <VideoMaterial url={url} calibration={calibration} />
            ) : (
                <ImageMaterial url={url} calibration={calibration} />
            )}
        </mesh>
    );
};
