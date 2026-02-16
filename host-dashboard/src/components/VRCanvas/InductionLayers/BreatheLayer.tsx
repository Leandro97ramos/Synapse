import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BreatheLayerProps {
    active: boolean;
    speed: number;
}

const BreatheLayer = ({ active, speed }: BreatheLayerProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const shaderArgs = useMemo(() => ({
        uniforms: {
            uTime: { value: 0 },
            uSpeed: { value: speed },
            uDarkness: { value: 0.0 }
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
            uniform float uDarkness;
            varying vec2 vUv;

            void main() {
                vec2 uv = vUv - 0.5;
                float dist = length(uv);
                
                // Vignette Pulse
                float pulse = 0.5 + 0.5 * sin(uTime * uSpeed * 2.0); // 0 to 1
                
                // Vignette calculation
                float vignette = smoothstep(0.4 + pulse * 0.1, 0.8, dist);
                
                gl_FragColor = vec4(0.0, 0.0, 0.0, vignette * uDarkness);
            }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: false
    }), []);

    useFrame((state) => {
        if (!materialRef.current) return;

        // Update Time
        materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        materialRef.current.uniforms.uSpeed.value = speed; // Direct update

        // Smoothly maximize darkness when active, minimize when inactive
        const targetDarkness = active ? 0.8 : 0.0;

        materialRef.current.uniforms.uDarkness.value = THREE.MathUtils.lerp(
            materialRef.current.uniforms.uDarkness.value,
            targetDarkness,
            0.1
        );

        // Cleanup: Hide mesh if totally transparent to save fill rate
        if (meshRef.current) {
            meshRef.current.visible = materialRef.current.uniforms.uDarkness.value > 0.01;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, -0.9]} renderOrder={2}> {/* Slightly closer than Spiral? Or further? Spiral at -1. Let's put this at -0.9 (on top) */}
            <planeGeometry args={[2, 2]} /> {/* Normalized coordinates if child of camera? Aspect ratio? */}
            {/* If child of camera, we need to cover the frustum. 
                 At z = -1, height is 2 * tan(fov/2). 
                 fov=75 deg -> tan(37.5) ~= 0.76. 
                 Height ~= 1.52. Width = Height * aspect.
                 A plane of [4, 4] should cover most standard ratios at z=-1.
             */}
            <planeGeometry args={[4, 4]} />
            <shaderMaterial ref={materialRef} {...shaderArgs} />
        </mesh>
    );
};

export default BreatheLayer;
