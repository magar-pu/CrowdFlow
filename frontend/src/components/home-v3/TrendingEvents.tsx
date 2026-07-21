import { ChevronRight, Flame, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

const EVENTS = [
  {
    title: "Coldplay: Music of the Spheres",
    date: "15 Nov • 20:00 WIB",
    price: "Rp 1.500.000",
    rating: "4.9",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Java Jazz Festival 2026",
    date: "2-4 Jun • 15:00 WIB",
    price: "Rp 850.000",
    rating: "4.8",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Timnas vs Jepang - Kualifikasi Pildun",
    date: "14 Okt • 19:30 WIB",
    price: "Rp 350.000",
    rating: "4.9",
    image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Standup Fest 2026",
    date: "10 Sep • 19:00 WIB",
    price: "Rp 250.000",
    rating: "4.7",
    image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?q=80&w=800&auto=format&fit=crop"
  }
];

export function TrendingEvents() {
  return (
    <section className="mt-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-display text-[28px] font-bold text-on-surface tracking-tight mb-2">
            Trending Now
          </h3>
          <p className="text-sm text-on-surface-variant">
            Events that are selling out incredibly fast.
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
            href={`/events/${index + 10}`}
            className="bg-surface-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border-subtle group cursor-pointer flex flex-col relative"
          >
            <div className="relative w-full aspect-[16/9] overflow-hidden">
              <img 
                alt={event.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
                src={event.image} 
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center gap-1 shadow-sm">
                <Flame size={12} className="text-accent-blue fill-accent-blue" /> Selling Fast
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
