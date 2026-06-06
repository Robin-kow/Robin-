import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { HandGesture, Vector2 } from "../types";

let handLandmarker: HandLandmarker | undefined;
let runningMode: "IMAGE" | "VIDEO" = "VIDEO";

export const initializeHandLandmarker = async () => {
  try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      console.log("HandLandmarker initialized successfully");
      return handLandmarker;
  } catch (error) {
      console.error("Failed to initialize HandLandmarker:", error);
      throw error;
  }
};

export const detectHands = (video: HTMLVideoElement, timestamp: number) => {
  if (!handLandmarker) return null;
  // Ensure video has dimensions
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;
  
  try {
      const result = handLandmarker.detectForVideo(video, timestamp);
      return result;
  } catch (e) {
      console.warn("Detection error:", e);
      return null;
  }
};

export const interpretGesture = (landmarks: any): { gesture: HandGesture, cursor: Vector2 } => {
  if (!landmarks || landmarks.length === 0) {
    return { gesture: HandGesture.NONE, cursor: { x: 0, y: 0 } };
  }

  const hand = landmarks[0]; // Assume 1 hand
  
  // Key Points
  const wrist = hand[0];
  const thumbTip = hand[4];
  const indexPip = hand[6]; 
  const indexTip = hand[8];
  const middlePip = hand[10];
  const middleTip = hand[12];
  const ringPip = hand[14];
  const ringTip = hand[16];
  const pinkyPip = hand[18];
  const pinkyTip = hand[20];

  // Helper: Euclidean Distance
  const distance = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const cursor = {
    x: (1 - indexTip.x) * 2 - 1,  // Flip X to match mirror feel
    y: -(indexTip.y * 2 - 1)      // Flip Y because WebGL Y is up
  };

  // --- Simplified Gesture Detection Logic ---

  // 1. PINCH Detection 
  // Simply check distance between Thumb Tip and Index Tip.
  // 0.08 is roughly 8% of the screen diagonal.
  const pinchDist = distance(thumbTip, indexTip);
  const isPinching = pinchDist < 0.08; 

  if (isPinching) {
      return { gesture: HandGesture.PINCH, cursor };
  }
  
  // Helper: Is finger extended? 
  // Logic: Tip is further from wrist than PIP (Knuckle area).
  const isExtended = (tip: any, pip: any) => distance(tip, wrist) > distance(pip, wrist);

  const indexOut = isExtended(indexTip, indexPip);
  const middleOut = isExtended(middleTip, middlePip);
  const ringOut = isExtended(ringTip, ringPip);
  const pinkyOut = isExtended(pinkyTip, pinkyPip);

  // 2. POINT Detection (Index extended, others curled)
  if (indexOut && !middleOut && !ringOut && !pinkyOut) {
      return { gesture: HandGesture.POINT, cursor };
  }

  // 3. OPEN Detection (Default)
  return { gesture: HandGesture.OPEN, cursor };
};
