import React, { useEffect, useRef, useState } from 'react';
import { AppPhase } from '../types';
import { ArrowRight, Clapperboard, FileText, ListVideo, LayoutDashboard, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (phase: AppPhase) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Track theme to update particle colors dynamically
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Initial check
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    // Observer to watch for class changes on <html>
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                setIsDarkMode(document.documentElement.classList.contains('dark'));
            }
        });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // --- Particle System Logic ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Mouse state
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      init(); 
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Set initial size
    canvas.width = width;
    canvas.height = height;

    // Palette Configuration
    const DARK_COLORS = [
        '#ffffff', // Pure White (Stars)
        '#ffe4e6', // Rose 100 (Pale Pink)
        '#fecdd3', // Rose 200 (Soft Pink)
        '#fb7185', // Rose 400 (Medium Pink)
        '#D6001C', // Brand Red
    ];

    const LIGHT_COLORS = [
        '#991b1b', // Deep Red
        '#D6001C', // Brand Red
        '#ef4444', // Red 500
        '#52525b', // Zinc 600 (Dark Gray)
        '#a1a1aa', // Zinc 400 (Medium Gray)
    ];

    const getColors = () => document.documentElement.classList.contains('dark') ? DARK_COLORS : LIGHT_COLORS;

    // Helper: Normal Distribution (Gaussian) to cluster particles at center
    function randn_bm() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    }

    class Particle {
      x: number;
      y: number;
      size: number;
      baseSize: number;
      speedX: number;
      speedY: number;
      opacity: number;
      color: string;
      isCore: boolean; 

      constructor() {
        const distributionX = randn_bm(); 
        const distributionY = randn_bm();
        
        this.x = (width / 2) + distributionX * (width / 5);
        this.y = (height / 2) + distributionY * (height / 5);

        const dx = this.x - width / 2;
        const dy = this.y - height / 2;
        const distFromCenter = Math.sqrt(dx*dx + dy*dy);
        
        this.isCore = distFromCenter < 300;
        const currentColors = getColors();

        if (this.isCore) {
            this.baseSize = Math.random() * 2.5 + 1;
            this.opacity = Math.random() * 0.5 + 0.5; 
            this.color = currentColors[Math.floor(Math.random() * currentColors.length)];
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
        } else {
            this.baseSize = Math.random() * 1.5 + 0.5;
            this.opacity = Math.random() * 0.3 + 0.1; 
            this.color = currentColors[0]; // Base color
            this.speedX = (Math.random() - 0.5) * 0.1;
            this.speedY = (Math.random() - 0.5) * 0.1;
        }
        
        this.size = this.baseSize;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 250;

        if (distance < maxDistance) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (maxDistance - distance) / maxDistance;
            const repulsion = force * 2;
            this.x -= forceDirectionX * repulsion;
            this.y -= forceDirectionY * repulsion;
            this.size = Math.min(this.baseSize * 1.5, 4);
        } else {
            if (this.size > this.baseSize) {
                this.size -= 0.1;
            }
        }

        if (this.x < -100 || this.x > width + 100 || this.y < -100 || this.y > height + 100) {
             const distributionX = randn_bm(); 
             const distributionY = randn_bm();
             this.x = (width / 2) + distributionX * (width / 5);
             this.y = (height / 2) + distributionY * (height / 5);
        }
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.isCore) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.shadowBlur = 0;
      }
    }

    const init = () => {
      particles = [];
      const count = 1200; 
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      
      const isDark = document.documentElement.classList.contains('dark');
      // Red for Light mode, Pale Pink for Dark mode
      const connectionColor = isDark ? `rgba(253, 164, 175,` : `rgba(185, 28, 28,`; 

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        if (particles[i].isCore) {
            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    ctx.beginPath();
                    const opacity = (1 - distance / 100) * 0.3; 
                    ctx.strokeStyle = `${connectionColor} ${opacity})`; 
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode]); // Re-run effect when mode changes to refresh particle colors

  return (
    <div className="relative w-full h-full bg-cine-black overflow-hidden flex flex-col font-sans transition-colors duration-500">
      
      {/* 1. Diffuse Gradient Background Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-500">
          {isDarkMode ? (
             <>
                {/* Dark Mode Gradients */}
                <div className="absolute top-[-10%] left-[20%] w-[60%] h-[60%] bg-red-500/20 blur-[130px] rounded-full animate-pulse opacity-60 mix-blend-screen"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-900/40 blur-[150px] rounded-full opacity-60 mix-blend-screen"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-orange-900/20 blur-[140px] rounded-full opacity-50 mix-blend-screen"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/5 blur-[80px] rounded-full"></div>
             </>
          ) : (
             <>
                {/* Light Mode Gradients - Subtler, warmer */}
                <div className="absolute top-[-10%] left-[20%] w-[60%] h-[60%] bg-red-200/40 blur-[100px] rounded-full opacity-60"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/40 blur-[120px] rounded-full opacity-50"></div>
             </>
          )}
      </div>

      {/* 2. Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 opacity-90 pointer-events-none" />
      
      {/* 3. Vignette Overlay */}
      <div className={`absolute inset-0 z-10 pointer-events-none ${isDarkMode ? 'bg-radial-gradient from-transparent via-black/20 to-black/80' : 'bg-radial-gradient from-transparent via-white/10 to-white/60'}`}></div>

      {/* 4. Main Content */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-8">
        
        {/* Brand Badge */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(214,0,28,0.2)] hover:bg-white/10 transition-colors cursor-default">
              <Sparkles size={12} className="text-cine-accent animate-pulse" />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-200 font-mono uppercase tracking-[0.2em] font-bold">Film++ Studio 2025</span>
           </div>
        </div>

        {/* Hero Title */}
        <div className="text-center space-y-6 max-w-4xl mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 relative">
          
          <h1 className="relative z-10 text-6xl md:text-8xl font-black tracking-tighter leading-tight drop-shadow-2xl">
            {/* Unified Gradient for both parts */}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-cine-accent via-red-500 to-rose-900 dark:from-white dark:via-white dark:to-zinc-400">
                影加加
            </span>
            <br />
            <span className="text-4xl md:text-6xl font-light tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-cine-accent via-red-500 to-rose-900 dark:from-white dark:via-white dark:to-zinc-400">
                一站式 AIGC 短剧制作平台
            </span>
          </h1>
          <p className="relative z-10 text-zinc-500 dark:text-zinc-300 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed tracking-wide mix-blend-plus-lighter">
            从剧本拆解到分镜生成，全流程 AI 赋能。
            <br className="hidden md:block"/>
            重新定义影视创作工作流，让创意触手可及。
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
           
           {/* Primary Action */}
           <button 
              onClick={() => onNavigate('dashboard')}
              className="group relative col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-cine-accent to-rose-900 text-white p-6 rounded-2xl flex flex-col justify-between h-48 transition-all hover:scale-[1.02] shadow-[0_0_50px_-15px_rgba(214,0,28,0.5)] border border-white/10 overflow-hidden"
           >
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
              <div className="relative z-10 flex justify-between items-start">
                 <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm shadow-inner border border-white/10">
                    <LayoutDashboard size={24} />
                 </div>
                 <ArrowRight size={24} className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300" />
              </div>
              <div className="relative z-10 text-left">
                 <span className="block text-[10px] opacity-80 uppercase tracking-widest font-mono mb-1">Entry Point</span>
                 <h3 className="text-2xl font-bold tracking-tight">进入中台</h3>
                 <p className="text-xs opacity-70 mt-1">Dashboard & Overview</p>
              </div>
           </button>

           {/* Secondary Actions */}
           {[
               { id: 'script', icon: FileText, title: '剧本拆解', sub: 'Script AI Breakdown', color: 'blue' },
               { id: 'shotlist', icon: ListVideo, title: '脚本生成', sub: 'Shot List & Specs', color: 'purple' },
               { id: 'storyboard', icon: Clapperboard, title: '分镜绘制', sub: 'AI Storyboard Gen', color: 'rose' }
           ].map((item) => (
                <button 
                    key={item.id}
                    onClick={() => onNavigate(item.id as AppPhase)}
                    className="group bg-cine-panel border border-cine-border p-6 rounded-2xl flex flex-col justify-between h-48 transition-all hover:scale-[1.02] hover:shadow-xl relative overflow-hidden hover:border-cine-accent"
                >
                    <div className={`p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full w-fit group-hover:bg-cine-accent group-hover:text-white transition-colors shadow-inner text-zinc-600 dark:text-zinc-400`}>
                        <item.icon size={20} />
                    </div>
                    <div className="text-left relative z-10">
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-cine-accent dark:group-hover:text-white transition-colors">{item.title}</h3>
                        <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase group-hover:text-zinc-400 transition-colors">{item.sub}</p>
                    </div>
                </button>
           ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-center animate-in fade-in duration-1000 delay-500 z-20">
           <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-widest uppercase flex items-center gap-4">
              <span>Powered by Gemini 3 Pro</span>
              <span className="w-1 h-1 bg-zinc-400 dark:bg-zinc-700 rounded-full"></span>
              <span>Film++ Engine v2.5</span>
           </p>
        </div>

      </div>
    </div>
  );
};