"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Music, MapPin, Calendar, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCATIONS = ["All Locations", "Jakarta", "Bandung", "Surabaya", "Tangerang", "Sleman", "Badung"];

export function SearchBar() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [date, setDate] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 50);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location && location !== "All Locations") params.set("location", location);
    if (date) params.set("date", date);

    const qs = params.toString();
    router.push(`/events${qs ? `?${qs}` : ""}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div 
      className={cn(
        "relative z-30 px-6 lg:px-16 mb-4 transition-all duration-700 ease-out",
        isVisible 
          ? "opacity-100 transform -translate-y-1/2" 
          : "opacity-0 transform translate-y-4 pointer-events-none"
      )}
    >
      <div className="bg-surface-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 flex items-center w-full max-w-5xl mx-auto border border-border-subtle">
        
        {/* Search Field 1: Event/Artist Name */}
        <div className="flex-1 flex flex-col px-6 py-3 border-r border-border-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 flex items-center gap-1.5">
            <Music size={14} className="text-accent-blue" /> 
            Event or Artist Name
          </span>
          <input 
            className="border-0 p-0 text-base focus:ring-0 text-on-surface font-semibold bg-transparent placeholder:font-normal placeholder:text-on-surface-variant/60" 
            placeholder="What are you looking for?" 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Search Field 2: Location */}
        <div className="flex-1 flex flex-col px-6 py-3 border-r border-border-subtle hidden sm:flex">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 flex items-center gap-1.5">
            <MapPin size={14} className="text-accent-blue" /> 
            Location
          </span>
          <select 
            className="border-0 p-0 text-base focus:ring-0 text-on-surface font-semibold bg-transparent cursor-pointer"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Search Field 3: Date */}
        <div className="flex-1 flex flex-col px-6 py-3 hidden md:flex">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 flex items-center gap-1.5">
            <Calendar size={14} className="text-accent-blue" /> 
            Date
          </span>
          <input 
            className="border-0 p-0 text-base focus:ring-0 text-on-surface font-semibold bg-transparent" 
            placeholder="Any date" 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Search Button */}
        <button 
          onClick={handleSearch}
          className="w-14 h-14 bg-accent-blue rounded-xl flex items-center justify-center text-white hover:bg-accent-blue/90 transition-colors ml-2 shadow-md shrink-0 active:scale-95"
        >
          <Search size={24} />
        </button>
      </div>
    </div>
  );
}
