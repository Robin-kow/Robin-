import React, { useState } from 'react';
import { DrawResult } from '../types';
import { generateTarotImage } from '../services/geminiService';

interface SpreadOverlayProps {
  cards: DrawResult[];
  interpretation: string;
  isLoading: boolean;
  onClose: () => void;
}

export const SpreadOverlay: React.FC<SpreadOverlayProps> = ({ cards, interpretation, isLoading, onClose }) => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    const imageUrl = await generateTarotImage(interpretation);
    if (imageUrl) {
        setGeneratedImage(imageUrl);
        setIsImageModalOpen(true);
    }
    setIsGeneratingImage(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-6 animate-in fade-in duration-700 overflow-y-auto">
      
      {/* Close Button (Top Right) */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors p-2 z-50 border border-transparent hover:border-gray-700 rounded-full"
        aria-label="Exit Reading"
      >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
         </svg>
      </button>

      <div className="max-w-4xl w-full flex flex-col items-center min-h-0 pt-20 pb-12">
        
        {/* Header */}
        <h2 className="text-3xl md:text-5xl font-gothic text-platinum mb-2 tracking-wider text-center mt-8 md:mt-0">
            The Trinity Revealed
        </h2>
        <p className="text-indigo-300/60 uppercase tracking-[0.4em] text-xs mb-8">Past • Present • Future</p>

        {/* Cards Row */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 mb-10 items-center justify-center w-full">
            {cards.map((draw, index) => (
                <div key={index} className="flex flex-col items-center group">
                    <div className="relative w-32 h-56 md:w-40 md:h-64 mb-4 transition-transform duration-500 hover:scale-105">
                        {/* Glowing Border */}
                        <div className="absolute inset-0 rounded bg-gradient-to-tr from-yellow-600 to-transparent opacity-30 blur-md"></div>
                        
                        {/* Card Image */}
                        <img 
                            src={draw.card.image} 
                            alt={draw.card.name} 
                            className={`w-full h-full object-cover rounded border border-gray-600 shadow-2xl ${draw.isReversed ? 'rotate-180' : ''}`}
                        />
                        
                        {/* Label Badge */}
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-black/80 border border-gray-700 px-3 py-1 rounded-full whitespace-nowrap z-10">
                             <span className="text-[10px] text-yellow-500 uppercase tracking-widest font-bold">
                                {index === 0 ? 'Past' : index === 1 ? 'Present' : 'Future'}
                             </span>
                        </div>
                    </div>
                    <span className="text-gray-300 font-serif text-sm tracking-wide mt-2">{draw.card.name}</span>
                    <span className="text-gray-500 text-xs uppercase">{draw.isReversed ? 'Reversed' : 'Upright'}</span>
                </div>
            ))}
        </div>

        {/* Interpretation Box */}
        <div className="bg-[#121215] border border-indigo-500/20 p-6 md:p-8 rounded-lg max-w-2xl w-full text-center shadow-[0_0_30px_rgba(79,70,229,0.1)] relative overflow-hidden mb-8">
             {/* Decorative Background Element */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent"></div>

             {isLoading ? (
                 <div className="flex flex-col items-center justify-center py-4">
                     <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                     <p className="text-indigo-300 text-sm tracking-widest animate-pulse">Consulting the Stars...</p>
                 </div>
             ) : (
                 <>
                    <p className="text-lg md:text-xl text-gray-200 font-light leading-relaxed font-serif italic">
                        "{interpretation}"
                    </p>
                    
                    {/* Generated Image Section */}
                    <div className="mt-8 pt-6 border-t border-gray-800/50 flex flex-col items-center justify-center">
                        {generatedImage ? (
                            <button 
                                onClick={() => setIsImageModalOpen(true)}
                                className="px-6 py-2 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/50 text-indigo-200 transition-all uppercase text-xs tracking-[0.2em] rounded-sm shadow-lg hover:shadow-indigo-500/20"
                            >
                                View Envisioned Destiny
                            </button>
                        ) : isGeneratingImage ? (
                            <div className="flex flex-col items-center justify-center py-4 opacity-70">
                                <div className="w-6 h-6 border-[1.5px] border-yellow-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <p className="text-yellow-500/80 text-xs uppercase tracking-widest animate-pulse">Envisioning Destiny...</p>
                            </div>
                        ) : (
                            <button 
                                onClick={handleGenerateImage}
                                className="px-6 py-2 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/50 text-indigo-200 transition-all uppercase text-xs tracking-[0.2em] rounded-sm shadow-lg hover:shadow-indigo-500/20"
                            >
                                Envision Destiny (Generate Image)
                            </button>
                        )}
                    </div>

                    <button 
                        onClick={onClose}
                        className="mt-8 px-8 py-3 bg-transparent border border-gray-600 text-gray-400 hover:border-yellow-500 hover:text-yellow-500 transition-all uppercase text-xs tracking-[0.2em] rounded-sm"
                    >
                        Return to Table
                    </button>
                 </>
             )}
        </div>

      </div>

      {/* Image Preview Modal */}
      {isImageModalOpen && generatedImage && (
         <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl p-6 animate-in zoom-in duration-500">
            
            <button 
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors p-2 z-50 border border-transparent hover:border-gray-700 rounded-full"
              aria-label="Close Preview"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>

            {/* Title Area */}
            <div className="absolute top-6 left-0 w-full flex flex-col items-center justify-center z-20 pointer-events-none">
              <h1 className="text-5xl md:text-6xl font-gothic text-platinum tracking-wide drop-shadow-2xl text-center select-none">
                Mystic Hand Tarot
              </h1>
              <p className="text-xs text-indigo-300/60 uppercase tracking-[0.3em] mt-2 font-light">Destiny Envisioned</p>
            </div>

            {/* Image */}
            <div className="mt-24 mb-8 flex-1 min-h-0 flex items-center justify-center">
               <div className="relative h-full max-h-[65vh] md:max-h-[70vh] aspect-[2/3] overflow-hidden rounded shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                 <img 
                   src={generatedImage} 
                   alt="Tarot Vision" 
                   className="w-full h-full object-cover scale-[1.15] filter grayscale contrast-125" 
                 />
               </div>
            </div>

            {/* Save as PNG Button */}
            <button 
              onClick={() => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  // 40mm x 60mm at 300 DPI (~ 472 x 709 pixels)
                  const targetWidth = 472;
                  const targetHeight = 709;
                  canvas.width = targetWidth;
                  canvas.height = targetHeight;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    // Apply grayscale and contrast filter to mimic the UI preview and thermal aesthetic
                    ctx.filter = 'grayscale(100%) contrast(1.2)';
                    
                    // Multiply scale by a slight zoom factor (1.15) to aggressively auto-crop any AI generated white borders
                    const zoomFactor = 1.15; 
                    const scale = Math.max(targetWidth / img.width, targetHeight / img.height) * zoomFactor;
                    
                    const srcW = targetWidth / scale;
                    const srcH = targetHeight / scale;
                    const srcX = (img.width - srcW) / 2;
                    const srcY = (img.height - srcH) / 2;
                    
                    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight);
                    
                    const dataUrl = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = 'tarot_vision_40x60mm.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                };
                img.src = generatedImage;
              }}
              className="mb-8 px-8 py-3 bg-gradient-to-r from-gray-200 to-white text-black font-bold uppercase text-xs tracking-[0.2em] rounded flex items-center gap-2 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Save Vision (PNG)
            </button>
         </div>
      )}

    </div>
  );
};
