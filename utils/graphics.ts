import * as THREE from 'three';

export const createCardBackTexture = (): THREE.Texture => {
    const width = 1024;
    const height = 2048; // High resolution for crisp details
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        const cx = width / 2;
        const cy = height / 2;

        // --- 1. Background: Deep Cosmic Void ---
        // Multi-stop radial gradient for depth
        const bgGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, height * 0.8);
        bgGrad.addColorStop(0, '#2E0249');   // Deep Royal Purple center
        bgGrad.addColorStop(0.3, '#190028'); // Midnight Violet
        bgGrad.addColorStop(0.7, '#0f0f12'); // Almost Black
        bgGrad.addColorStop(1, '#000000');   // Pure Black edges
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // --- 2. Nebula/Mist Effects ---
        // Subtle transparent layers to add organic noise
        ctx.globalCompositeOperation = 'screen';
        for(let i=0; i<30; i++) {
             ctx.beginPath();
             const radius = Math.random() * 300 + 100;
             const x = Math.random() * width;
             const y = Math.random() * height;
             const alpha = Math.random() * 0.08;
             const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
             // Mix of blues and purples
             const color = Math.random() > 0.5 ? '87, 13, 113' : '20, 40, 100';
             grad.addColorStop(0, `rgba(${color}, ${alpha})`);
             grad.addColorStop(1, 'rgba(0,0,0,0)');
             ctx.fillStyle = grad;
             ctx.arc(x, y, radius, 0, Math.PI*2);
             ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- 3. Starfield ---
        for (let i = 0; i < 800; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = Math.random();
            const alpha = Math.random() * 0.7 + 0.3;
            
            ctx.fillStyle = `rgba(255, 255, 230, ${alpha})`; // Warm white
            
            if (Math.random() > 0.97) {
                // Diamond Sparkle Star
                ctx.beginPath();
                ctx.moveTo(x, y - r * 6);
                ctx.quadraticCurveTo(x, y, x + r * 6, y);
                ctx.quadraticCurveTo(x, y, x, y + r * 6);
                ctx.quadraticCurveTo(x, y, x - r * 6, y);
                ctx.closePath();
                ctx.fill();
            } else {
                // Tiny dot star
                ctx.beginPath();
                ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- 4. Sacred Geometry: The Central Mandala ---
        ctx.translate(cx, cy);
        
        // Define Gold Styles
        const goldColor = '#D4AF37';
        const brightGold = '#F7E7CE';
        
        // Outer Ring
        ctx.strokeStyle = goldColor;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 280, 0, Math.PI*2); ctx.stroke();
        
        // Complex pattern loop
        const segments = 12;
        for (let i = 0; i < segments; i++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 / segments) * i);
            
            // Petal shape
            ctx.beginPath();
            ctx.moveTo(0, 80);
            ctx.bezierCurveTo(40, 150, 40, 220, 0, 280);
            ctx.bezierCurveTo(-40, 220, -40, 150, 0, 80);
            
            // Fill with faint gold
            ctx.fillStyle = 'rgba(212, 175, 55, 0.05)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
            ctx.stroke();

            // Inner geometric connection
            ctx.beginPath();
            ctx.moveTo(0, 80);
            ctx.lineTo(0, 280);
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
            ctx.stroke();

            // Tip accent
            ctx.beginPath();
            ctx.arc(0, 295, 4, 0, Math.PI*2);
            ctx.fillStyle = goldColor;
            ctx.fill();

            ctx.restore();
        }

        // Inner Eye/Sun Symbol
        ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI*2); 
        ctx.fillStyle = '#000'; ctx.fill(); 
        ctx.strokeStyle = brightGold; ctx.lineWidth = 4; ctx.stroke();

        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); 
        ctx.fillStyle = brightGold; ctx.fill();

        // Rays from center
        for(let i=0; i<8; i++){
            ctx.save();
            ctx.rotate((Math.PI*2/8)*i);
            ctx.beginPath();
            ctx.moveTo(25, 0);
            ctx.lineTo(50, 0);
            ctx.strokeStyle = goldColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }

        // Reset Transform for non-centered elements
        ctx.setTransform(1, 0, 0, 1, 0, 0);


        // --- 5. Ornate Borders ---
        const pad = 35;
        const cornerSize = 120;

        // Main Rect Frame
        ctx.strokeStyle = goldColor;
        ctx.lineWidth = 6;
        ctx.strokeRect(pad, pad, width - pad*2, height - pad*2);
        
        // Inner thin line
        ctx.strokeStyle = brightGold;
        ctx.lineWidth = 2;
        ctx.strokeRect(pad + 15, pad + 15, width - (pad*2 + 30), height - (pad*2 + 30));

        // Corner Flourishes (Filigree)
        const drawCorner = (x: number, y: number, rotation: number) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            
            ctx.beginPath();
            // Art Deco / Mystical Corner shape
            ctx.moveTo(0, 0);
            ctx.lineTo(cornerSize, 0);
            ctx.lineTo(cornerSize - 20, 20);
            ctx.lineTo(20, 20);
            ctx.lineTo(20, cornerSize - 20);
            ctx.lineTo(0, cornerSize);
            ctx.closePath();
            
            ctx.fillStyle = goldColor;
            ctx.fill();
            
            // Decorative dot
            ctx.beginPath();
            ctx.arc(35, 35, 6, 0, Math.PI*2);
            ctx.fillStyle = '#000';
            ctx.fill();
            
            ctx.restore();
        };

        drawCorner(pad, pad, 0); // TL
        drawCorner(width - pad, pad, Math.PI/2); // TR
        drawCorner(width - pad, height - pad, Math.PI); // BR
        drawCorner(pad, height - pad, -Math.PI/2); // BL

        // --- 6. Top/Bottom Celestial Icons ---
        const drawCelestial = (yPos: number, isMoon: boolean) => {
             ctx.translate(cx, yPos);
             
             if (isMoon) {
                // Crescent Moon
                ctx.beginPath();
                ctx.arc(0, 0, 40, Math.PI * 0.5, Math.PI * 1.5);
                ctx.bezierCurveTo(-20, -30, -20, 30, 0, 40);
                ctx.fillStyle = '#C0C0C0'; // Silver
                ctx.fill();
             } else {
                // Star/Sun
                ctx.beginPath();
                ctx.moveTo(0, -40);
                ctx.quadraticCurveTo(10, -10, 40, 0);
                ctx.quadraticCurveTo(10, 10, 0, 40);
                ctx.quadraticCurveTo(-10, 10, -40, 0);
                ctx.quadraticCurveTo(-10, -10, 0, -40);
                ctx.fillStyle = goldColor;
                ctx.fill();
             }
             ctx.setTransform(1, 0, 0, 1, 0, 0);
        };

        drawCelestial(pad + 150, true); // Moon at top
        drawCelestial(height - (pad + 150), false); // Sun at bottom
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16; // Crisp at angles
    return texture;
};