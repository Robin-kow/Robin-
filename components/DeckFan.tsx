import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCardBackTexture } from '../utils/graphics';
import { Vector2, HandGesture, GameMode } from '../types';

interface DeckFanProps {
  mode: GameMode;
  cursor: Vector2;
  gesture: HandGesture;
  onCardSelect: () => void;
}

// --- Visual Constants ---
const CARD_WIDTH = 0.9;
const CARD_HEIGHT = 1.55; 
const CARD_THICKNESS = 0.02;
const BORDER_SIZE = 0.08; 
const SPREAD_COUNT = 78;  // Full Tarot Deck
const SPACING = 1.1;      // Increased spacing for better visibility

// --- Helper: Glow Texture ---
const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Soft radial glow
        const gradient = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
};

interface SingleDeckCardProps {
  index: number;
  total: number;
  mode: GameMode;
  cursor: Vector2;
  gesture: HandGesture;
  onSelect: () => void;
  texture: THREE.Texture;
  glowTexture: THREE.Texture;
  scrollRef: React.MutableRefObject<number>; 
  hoveredIndexRef: React.MutableRefObject<number>; // Shared ref for unique selection
}

const SingleDeckCard: React.FC<SingleDeckCardProps> = ({ 
  index, 
  mode, 
  cursor, 
  gesture, 
  onSelect, 
  texture,
  glowTexture,
  scrollRef,
  hoveredIndexRef
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [selected, setSelected] = useState(false);
  
  // Timer for Pinch Hold
  const pinchTimer = useRef(0);

  // Animation state
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));

  const triggerSelection = () => {
    if (selected) return;
    setSelected(true);
    setTimeout(() => {
        onSelect();
    }, 500); 
  };

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Check if THIS card is the one uniquely determined by the parent
    const isHovered = hoveredIndexRef.current === index;

    // 1. Calculate Position relative to Scroll
    const currentScroll = scrollRef.current;
    const distFromCenter = index - currentScroll;
    
    // X Position: straight line offset
    const xBase = distFromCenter * SPACING;
    
    // 2. Rolling/Wave Effect
    const absDist = Math.abs(distFromCenter);
    
    // Base Transforms
    let targetX = xBase;
    let targetY = 0;
    let targetZ = -Math.abs(distFromCenter) * 0.1; // Slight arc back
    let targetRotY = Math.PI; // Base rotation (showing back)
    
    // Subtle curve
    targetY = -Math.abs(distFromCenter) * 0.05; 
    
    // Rotation flair
    const rotAmount = Math.min(absDist * 0.05, 0.5);
    targetRotY = Math.PI - (distFromCenter > 0 ? rotAmount : -rotAmount);

    if (selected) {
        // Selection Override (Animation when confirmed)
        targetX = 0 + (Math.sin(state.clock.elapsedTime * 10) * 0.05); // Shiver
        targetY = 0;
        targetZ = 2.0;
        targetRotY = Math.PI + (state.clock.elapsedTime * 10); // Spin
        targetScale.current.set(1.5, 1.5, 1.5);
    } else {
         if (isHovered) {
             targetY += 0.5; // Pop up
             targetZ += 1.0; // Come forward more significantly
             targetScale.current.set(1.15, 1.15, 1.15);
             targetRotY = Math.PI; // Face flat
             
             // Interaction Logic: 
             // IF Hand Mode AND Pinching -> Accumulate time
             if (mode === GameMode.HAND && gesture === HandGesture.PINCH) {
                 pinchTimer.current += delta;
                 
                 // If held for 1 second, trigger selection
                 if (pinchTimer.current > 1.0) {
                     triggerSelection();
                 }
                 
                 // Shake effect to indicate "Holding"
                 const shake = Math.sin(state.clock.elapsedTime * 50) * 0.02;
                 targetX += shake;

             } else {
                 // Reset timer if gesture is released or changes
                 pinchTimer.current = 0;
             }
         } else {
             targetScale.current.set(1, 1, 1);
             pinchTimer.current = 0;
         }
    }

    // Apply Lerps
    const speed = 10 * delta;
    
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, speed);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, speed);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, speed);

    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, speed);
    
    groupRef.current.scale.lerp(targetScale.current, speed);
  });

  // Determine if we should show the glow (Selected or Hovered)
  const showGlow = selected || (hoveredIndexRef.current === index);

  return (
    <group 
        ref={groupRef} 
        position={[0, -10, 0]} 
        rotation={[0, Math.PI, 0]}
        userData={{ cardIndex: index }} // CRITICAL: Used by Parent Raycaster
    > 
      
      {/* 0. Glow Halo Effect */}
      <mesh 
        position={[0, 0, -0.05]} 
        rotation={[0, Math.PI, 0]}
        visible={showGlow}
      >
         <planeGeometry args={[CARD_WIDTH * 1.8, CARD_HEIGHT * 1.5]} />
         <meshBasicMaterial 
            map={glowTexture} 
            color={selected ? "#ffd700" : "#80d8ff"} 
            transparent 
            opacity={selected ? 0.9 : 0.6} 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
         />
      </mesh>

      {/* 1. Platinum Frame */}
      <mesh>
         <boxGeometry args={[CARD_WIDTH + BORDER_SIZE, CARD_HEIGHT + BORDER_SIZE, CARD_THICKNESS]} />
         <meshStandardMaterial color="#e0e4e8" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 2. Card Back - The Hit Target */}
      <mesh 
        position={[0, 0, -CARD_THICKNESS/2 - 0.001]} 
        rotation={[0, Math.PI, 0]}
        userData={{ isHitTarget: true }} // CRITICAL: Target for Raycaster
        onClick={(e) => {
            if (mode === GameMode.MOUSE) {
                e.stopPropagation();
                // Only allow click if we are the hovered one (prevents accidental clicks on overlapped)
                if (hoveredIndexRef.current === index) {
                    triggerSelection();
                }
            }
        }}
      > 
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial 
          map={texture} 
          color="#ffffff"
          roughness={0.3}
          metalness={0.5}
          emissive="#2c3e50"
          emissiveIntensity={0.1}
        />
        <mesh position={[0, 0, 0.001]}>
             <planeGeometry args={[CARD_WIDTH * 1.02, CARD_HEIGHT * 1.015]} />
             <meshBasicMaterial color="#dcdde1" side={THREE.BackSide} /> 
        </mesh>
      </mesh>

      {/* 3. Card Front (Hidden) */}
      <mesh position={[0, 0, CARD_THICKNESS/2 + 0.001]}>
         <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
         <meshStandardMaterial color="#050505" roughness={0.8} />
      </mesh>

      {/* 4. Side Edges */}
      <mesh rotation={[0, Math.PI/2, 0]} position={[CARD_WIDTH/2 + BORDER_SIZE/2, 0, 0]}>
         <boxGeometry args={[CARD_THICKNESS, CARD_HEIGHT + BORDER_SIZE, 0.01]} />
         <meshStandardMaterial color="#ecf0f1" metalness={1.0} roughness={0.1} />
      </mesh>
    </group>
  );
};

