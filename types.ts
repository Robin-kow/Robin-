export enum GameMode {
  MOUSE = 'MOUSE',
  HAND = 'HAND'
}

export enum HandGesture {
  NONE = 'NONE',
  OPEN = 'OPEN',    // Ready/Hover
  PINCH = 'PINCH',  // Grab/Drag
  FIST = 'FIST',    // Confirm
  POINT = 'POINT'   // Highlight
}

export enum CardState {
  IDLE = 'IDLE',       // Floating in deck
  HOVERED = 'HOVERED', // Mouse/Hand over
  GRABBED = 'GRABBED', // Dragging
  REVEALED = 'REVEALED', // Shown to user (locked)
  DISSOLVING = 'DISSOLVING' // Turning to ash
}

export interface TarotCardData {
  id: number;
  name: string;
  name_short: string; // for image loading
  meaningUpright: string;
  meaningReversed: string;
  image?: string;
}

export interface DrawResult {
  card: TarotCardData;
  isReversed: boolean;
  timestamp: number;
  aiInterpretation?: string;
}

export interface Vector2 {
  x: number;
  y: number;
}