"use client";

import { Music, MapPin, Calendar, Search } from "lucide-react";

export function SearchBar() {
  return (
    <div className="relative z-30 px-6 lg:px-16 mb-16 -mt-8">
      <div className="bg-surface-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 flex items-center w-full max-w-5xl mx-auto border border-border-subtle">
        
        {/* Search Field 1 */}
        <div className="flex-1 flex flex-col px-6 py-3 border-r border-border-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 flex items-center gap-1.5">
            <Music size={14} className="text-accent-blue" /> 
            Event or Artist Name
          </span>
          <input 
            className="border-0 p-0 text-base focus:ring-0 text-on-surface font-semibold bg-transparent placeholder:font-normal placeholder:text-on-surface-variant/60" 
            placeholder="What are you looking for?" 
            type="text" 
          />
        </div>

        {/* Search Field 2 */}
        <div className="flex-1 flex flex-col px-6 py-3 border-r border-border-subtle hidden sm:flex">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 flex items-center gap-1.5">
            <MapPin size={14} className="text-accent-blue" /> 
            Location
          </span>
          <input 
            className="border-0 p-0 text-base focus:ring-0 text-on-surface font-semibold bg-transparent placeholder:font-normal placeholder:text-on-surface-variant/60" 
            placeholder="Select location" 
            type="text" 
          />
        </div>

        {/* Search Field 3 */}
        <div className="flex-1 flex flex-col px-6 py-3 hidden md:flex">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 flex items-center gap-1.5">
            <Calendar size={14} className="text-accent-blue" /> 
            Date
          </span>
          <input 
            className="border-0 p-0 text-base focus:ring-0 text-on-surface font-semibold bg-transparent placeholder:font-normal placeholder:text-on-surface-variant/60" 
            placeholder="Any date" 
            type="text" 
          />
        </div>

        {/* Search Button */}
        <button className="w-14 h-14 bg-accent-blue rounded-xl flex items-center justify-center text-white hover:bg-accent-blue/90 transition-colors ml-2 shadow-md shrink-0">
          <Search size={24} />
        </button>
      </div>
    </div>
  );
}
