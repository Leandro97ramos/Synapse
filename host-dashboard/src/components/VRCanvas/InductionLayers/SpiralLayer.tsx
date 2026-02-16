import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpiralLayerProps {
    speed: number; // 0.1 to 1.0 (or mapped from 1-10 intensity)
}

const SpiralLayer = ({ speed }: SpiralLayerProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const shaderArgs = useMemo(() => ({
        uniforms: {
            uTime: { value: 0 },
            uSpeed: { value: speed },
            uColor: { value: new THREE.Color('#a855f7') } // Purple-ish
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uSpeed;
            uniform vec3 uColor;
            varying vec2 vUv;

            #define PI 3.14159265359

            void main() {
                vec2 center = vec2(0.5);
                vec2 uv = vUv - center;
                float dist = length(uv);
                float angle = atan(uv.y, uv.x);

                // Spiral Calculation
                float spiral = sin(dist * 20.0 - angle * 5.0 + uTime * uSpeed * 2.0);
                
                // Alpha mask: Fade out at edges and center for smoothness
                float alpha = smoothstep(0.0, 0.4, dist) * (1.0 - smoothstep(0.45, 0.5, dist));
                
                // Intensity modulation
                float intensity = smoothstep(0.2, 0.8, spiral);

                gl_FragColor = vec4(uColor, intensity * alpha * 0.3); // Low opacity overall
            }
        `,
        transparent: true,
        depthWrite: false, // Don't block other objects
        depthTest: false   // Always render on top (or adjust renderOrder)
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            // Smoothly interpolate speed if needed, or just set it
            materialRef.current.uniforms.uSpeed.value = THREE.MathUtils.lerp(
                materialRef.current.uniforms.uSpeed.value,
                speed,
                0.1
            );
        }
        if (meshRef.current) {
            // Slowly rotate the whole plane too for extra disorientation
            meshRef.current.rotation.z -= 0.001 * speed;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, -1]} renderOrder={1}>
            {/* Fullscreen Plane */}
            <planeGeometry args={[100, 100]} />
            <shaderMaterial ref={materialRef} {...shaderArgs} />
        </mesh>
    );
};

export default SpiralLayer;