export const DeckFan: React.FC<DeckFanProps> = ({ mode, cursor, gesture, onCardSelect }) => {
  const texture = useMemo(() => createCardBackTexture(), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);
  
  // Ref for the entire group of cards
  const fanGroupRef = useRef<THREE.Group>(null);
  
  // Shared Mutable Refs
  const scrollRef = useRef(SPREAD_COUNT / 2); 
  const velocityRef = useRef(0); // For inertia physics
  const hoveredIndexRef = useRef<number>(-1); // Stores the ONE active card index

  useFrame((state, delta) => {
      // --- 1. Physics Based Scroll Logic ---
      
      const margin = 0.92; 
      
      const clampedX = Math.max(-margin, Math.min(margin, cursor.x));
      
      // Map cursor -1..1 range to the deck index range
      const t = (clampedX + margin) / (margin * 2); 
      const targetIndex = t * (SPREAD_COUNT - 1);

      // Spring Physics Configuration
      const distance = targetIndex - scrollRef.current;
      const tension = 1.1; 
      
      // LOGIC CHANGE: 
      // If POINT gesture, apply massive friction (brake) to stop inertia.
      // If OPEN gesture (or Mouse), allow fluid movement.
      let friction = 0.85; 
      if (mode === GameMode.HAND && gesture === HandGesture.POINT) {
        friction = 0.5; // High braking force
      }

      // Apply acceleration
      velocityRef.current += distance * tension * delta * 60; 
      // Apply friction
      velocityRef.current *= friction;
      
      // Update Position
      scrollRef.current += velocityRef.current * delta;

      // Soft clamp edges to stop it flying away infinitely
      if (scrollRef.current < -2) {
          scrollRef.current = -2;
          velocityRef.current = 0;
      }
      if (scrollRef.current > SPREAD_COUNT + 1) {
          scrollRef.current = SPREAD_COUNT + 1;
          velocityRef.current = 0;
      }

      // --- 2. Centralized Raycasting Logic (Singular Selection) ---
      if (fanGroupRef.current) {
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(cursor.x, cursor.y), state.camera);
          
          // Intersect against all children (recursively)
          const intersects = raycaster.intersectObjects(fanGroupRef.current.children, true);
          
          // Find the CLOSEST object that is actually a card back (marked with isHitTarget)
          const hit = intersects.find(i => i.object.userData.isHitTarget);

          if (hit) {
              // Traverse up to find the group with the cardIndex
              let parent = hit.object.parent;
              while (parent) {
                  if (parent.userData.cardIndex !== undefined) {
                      hoveredIndexRef.current = parent.userData.cardIndex;
                      break;
                  }
                  parent = parent.parent;
              }
          } else {
              hoveredIndexRef.current = -1;
          }
      }
  });

  return (
    <group ref={fanGroupRef} position={[0, 0, 0]}> 
      {Array.from({ length: SPREAD_COUNT }).map((_, i) => (
        <SingleDeckCard 
            key={i} 
            index={i} 
            total={SPREAD_COUNT} 
            mode={mode} 
            cursor={cursor}
            gesture={gesture}
            onSelect={onCardSelect}
            texture={texture}
            glowTexture={glowTexture}
            scrollRef={scrollRef}
            hoveredIndexRef={hoveredIndexRef}
        />
      ))}
    </group>
  );
};
