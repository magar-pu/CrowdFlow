"use client";

import { useEffect, useState } from "react";
import { Ticket, Star, Music, Sparkles } from "lucide-react";

const ICONS = [Ticket, Star, Music, Sparkles];

export function FloatingTicketsBackground() {
  const [mounted, set_mounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    set_mounted(true);
  }, []);

  if (!mounted) return null;

  const elements = Array.from({ length: 30 }).map((_, i) => {
    // Generate different "layers" of depth (0 to 1)
    const depthLayer = Math.random();
    
    // Choose random icon
    const Icon = ICONS[Math.floor(Math.random() * ICONS.length)];
    
    // Size based on depth: Closer elements are larger
    const size = depthLayer > 0.8 ? Math.random() * 50 + 60 : // Foreground (60-110)
                 depthLayer > 0.4 ? Math.random() * 30 + 30 : // Midground (30-60)
                 Math.random() * 20 + 15;                     // Background (15-35)
                 
    // Blur based on depth: Closer elements are sharp, far elements are blurred
    const blurAmount = depthLayer > 0.8 ? 0 : 
                       depthLayer > 0.4 ? 2 : 5;
                       
    // Opacity based on depth: Closer elements are more opaque
    const opacity = depthLayer > 0.8 ? Math.random() * 0.08 + 0.05 :
                    depthLayer > 0.4 ? Math.random() * 0.05 + 0.02 :
                    Math.random() * 0.03 + 0.01;
                    
    const left = Math.random() * 100; // 0% to 100%
    
    // Speed based on depth: Closer elements move faster
    const baseDuration = depthLayer > 0.8 ? 15 : 
                         depthLayer > 0.4 ? 25 : 35;
    const animationDuration = Math.random() * 10 + baseDuration;
    
    const animationDelay = Math.random() * -30; // Negative delay to start immediately
    const rotationStart = Math.random() * 360;
    
    return (
      <div
        key={i}
        // Using text-primary so it's visible on the white background
        className="absolute -bottom-[20%] flex items-center justify-center text-primary"
        style={{
          left: `${left}%`,
          width: size,
          height: size,
          opacity: opacity,
          filter: `blur(${blurAmount}px)`,
          animation: `floatUp ${animationDuration}s linear infinite`,
          animationDelay: `${animationDelay}s`,
        }}
      >
        <Icon size={size} fill="currentColor" style={{ transform: `rotate(${rotationStart}deg)` }} />
      </div>
    );
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes floatUp {
            0% {
              transform: translateY(0) rotate(0deg);
            }
            100% {
              transform: translateY(-130vh) rotate(360deg);
            }
          }
        `
      }} />
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {elements}
      </div>
    </>
  );
}
