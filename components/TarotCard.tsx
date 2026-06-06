import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CardState, TarotCardData, HandGesture, Vector2 } from '../types';
import { AshParticles } from './AshParticles';
import { createCardBackTexture } from '../utils/graphics';

interface TarotCardProps {
  data: TarotCardData | null;
  state: CardState;
  isReversed: boolean;
  gesture: HandGesture;
  cursor: Vector2;
  mode: 'MOUSE' | 'HAND';
  onHover: (hovering: boolean) => void;
  onConfirm: () => void; // Triggered by FIST or Mouse Click in REVEALED state
  onReveal: () => void; // Triggered by Drag close to camera
  onDissolveComplete: () => void;
}

const CARD_WIDTH = 2.5;
const CARD_HEIGHT = 4.2;
const BORDER_SIZE = 0.15; // Platinum rim thickness
const CARD_THICKNESS = 0.03;

export const TarotCard: React.FC<TarotCardProps> = ({
  data,
  state,
  isReversed,
  gesture,
  cursor,
  mode,
  onHover,
  onConfirm,
  onReveal,
  onDissolveComplete
}) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // --- Textures ---
  const backTexture = useMemo(() => createCardBackTexture(), []);
  const [frontTex, setFrontTex] = useState<THREE.Texture | null>(null);

  // Load front image safely
  useEffect(() => {
    if (data && data.image) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      
      const imageUrl = data.image;

      loader.load(
        imageUrl, 
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          setFrontTex(tex);
        },
        undefined,
        (err) => {
            console.warn(`Failed to load card image: ${imageUrl}`, err);
        }
      );
    } else {
      setFrontTex(null);
    }
  }, [data]);

  // --- Animation State ---
  const spawnTime = useRef(0);
  const isSpawning = useRef(true);

  // Animation Targets
  const targetPos = useRef(new THREE.Vector3(0, 0, -2)); 
  const targetRot = useRef(new THREE.Euler(0, Math.PI, 0)); 
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));

  useEffect(() => {
    isSpawning.current = true;
    spawnTime.current = 0;
    if (meshRef.current) {
        meshRef.current.position.set(0, 0, -5);
        meshRef.current.scale.set(0, 0, 0);
        meshRef.current.rotation.set(0, Math.PI, 0);
    }
  }, [data]);

  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;
    
    const lerpSpeed = 5 * delta;

    // --- Interaction Raycasting ---
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(cursor.x, cursor.y), stateThree.camera);
    const intersects = raycaster.intersectObjects(meshRef.current.children, true);
    const isIntersecting = intersects.length > 0;

    if (state === CardState.IDLE || state === CardState.HOVERED) {
      onHover(isIntersecting);
    }

    // --- State Machine Target Calculation ---

    if (isSpawning.current) {
        spawnTime.current += delta;
        targetPos.current.set(0, Math.sin(stateThree.clock.elapsedTime) * 0.1, 0);
        targetRot.current.set(0, Math.PI, 0);
        // Spawning handles scale manually based on time
        const scaleProgress = Math.min(spawnTime.current * 2, 1);
        meshRef.current.scale.setScalar(THREE.MathUtils.lerp(0, 1, scaleProgress));
        if (spawnTime.current > 0.5) isSpawning.current = false;
    } 
    else if (state === CardState.IDLE || state === CardState.HOVERED) {
      targetPos.current.set(0, Math.sin(stateThree.clock.elapsedTime) * 0.2, 0);
      targetRot.current.set(0, Math.PI, 0); 
      
      if (isIntersecting) {
         targetScale.current.set(1.1, 1.1, 1.1);
      } else {
         targetScale.current.set(1.0, 1.0, 1.0);
      }
    } 
    else if (state === CardState.GRABBED) {
      // Logic Update: Map Cursor Y to Z depth
      // In Hand mode, moving hand DOWN (lower Y) should bring card CLOSER (higher Z).
      // Screen Y is -1 (bottom) to 1 (top).
      
      let depth = 0.5; // Default depth

      if (mode === 'HAND') {
         // Map: Top of screen (1.0) -> Far (-2.0)
         //      Bottom of screen (-1.0) -> Close (3.0)
         depth = THREE.MathUtils.mapLinear(cursor.y, 1.0, -1.0, -2.0, 3.2);
         depth = THREE.MathUtils.clamp(depth, -3, 3.5);
      } else {
         // Mouse mode: Fixed pull distance usually, but let's emulate logic if dragged
         depth = 2.5; 
      }

      const vector = new THREE.Vector3(cursor.x, cursor.y, 0.5);
      vector.unproject(stateThree.camera);
      const dir = vector.sub(stateThree.camera.position).normalize();
      
      // Calculate dynamic distance to match projected depth roughly
      // We want actual Z to equal 'depth'
      // Camera Z is 5 or 6. 
      // This is a rough approximation to keep it following the cursor ray at specific Z depth
      const camZ = stateThree.camera.position.z;
      const targetZ = depth;
      const distance = (targetZ - camZ) / dir.z; 
      
      const pos = stateThree.camera.position.clone().add(dir.multiplyScalar(distance));
      
      targetPos.current.copy(pos);
      targetScale.current.set(1.0, 1.0, 1.0);
      
      const tiltX = (pos.y - meshRef.current.position.y) * 2;
      const tiltY = (pos.x - meshRef.current.position.x) * 2;
      targetRot.current.set(tiltX, Math.PI - tiltY, 0);

      // Trigger Reveal if pulled close enough
      if (pos.z > 2.2) {
        onReveal();
      }
    }
    else if (state === CardState.REVEALED) {
      targetPos.current.set(0, 0, 3.5);
      const zRot = isReversed ? Math.PI : 0;
      targetRot.current.set(0, 0, zRot); 
      // Reduce scale to fit screen better (0.45 fits nicely within view at z=3.5)
      targetScale.current.set(0.45, 0.45, 0.45);
    }

    // --- Apply Transforms ---
    if (state !== CardState.DISSOLVING) {
        meshRef.current.position.lerp(targetPos.current, lerpSpeed);
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRot.current.x, lerpSpeed);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot.current.y, lerpSpeed);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRot.current.z, lerpSpeed);
        
        // Apply scale lerp if not spawning
        if (!isSpawning.current) {
            meshRef.current.scale.lerp(targetScale.current, lerpSpeed);
        }
    }
  });

  // Dissolve State
  if (state === CardState.DISSOLVING) {
    const dissolveTex = frontTex || backTexture;
    // Scale particles to match the REVEALED state scale roughly, though particles use width/height props
    // We adjust the group scale to match the last known scale (0.45)
    return (
      <group position={meshRef.current?.position} rotation={meshRef.current?.rotation} scale={[0.45, 0.45, 0.45]}>
        <AshParticles 
          width={CARD_WIDTH + BORDER_SIZE} 
          height={CARD_HEIGHT + BORDER_SIZE} 
          texture={dissolveTex}
          onComplete={onDissolveComplete} 
        />
      </group>
    );
  }

  return (
    <group ref={meshRef}>
      {/* 
         CARD BASE (THE FRAME)
         A slightly larger box that acts as the platinum frame/border 
      */}
      <mesh>
          <boxGeometry args={[CARD_WIDTH + BORDER_SIZE, CARD_HEIGHT + BORDER_SIZE, CARD_THICKNESS]} />
          <meshStandardMaterial 
            color="#e0e4e8" 
            metalness={1.0} 
            roughness={0.15} 
            envMapIntensity={2.0}
          />
      </mesh>

      {/* Front Face (Positive Z) - Inset slightly on top of base */}
      <mesh position={[0, 0, CARD_THICKNESS/2 + 0.001]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial 
          map={frontTex || backTexture} 
          color={frontTex ? "white" : "#888"} 
          roughness={0.4}
          metalness={0.1}
        />
        {/* Inner Border Line for Detail */}
        <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[CARD_WIDTH * 0.95, CARD_HEIGHT * 0.97]} />
            <meshBasicMaterial color="black" opacity={0.2} transparent wireframe />
        </mesh>
      </mesh>

      {/* Back Face (Negative Z) */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -(CARD_THICKNESS/2 + 0.001)]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial 
          map={backTexture}
          color="#ffffff" 
          roughness={0.2} 
          metalness={0.6}
          emissive="#2c3e50"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
};
