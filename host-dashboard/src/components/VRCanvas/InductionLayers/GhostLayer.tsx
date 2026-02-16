import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getAssetUrl } from '../../../utils/urlHelper';

interface GhostLayerProps {
    currentAsset: { url: string; type: string } | null;
    active: boolean;
}

const GhostLayer = ({ currentAsset, active }: GhostLayerProps) => {
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);


    // Let's restructure: 
    // We need to capture the asset URL *before* it changes? 
    // Or just keep a history. 
    // Simple approach: When `currentAsset` props change, set `ghostUrl` to the *previous* `currentAsset.url`.

    const previousAssetRef = useRef<string | null>(null);
    const [ghostTexture, setGhostTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        if (currentAsset?.url) {
            // If we have a previous asset, load it as ghost texture
            if (previousAssetRef.current && previousAssetRef.current !== currentAsset.url) {
                // Determine type? For now assume Image for Ghost or first frame of video?
                // Video as ghost is expensive. Let's try to stick to Images or just the URL.

                // For now, load texture if it's an image.
                const loader = new THREE.TextureLoader();
                // We need to know type of previous asset too, but let's assume image or url is enough for now.
                // Improve: pass full asset object.

                // To keep it simple and performant: 
                // IF previous was image -> load texture.
                // IF previous was video -> maybe skip or use a placeholder? Or video texture (heavy).
                // Let's try loading it.

                loader.load(getAssetUrl(previousAssetRef.current), (tex) => {
                    // Dispose old
                    if (ghostTexture) ghostTexture.dispose();
                    setGhostTexture(tex);
                });
            }
            // Update ref
            previousAssetRef.current = currentAsset.url;
        }
    }, [currentAsset?.url]);

    // Flicker Logic
    useFrame(() => {
        if (!active || !meshRef.current || !ghostTexture) {
            if (meshRef.current) meshRef.current.visible = false;
            return;
        }

        // Random flicker
        // Show with low probability
        const shouldShow = Math.random() > 0.95; // 5% chance per frame

        if (shouldShow) {
            meshRef.current.visible = true;
            meshRef.current.position.z = -2; // In front? Negative Z.

            // Random opacity
            if (materialRef.current) {
                materialRef.current.opacity = Math.random() * 0.3 + 0.1; // 0.1 - 0.4

                // Random scale/offset for disorientation?
                const scale = 1.0 + (Math.random() * 0.2 - 0.1);
                meshRef.current.scale.set(scale, scale, 1);
            }
        } else {
            meshRef.current.visible = false;
        }
    });

    useEffect(() => {
        return () => {
            if (ghostTexture) ghostTexture.dispose();
        };
    }, [ghostTexture]);

    if (!ghostTexture) return null;

    return (
        <mesh ref={meshRef} position={[0, 0, 0.1]} visible={false}>
            <planeGeometry args={[16, 9]} /> {/* Aspect Ratio? Should match screen */}
            <meshBasicMaterial
                ref={materialRef}
                map={ghostTexture}
                transparent
                opacity={0.1}
                depthTest={false} // Always on top of scene but below UI
            />
        </mesh>
    );
};

export default GhostLayer;
