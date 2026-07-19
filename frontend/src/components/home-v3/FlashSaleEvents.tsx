import { ChevronRight, Zap, Clock, ArrowRight, Tag } from "lucide-react";
import Link from "next/link";

const EVENTS = [
  {
    title: "Tulus: Tur Manusia",
    date: "12 Dec • 19:00 WIB",
    original_price: "Rp 650.000",
    price: "Rp 325.000",
    discount: "50%",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Bali Tech Conference",
    date: "20 Sep • 09:00 WIB",
    original_price: "Rp 2.000.000",
    price: "Rp 1.000.000",
    discount: "50%",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Phantom of The Opera",
    date: "5 Nov • 20:00 WIB",
    original_price: "Rp 1.200.000",
    price: "Rp 840.000",
    discount: "30%",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "EDM Warehouse Party",
    date: "31 Oct • 22:00 WIB",
    original_price: "Rp 300.000",
    price: "Rp 150.000",
    discount: "50%",
    image: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?q=80&w=800&auto=format&fit=crop"
  }
];

export function FlashSaleEvents() {
  return (
    <section className="mt-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-display text-[28px] font-bold text-on-surface tracking-tight mb-2">
            Flash Sale
          </h3>
          <p className="text-sm text-on-surface-variant flex items-center gap-2">
            <span className="font-bold text-accent-blue border border-accent-blue/30 bg-accent-blue/10 px-2 py-0.5 rounded text-xs">Ends in 02:15:30</span>
            Limited time offers for selected events.
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
            href={`/events/${index + 20}`}
            className="bg-surface-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border-subtle group cursor-pointer flex flex-col relative"
          >
            <div className="relative w-full aspect-[16/9] overflow-hidden">
              <img 
                alt={event.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
                src={event.image} 
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center gap-1 shadow-sm">
                <Tag size={12} className="text-accent-blue fill-accent-blue" /> {event.discount} OFF
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <h4 className="font-display text-lg text-on-surface font-bold mb-1">{event.title}</h4>
              <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
                <Clock size={14} /> {event.date}
              </p>
              
              <div className="mt-auto flex justify-between items-center pt-3 border-t border-border-subtle">
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5 line-through">{event.original_price}</p>
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
