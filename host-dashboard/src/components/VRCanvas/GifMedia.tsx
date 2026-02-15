import { useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './DistortionMaterial'; // Import to register 'distortionMaterial' and its types
// @ts-ignore
import GifLoader from 'three-gif-loader';

// Patch GifLoader to return texture instead of reader in onLoad
// The issue is that GifLoader calls onLoad(reader) but standard loaders call onLoad(texture).
// R3F's useLoader returns whatever onLoad receives.
class PatchedGifLoader extends (GifLoader as unknown as typeof THREE.TextureLoader) {
    load(url: string, onLoad: (texture: any) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: unknown) => void) {
        // Call super.load but intercept the callback
        const texture = super.load(url, (reader: any) => {
            // super.load calls this callback with 'reader' when done.
            // But we want to resolve the promise inside useLoader with 'texture'.
            if (onLoad) {
                onLoad(texture);
            }
        }, onProgress, onError);

        return texture;
    }
}

interface GifMediaProps {
    url: string;
    calibration: {
        scale: number;
        k1?: number;
        k2?: number;
    };
    opacity?: number;
}

export const GifMedia = ({ url, calibration, opacity = 1.0 }: GifMediaProps) => {
    // 1. useLoader uses our patched loader which returns the texture
    const texture = useLoader(PatchedGifLoader, url);
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
        <distortionMaterial
            ref={materialRef}
            uTexture={texture}
            transparent
        />
    );
};
