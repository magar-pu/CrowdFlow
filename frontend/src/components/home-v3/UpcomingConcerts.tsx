import { ChevronRight, Star, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

const EVENTS = [
  {
    title: "Sheila on 7: Tunggu Aku di Jakarta",
    date: "30 Sep • 19:00 WIB",
    price: "Rp 425.000",
    rating: "4.9",
    image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "IBL Finals 2026: Game 3",
    date: "15 Ags • 18:30 WIB",
    price: "Rp 150.000",
    rating: "4.8",
    image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Indonesian Charity Gala 2026",
    date: "21 Okt • 19:00 WIB",
    price: "Rp 2.500.000",
    rating: "4.9",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Bandung Culinary Festival 2026",
    date: "5 Okt • 10:00 WIB",
    price: "Rp 75.000",
    rating: "4.7",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop"
  }
];

export function UpcomingConcerts() {
  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-display text-[28px] font-bold text-on-surface tracking-tight mb-2">
            Upcoming Concerts
          </h3>
          <p className="text-sm text-on-surface-variant">
            Secure your spot at the hottest music events.
          </p>
        </div>
        <Link 
          href="/events" 
          className="text-sm font-bold text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-1"
        >
          See All <ChevronRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {EVENTS.map((event, index) => (
          <Link 
            key={index}
            href={`/events/${index + 1}`}
            className="bg-surface-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border-subtle group cursor-pointer flex flex-col"
          >
            <div className="relative w-full aspect-[4/3] overflow-hidden">
              <img 
                alt={event.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
                src={event.image} 
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center gap-1">
                <Star size={12} className="text-accent-blue fill-accent-blue" /> {event.rating}
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <h4 className="font-display text-lg text-on-surface font-bold mb-1">{event.title}</h4>
              <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
                <Clock size={14} /> {event.date}
              </p>
              
              <div className="mt-auto flex justify-between items-center pt-3 border-t border-border-subtle">
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Tickets from</p>
                  <p className="font-bold text-accent-blue text-lg">{event.price}</p>
                </div>
                <div className="w-8 h-8 bg-surface-container-low text-on-surface rounded-full flex items-center justify-center group-hover:bg-accent-blue group-hover:text-white transition-colors">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
