import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import { GameMode, HandGesture, CardState, TarotCardData, Vector2, DrawResult } from './types';
import { initializeHandLandmarker, detectHands, interpretGesture } from './services/handTracking';
import { getDeck, getRandomCard } from './services/tarotData';
import { getSpreadReading } from './services/geminiService';
import { TarotCard } from './components/TarotCard';
import { DeckFan } from './components/DeckFan';
import { SpreadOverlay } from './components/SpreadOverlay';

const App: React.FC = () => {
  // Game State
  const [mode, setMode] = useState<GameMode>(GameMode.MOUSE);
  const [gameState, setGameState] = useState<CardState>(CardState.IDLE);
  const [deck, setDeck] = useState<TarotCardData[]>([]);
  const [currentDraw, setCurrentDraw] = useState<{card: TarotCardData, isReversed: boolean} | null>(null);
  const [isSelecting, setIsSelecting] = useState(true); // Start in selection mode
  
  // History & Spread Logic
  const [history, setHistory] = useState<DrawResult[]>([]);
  const [showSpread, setShowSpread] = useState(false);
  const [spreadInterpretation, setSpreadInterpretation] = useState("");
  const [isSpreadLoading, setIsSpreadLoading] = useState(false);

  // Interaction State
  const [gesture, setGesture] = useState<HandGesture>(HandGesture.NONE);
  const [cursor, setCursor] = useState<Vector2>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [webcamAllowed, setWebcamAllowed] = useState(false);
  
  // Pinch Timing Logic (For Confirm / Selection Visuals)
  const [pinchProgress, setPinchProgress] = useState(0); // 0 to 1
  const pinchStartRef = useRef<number>(0);

  // Permission Modal State
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Debug Canvas
  const requestRef = useRef<number>(0);
  const lastVideoTime = useRef<number>(-1);

  // --- Initialization ---
  useEffect(() => {
    // Load Deck
    setDeck(getDeck());
  }, []);

  // --- Hand Tracking Loop ---
  const animate = useCallback(() => {
    if (mode === GameMode.HAND && videoRef.current && videoRef.current.readyState >= 2) {
      const now = performance.now();
      if (videoRef.current.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = videoRef.current.currentTime;
        
        // Detection
        const result = detectHands(videoRef.current, now);
        
        // Debug Drawing
        if (canvasRef.current && videoRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                // Match dimensions
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                
                // Draw Video Frame (Mirrored to match interaction)
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-canvasRef.current.width, 0);
                ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.restore();

                // Draw Landmarks
                if (result && result.landmarks && result.landmarks.length > 0) {
                    const landmarks = result.landmarks[0];
                    ctx.fillStyle = '#00FF00';
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;

                    // Simple connections (Thumb, Index, etc.)
                    const connections = [
                        [0,1], [1,2], [2,3], [3,4], // Thumb
                        [0,5], [5,6], [6,7], [7,8], // Index
                        [0,9], [9,10], [10,11], [11,12], // Middle
                        [0,13], [13,14], [14,15], [15,16], // Ring
                        [0,17], [17,18], [18,19], [19,20] // Pinky
                    ];

                    // Draw connections
                    const w = canvasRef.current.width;
                    const h = canvasRef.current.height;

                    connections.forEach(([i, j]) => {
                        const p1 = landmarks[i];
                        const p2 = landmarks[j];
                        ctx.beginPath();
                        ctx.moveTo((1 - p1.x) * w, p1.y * h);
                        ctx.lineTo((1 - p2.x) * w, p2.y * h);
                        ctx.stroke();
                    });

                    // Draw Points
                    landmarks.forEach(lm => {
                        ctx.beginPath();
                        ctx.arc((1 - lm.x) * w, lm.y * h, 4, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }
            }
        }

        // Logic
        const interpretation = interpretGesture(result?.landmarks);
        
        const clampedCursor = {
            x: Math.max(-1, Math.min(1, interpretation.cursor.x)),
            y: Math.max(-1, Math.min(1, interpretation.cursor.y))
        };

        setGesture(interpretation.gesture);
        setCursor(clampedCursor);

        // --- Handle Pinch Timing Logic Globally (For Visuals & Confirm) ---
        if (interpretation.gesture === HandGesture.PINCH) {
            if (pinchStartRef.current === 0) {
                pinchStartRef.current = now;
            }
            const duration = now - pinchStartRef.current;
            const progress = Math.min(duration / 1000, 1.0);
            setPinchProgress(progress);
        } else {
            pinchStartRef.current = 0;
            setPinchProgress(0);
        }
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [mode]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // --- Webcam Setup ---
  const requestCameraAccess = () => {
    if (webcamAllowed) {
        setMode(GameMode.HAND);
    } else {
        setShowPermissionModal(true);
    }
  };

  const confirmCameraAccess = async () => {
    setIsCameraLoading(true);
    try {
      await initializeHandLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
           videoRef.current?.play();
           setWebcamAllowed(true);
           setMode(GameMode.HAND);
           setShowPermissionModal(false);
           setIsCameraLoading(false);
        };
      }
    } catch (err) {
      console.error("Camera failed:", err);
      alert("Camera access denied or failed. Check permissions.");
      setMode(GameMode.MOUSE);
      setShowPermissionModal(false);
      setIsCameraLoading(false);
    }
  };

  // --- Game Logic ---

  // Handle Card Selection from DeckFan
  const handleCardSelect = () => {
    if (!isSelecting || deck.length === 0) return;

    const result = getRandomCard(deck);
    if (result) {
      setCurrentDraw({ card: result.card, isReversed: result.isReversed });
      setDeck(result.remainingDeck);
      setIsSelecting(false);
      setGameState(CardState.IDLE);
    }
  };

  // Mouse Input Handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode === GameMode.MOUSE) {
      setCursor({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1
      });
    }
  };

  const handleMouseDown = () => {
    if (mode === GameMode.MOUSE && isHovering && gameState === CardState.IDLE && !isSelecting) {
      setGameState(CardState.GRABBED);
    }
  };

  const handleMouseUp = () => {
    if (mode === GameMode.MOUSE && gameState === CardState.GRABBED) {
      setGameState(CardState.IDLE);
    }
  };
  
  // Hand Gesture State Machine Transitions
  useEffect(() => {
    if (mode !== GameMode.HAND) return;

    if (!isSelecting && gameState === CardState.IDLE && isHovering && gesture === HandGesture.PINCH) {
      setGameState(CardState.GRABBED);
    } else if (gameState === CardState.GRABBED && gesture === HandGesture.OPEN) {
      // If user lets go before revealing, reset
      setGameState(CardState.IDLE);
    } else if (gameState === CardState.REVEALED && gesture === HandGesture.PINCH) {
       // Logic Change: Confirm by Holding Pinch for 1s
       if (pinchProgress >= 1.0) {
           handleConfirm();
           // Reset to avoid double trigger
           pinchStartRef.current = 0; 
           setPinchProgress(0);
       }
    }
  }, [gesture, isHovering, gameState, mode, isSelecting, pinchProgress]);


  const handleReveal = () => {
    if (gameState === CardState.GRABBED) {
      setGameState(CardState.REVEALED);
    }
  };

  const handleConfirm = () => {
    if (gameState !== CardState.REVEALED || !currentDraw) return;
    // Trigger the dissolve animation
    setGameState(CardState.DISSOLVING);
  };

  const handleDissolveComplete = () => {
    if (currentDraw) {
        const newEntry: DrawResult = { ...currentDraw, timestamp: Date.now() };
        const newHistory = [...history, newEntry];
        setHistory(newHistory);

        // Check for 3-card spread condition
        if (newHistory.length > 0 && newHistory.length % 3 === 0) {
            // Trigger Spread Reading
            setIsSelecting(false); // Do not go back to deck yet
            setShowSpread(true);
            setIsSpreadLoading(true);

            // Get last 3 cards
            const spreadCards = newHistory.slice(-3);
            const simplifiedCards = spreadCards.map(c => ({
                name: c.card.name,
                isReversed: c.isReversed
            }));

            getSpreadReading(simplifiedCards).then(text => {
                setSpreadInterpretation(text);
                setIsSpreadLoading(false);
            });
        } else {
            // Normal flow
            setIsSelecting(true);
        }
    }

    setGameState(CardState.IDLE);
    setCurrentDraw(null);
  };

  const handleCloseSpread = () => {
      setShowSpread(false);
      setSpreadInterpretation("");
      setIsSelecting(true);
  };

  // --- Visuals: Cursor Style based on Gesture ---
  const getCursorColor = () => {
     switch (gesture) {
         case HandGesture.PINCH: return 'border-yellow-400 shadow-[0_0_15px_#facc15] bg-yellow-400/20';
         // FIST removed
         case HandGesture.POINT: return 'border-blue-400 shadow-[0_0_15px_#60a5fa] bg-blue-400/20';
         case HandGesture.OPEN: return 'border-emerald-400 shadow-[0_0_10px_#34d399]';
         default: return 'border-white opacity-50';
     }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden" 
         onMouseMove={handleMouseMove}
         onMouseDown={handleMouseDown}
         onMouseUp={handleMouseUp}
    >
      {/* Hidden Video for MediaPipe (Source) */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted></video>

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 6]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
          <pointLight position={[-5, 0, 5]} intensity={0.5} color="purple" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Environment preset="night" />

          {/* Render Deck Fan for Selection */}
          {isSelecting && !showSpread && (
            <DeckFan 
              mode={mode}
              cursor={cursor}
              gesture={gesture}
              onCardSelect={handleCardSelect}
            />
          )}

          {/* Render Active Card */}
          {!isSelecting && currentDraw && !showSpread && (
            <TarotCard
              data={currentDraw.card}
              isReversed={currentDraw.isReversed}
              state={gameState}
              gesture={gesture}
              cursor={cursor}
              mode={mode}
              onHover={setIsHovering}
              onReveal={handleReveal}
              onConfirm={handleConfirm}
              onDissolveComplete={handleDissolveComplete}
            />
          )}
        </Suspense>
      </Canvas>

      {/* --- UI Overlay --- */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6">
        
        {/* Visual Cursor Overlay (For Hand Mode) */}
        {mode === GameMode.HAND && (
            <div 
                className={`absolute w-8 h-8 rounded-full border-2 transition-all duration-100 ease-out z-50 pointer-events-none flex items-center justify-center ${getCursorColor()}`}
                style={{
                    left: `${(cursor.x + 1) * 50}%`,
                    top: `${(-cursor.y + 1) * 50}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                {/* Progress Ring for Pinch Holding */}
                {gesture === HandGesture.PINCH && (
                     <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 32 32">
                        <circle 
                            cx="16" cy="16" r="14" 
                            stroke="white" 
                            strokeWidth="4" 
                            fill="none" 
                            strokeDasharray="88" 
                            strokeDashoffset={88 - (88 * pinchProgress)}
                            className="transition-[stroke-dashoffset] duration-75 ease-linear opacity-80"
                        />
                     </svg>
                )}
                
                {/* Tiny center dot */}
                <div className="w-1 h-1 bg-white rounded-full opacity-80" />
            </div>
        )}

        {/* Debug / Video Feed (Bottom Right) */}
        {mode === GameMode.HAND && (
          <div className="absolute bottom-6 right-6 z-40 pointer-events-auto">
             <div className="bg-black/80 rounded-lg border border-gray-700/50 overflow-hidden shadow-2xl">
                 <div className="p-1 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-mono pl-2">MYSTIC VISION</span>
                    <span className={`text-[10px] font-mono px-2 rounded ${gesture !== HandGesture.NONE ? 'text-green-400' : 'text-red-400'}`}>
                        {gesture}
                    </span>
                 </div>
                 <canvas 
                    ref={canvasRef} 
                    className="w-48 h-36 object-cover opacity-80"
                 />
             </div>
          </div>
        )}

        {/* CENTER TITLE: Gothic Platinum Style */}
        <div className="absolute top-6 left-0 w-full flex flex-col items-center justify-center z-20 pointer-events-none">
            <h1 className="text-5xl md:text-6xl font-gothic text-platinum tracking-wide drop-shadow-2xl text-center select-none">
              Mystic Hand Tarot
            </h1>
            <p className="text-xs text-indigo-300/60 uppercase tracking-[0.3em] mt-2 font-light">A WebGL Experience</p>
            {/* Draw Counter */}
            <div className="mt-2 flex gap-1">
                {[0, 1, 2].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full border border-gray-600 ${history.length % 3 > i ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 'bg-transparent'}`} />
                ))}
            </div>
        </div>

        {/* TOP RIGHT: Controls */}
        <div className="absolute top-6 right-6 flex gap-2 pointer-events-auto z-30">
            <button 
              onClick={() => setMode(GameMode.MOUSE)}
              className={`px-4 py-2 border text-xs tracking-wider ${mode === GameMode.MOUSE ? 'bg-indigo-600/80 border-indigo-400' : 'bg-black/40 border-gray-600 hover:bg-gray-800'} text-white rounded transition-all`}
            >
              MOUSE
            </button>
            <button 
              onClick={requestCameraAccess}
              className={`px-4 py-2 border text-xs tracking-wider ${mode === GameMode.HAND ? 'bg-indigo-600/80 border-indigo-400' : 'bg-black/40 border-gray-600 hover:bg-gray-800'} text-white rounded transition-all`}
            >
              CAMERA
            </button>
        </div>

        {/* Central Area: Instructions (Status / Result) */}
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 text-center pointer-events-none transition-opacity duration-500 w-full flex justify-center z-10">
          
          {!isSelecting && gameState === CardState.IDLE && !showSpread && (
            <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
              <p className="text-lg text-indigo-100">
                {mode === GameMode.HAND ? "OPEN to move • POINT to Stop • PINCH (Hold 1s) to Pull" : "Hover to Select • Click & Drag to Reveal"}
              </p>
            </div>
          )}
          {gameState === CardState.GRABBED && (
            <p className="text-xl text-yellow-200 animate-pulse drop-shadow-[0_0_10px_rgba(253,224,71,0.5)]">
               {mode === GameMode.HAND ? "Pull Down to Reveal..." : "Drag Closer..."}
            </p>
          )}
          {gameState === CardState.REVEALED && (
            <div className="bg-black/60 backdrop-blur-md p-6 rounded-lg border border-yellow-500/30 max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <h2 className="text-2xl text-yellow-400 mb-1 font-serif">{currentDraw?.card.name}</h2>
                <p className="text-sm text-red-300 uppercase tracking-widest mb-2 font-bold">
                  {currentDraw?.isReversed ? "Reversed" : "Upright"}
                </p>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent my-2" />
                <p className="text-gray-200 italic font-light leading-relaxed">
                  {currentDraw?.isReversed ? currentDraw?.card.meaningReversed : currentDraw?.card.meaningUpright}
                </p>
                <p className="mt-4 text-xs text-gray-400 uppercase tracking-wider animate-pulse">
                  {mode === GameMode.HAND ? "HOLD PINCH (1s) to Confirm" : "CLICK to Confirm"}
                </p>
                <button 
                   onClick={handleConfirm}
                   className="mt-4 pointer-events-auto bg-gradient-to-r from-yellow-900/40 to-yellow-600/40 hover:from-yellow-800/60 hover:to-yellow-500/60 text-yellow-100 border border-yellow-500/50 px-6 py-2 rounded-sm w-full uppercase text-sm tracking-[0.2em] transition-all shadow-lg hover:shadow-yellow-500/20"
                >
                  Accept Fate
                </button>
            </div>
          )}
        </div>

        {/* Bottom Selection Instruction */}
        {isSelecting && !showSpread && (
           <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-center pointer-events-none transition-opacity duration-500 z-10 w-full">
             <div className="inline-block bg-black/40 backdrop-blur-md px-8 py-3 rounded-full border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
               <p className="text-lg text-indigo-100 font-light tracking-wider animate-pulse">
                 {mode === GameMode.HAND ? "PINCH & HOLD (1s) to Select Card" : "Select a Card from the Deck"}
               </p>
             </div>
           </div>
        )}

        {/* Permission Modal */}
        {showPermissionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 pointer-events-auto">
                <div className="bg-[#121215] border border-indigo-500/30 rounded-xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(79,70,229,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                    <button 
                        onClick={() => setShowPermissionModal(false)}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        disabled={isCameraLoading}
                    >
                        ✕
                    </button>
                    <h2 className="text-2xl font-bold text-indigo-300 mb-4 font-serif tracking-wide">Enable Mystic Sight</h2>
                    <p className="text-gray-300 mb-6 leading-relaxed font-light text-sm">
                        To manipulate the cards with your hands, we require access to your camera. 
                        <br/><br/>
                        <span className="text-xs text-indigo-400/80 uppercase tracking-widest font-bold">Privacy Notice</span>
                        <br/>
                        <span className="text-xs text-gray-500">
                            Hand tracking is performed locally on your device using MediaPipe. No video data is ever sent to a server.
                        </span>
                    </p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowPermissionModal(false)}
                            disabled={isCameraLoading}
                            className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50 text-sm tracking-wider uppercase"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmCameraAccess}
                            disabled={isCameraLoading}
                            className="flex-1 py-3 rounded-lg bg-indigo-900/50 border border-indigo-500/50 text-indigo-100 hover:bg-indigo-800 hover:border-indigo-400 transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 flex justify-center items-center text-sm tracking-wider uppercase"
                        >
                            {isCameraLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-indigo-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Loading Model...
                                </span>
                            ) : "Grant Access"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Spread Result Modal */}
        {showSpread && (
            <div className="pointer-events-auto">
                 <SpreadOverlay 
                    cards={history.slice(-3)} 
                    interpretation={spreadInterpretation} 
                    isLoading={isSpreadLoading} 
                    onClose={handleCloseSpread}
                 />
            </div>
        )}

      </div>
    </div>
  );
};

export default App;
