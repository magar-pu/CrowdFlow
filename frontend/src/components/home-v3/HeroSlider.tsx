"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bookmark } from "lucide-react";

const SLIDES = [
  {
    title: "COLDPLAY: MUSIC OF THE SPHERES",
    description: "Jangan lewatkan konser terbesar tahun ini. Bergabunglah dalam tur dunia epik dengan tata panggung spektakuler dan lagu-lagu hits terbaik.",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop",
    card1: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=800&auto=format&fit=crop",
    card2: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=400&auto=format&fit=crop",
  },
  {
    title: "JAKARTA SUMMER SOUND 2026",
    description: "Festival musik musim panas paling dinanti! Nikmati akhir pekan penuh energi dengan deretan artis papan atas lokal dan internasional.",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=format&fit=crop",
    card1: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop",
    card2: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "JAZZ NIGHT: BLUE HORIZON",
    description: "Tenggelam dalam alunan melodi lembut dan ritme penuh jiwa. Malam penampilan musik jazz premium dalam suasana yang intim dan eksklusif.",
    image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=1600&auto=format&fit=crop",
    card1: "https://images.unsplash.com/photo-1531913764164-f85c52e6e654?q=80&w=800&auto=format&fit=crop",
    card2: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=800&auto=format&fit=crop",
  }
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-screen z-0 bg-primary-container overflow-hidden">
      <div 
        className="absolute inset-0 h-full w-[300%] flex transition-transform duration-700 ease-in-out" 
        style={{ transform: `translateX(-${currentSlide * (100 / SLIDES.length)}%)` }}
      >
        {SLIDES.map((slide, index) => (
          <div key={index} className="w-1/3 h-full shrink-0 relative">
            <img 
              alt={`${slide.title} Background`} 
              className="w-full h-full object-cover" 
              src={slide.image} 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70 z-10" />
            <div className="absolute bottom-1/4 left-0 p-8 lg:px-24 w-full max-w-7xl mx-auto flex items-end justify-between z-20">
              <div>
                <h1 className="text-white font-display text-5xl md:text-7xl font-bold mb-4 tracking-tight uppercase max-w-3xl leading-tight">
                  {slide.title}
                </h1>
                <p className="text-white/90 text-lg mb-8 max-w-xl">
                  {slide.description}
                </p>
                <button className="bg-accent-blue text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-accent-blue/90 transition-all shadow-lg">
                  Beli Tiket <ArrowRight size={18} />
                </button>
              </div>
              
              {/* Floating Image Cards */}
              <div className="hidden lg:flex gap-6 relative right-[-100px]">
                <div className="w-64 h-80 rounded-2xl overflow-hidden relative shadow-2xl transform rotate-[-2deg]">
                  <img alt="Card 1" className="w-full h-full object-cover" src={slide.card1} />
                  <div className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow">
                    <Bookmark size={14} className="text-text-primary" />
                  </div>
                </div>
                <div className="w-64 h-80 rounded-2xl overflow-hidden relative shadow-2xl transform rotate-[2deg] translate-y-12">
                  <img alt="Card 2" className="w-full h-full object-cover" src={slide.card2} />
                  <div className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow">
                    <Bookmark size={14} className="text-text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
