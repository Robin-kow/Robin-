import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AshParticlesProps {
  onComplete: () => void;
  width: number;
  height: number;
  texture: THREE.Texture | null;
}

const vertexShader = `
  uniform float uTime;
  attribute float aRandom;
  attribute vec3 aVelocity;
  varying float vAlpha;
  varying vec2 vUv;

  // Simple noise function
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vUv = uv;
    
    vec3 pos = position;
    
    // Time modifier based on randomness to prevent uniform movement
    float t = uTime * (0.8 + 0.4 * aRandom);

    // Physics simulation
    // Apply velocity
    pos += aVelocity * t;
    
    // Add curl/noise movement
    pos.x += sin(t * 3.0 + pos.y) * 0.1 * aRandom;
    pos.z += cos(t * 2.0 + pos.x) * 0.1 * aRandom;
    
    // Accelerate upwards (heat rises)
    pos.y += t * t * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Scale particles based on depth and time (they burn away)
    float size = 8.0 * (1.0 - t * 0.3);
    gl_PointSize = size * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    // Fade out logic
    vAlpha = 1.0 - (t * 0.5); 
    if (vAlpha < 0.0) vAlpha = 0.0;
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    if (vAlpha <= 0.01) discard;
    
    // Geometric Sampling: Sample the color from the original card texture
    vec4 texColor = texture2D(uTexture, vUv);
    
    // If the texture is transparent or empty, discard
    if (texColor.a < 0.1) discard;

    // Emissive burning edge effect
    // As alpha decreases (time passes), mix in some fire colors
    vec3 fireColor = vec3(1.0, 0.5, 0.1); // Orange/Gold
    vec3 finalColor = mix(texColor.rgb, fireColor, 1.0 - vAlpha);
    
    // Further burn to black/grey at the very end
    if (vAlpha < 0.3) {
        finalColor = mix(vec3(0.1, 0.1, 0.1), finalColor, vAlpha * 3.0);
    }

    gl_FragColor = vec4(finalColor, vAlpha);
  }
`;

export const AshParticles: React.FC<AshParticlesProps> = ({ onComplete, width, height, texture }) => {
  const meshRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // High density for better image reconstruction
  const particleCount = 6000;

  const { positions, uvs, velocities, randoms } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const uv = new Float32Array(particleCount * 2);
    const vel = new Float32Array(particleCount * 3);
    const rnd = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Grid distribution for better geometric sampling (avoids clumps)
      // We map the particles to cover the card area uniformly initially
      
      // Normalized coordinates (0 to 1)
      const u = Math.random();
      const v = Math.random();

      // Map to geometry size (centered)
      const x = (u - 0.5) * width;
      const y = (v - 0.5) * height;
      const z = 0;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // UV mapping must match position for texture to look right
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;

      // Explosion Velocity
      // X/Z spread outwards, Y goes up
      vel[i * 3] = (Math.random() - 0.5) * 0.8; 
      vel[i * 3 + 1] = Math.random() * 1.0 + 0.2; 
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5; 

      rnd[i] = Math.random();
    }
    return { positions: pos, uvs: uv, velocities: vel, randoms: rnd };
  }, [width, height]);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value += delta;
      
      // Check if animation is done (approx 2.5 seconds lifespan)
      if (shaderRef.current.uniforms.uTime.value > 2.5) {
        onComplete();
      }
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTexture: { value: texture }
  }), [texture]);

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
            attach="attributes-uv"
            count={particleCount}
            array={uvs}
            itemSize={2}
        />
        <bufferAttribute
          attach="attributes-aVelocity"
          count={particleCount}
          array={velocities}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={particleCount}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        depthWrite={false}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};