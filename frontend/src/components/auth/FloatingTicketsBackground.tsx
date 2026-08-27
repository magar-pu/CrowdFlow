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

  const elements = Array.from({ length: 36 }).map((_, i) => {
    // Generate different "layers" of depth (0 to 1)
    const depthLayer = Math.random();
    
    // Choose random icon
    const Icon = ICONS[Math.floor(Math.random() * ICONS.length)];
    
    // Size based on depth: Closer elements are larger
    const size = depthLayer > 0.8 ? Math.random() * 45 + 55 : // Foreground (55-100)
                 depthLayer > 0.4 ? Math.random() * 25 + 30 : // Midground (30-55)
                 Math.random() * 18 + 16;                     // Background (16-34)
                 
    // Blur based on depth: Closer elements are sharp, far elements are blurred
    const blurAmount = depthLayer > 0.8 ? 0 : 
                       depthLayer > 0.4 ? 1.5 : 3;
                       
    // Opacity based on depth: Slightly increased for better visibility
    const opacity = depthLayer > 0.8 ? Math.random() * 0.12 + 0.08 :
                    depthLayer > 0.4 ? Math.random() * 0.08 + 0.04 :
                    Math.random() * 0.05 + 0.02;
                    
    const left = Math.random() * 100; // 0% to 100%
    
    // Speed based on depth: Closer elements move faster
    const baseDuration = depthLayer > 0.8 ? 14 : 
                         depthLayer > 0.4 ? 22 : 32;
    const animationDuration = Math.random() * 8 + baseDuration;
    
    const animationDelay = Math.random() * -30; // Negative delay to start immediately
    const rotationStart = Math.random() * 360;
    
    return (
      <div
        key={i}
        className="fixed -bottom-[12vh] flex items-center justify-center text-primary/70 pointer-events-none"
        style={{
          left: `${left}%`,
          width: size,
          height: size,
          opacity: opacity,
          filter: `blur(${blurAmount}px)`,
          animation: `floatUpViewport ${animationDuration}s linear infinite`,
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
          @keyframes floatUpViewport {
            0% {
              transform: translateY(0) rotate(0deg);
            }
            100% {
              transform: translateY(-125vh) rotate(360deg);
            }
          }
        `
      }} />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {elements}
      </div>
    </>
  );
}
