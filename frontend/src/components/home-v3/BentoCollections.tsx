import { ArrowRight } from "lucide-react";

export function BentoCollections() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-16">

      {/* Text Block */}
      <div className="md:col-span-4 flex flex-col justify-center pr-4 py-8 bg-surface-white rounded-2xl p-8 border border-border-subtle shadow-sm">
        <div className="w-12 h-1 bg-accent-blue mb-6 rounded-full"></div>
        <h3 className="font-display text-[32px] font-bold text-on-surface mb-4 leading-tight">
          Curated Event<br />Collections
        </h3>
        <p className="text-base text-on-surface-variant mb-8 leading-relaxed">
          Whether you're a music fan, art enthusiast, theater lover, or sports supporter — we have the right event for you. Discover collections tailored to your interests.
        </p>
        <div>
          <button className="bg-surface-container-low text-on-surface px-6 py-3 rounded-xl text-sm font-bold tracking-wide hover:bg-surface-container-high transition-colors flex items-center gap-2">
            Explore Collections <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Images Grid */}
      <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Tall Image */}
        <div className="md:row-span-2 col-span-1 rounded-xl overflow-hidden relative group h-48 md:h-auto">
          <img
            alt="Music Festivals"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1200&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            <h4 className="font-display text-white text-xl font-bold mb-1">Music Festivals</h4>
            <p className="text-white/80 text-xs">Outdoor concerts & rave parties</p>
          </div>
        </div>

        {/* Wide Image */}
        <div className="col-span-1 md:col-span-2 rounded-xl overflow-hidden relative group h-48 md:h-60">
          <img
            alt="Sports Tournaments"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            src="https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1200&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>
          <div className="absolute top-6 left-6">
            <h4 className="font-display text-white text-xl font-bold mb-1">Sports Tournaments</h4>
            <p className="text-white/80 text-xs">Support your favorite teams live</p>
          </div>
        </div>

        {/* Square Image 1 */}
        <div className="rounded-xl overflow-hidden relative group h-48">
          <img
            alt="Art Exhibitions"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            src="https://images.unsplash.com/photo-1531913764164-f85c52e6e654?q=80&w=600&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            <h4 className="font-display text-white text-lg font-bold mb-1">Art Exhibitions</h4>
            <p className="text-white/80 text-xs">Local & world artist masterpieces</p>
          </div>
        </div>

        {/* Square Image 2 */}
        <div className="rounded-xl overflow-hidden relative group h-48">
          <img
            alt="Theater & Drama"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            src="https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=600&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            <h4 className="font-display text-white text-lg font-bold mb-1">Theater & Drama</h4>
            <p className="text-white/80 text-xs">Epic stage performances</p>
          </div>
        </div>

      </div>
    </section>
  );
}
