import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend, type ThreeElement } from '@react-three/fiber';

// Barrel Distortion Shader
// Based on typical lens distortion algorithms
// k1, k2: distortion coefficients
// scale: scaling factor to keep image inside frame after distortion

const DistortionMaterial = shaderMaterial(
  {
    uTexture: new THREE.Texture(),
    uK1: 0.2, // Distortion coefficient 1
    uK2: 0.05, // Distortion coefficient 2
    uScale: 1.0, // Scale adjustment
    uIpD: 0.0, // Per-eye offset (optional in shader, but usually handled by camera position)
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform sampler2D uTexture;
    uniform float uK1;
    uniform float uK2;
    uniform float uScale;
    
    varying vec2 vUv;

    void main() {
      // Normalize UVs to -1 to 1 centered
      vec2 uv = vUv * 2.0 - 1.0;
      
      // Calculate radius from center
      float r = length(uv);
      
      // Calculate distortion
      // r_new = r * (1 + k1*r^2 + k2*r^4)
      // This pushes pixels away from center (pincushion) or pulls them in (barrel) based on K sign
      // For VR (Barrel distortion needed on screen to counteract Pincushion of lens), K should be positive??
      // Actually lenses create pincushion, so we need barrel on screen.
      // Barrel formula: r_src = r_dest * (1 + k1 * r_dest^2 ...)
      
      float r2 = r * r;
      float f = 1.0 + uK1 * r2 + uK2 * r2 * r2;
      
      // Apply distortion factor
      vec2 uv_distorted = uv * f * uScale; // uScale helps zoom out to fit content
      
      // Remap back to 0..1
      uv_distorted = (uv_distorted + 1.0) / 2.0;
      
      // Check bounds
      if (uv_distorted.x < 0.0 || uv_distorted.x > 1.0 || uv_distorted.y < 0.0 || uv_distorted.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black out of bounds
      } else {
        gl_FragColor = texture2D(uTexture, uv_distorted);
      }
    }
  `
);

extend({ DistortionMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    distortionMaterial: ThreeElement<typeof DistortionMaterial> & {
      uK1?: number;
      uK2?: number;
      uScale?: number;
      uTexture?: THREE.Texture | null
      transparent?: boolean
    }
  }
}

export { DistortionMaterial };
