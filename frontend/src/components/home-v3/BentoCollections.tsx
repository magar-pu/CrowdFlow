import { ArrowRight } from "lucide-react";

export function BentoCollections() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-16">
      
      {/* Text Block */}
      <div className="md:col-span-4 flex flex-col justify-center pr-4 py-8 bg-surface-white rounded-2xl p-8 border border-border-subtle shadow-sm">
        <div className="w-12 h-1 bg-accent-blue mb-6 rounded-full"></div>
        <h3 className="font-display text-[32px] font-bold text-on-surface mb-4 leading-tight">
          Koleksi Event<br/>Terkurasi
        </h3>
        <p className="text-base text-on-surface-variant mb-8 leading-relaxed">
          Baik Anda seorang penggemar musik, penikmat seni, pencinta teater, maupun suporter olahraga — kami memiliki event yang cocok untuk Anda. Temukan koleksi yang disesuaikan dengan minat Anda.
        </p>
        <div>
          <button className="bg-surface-container-low text-on-surface px-6 py-3 rounded-xl text-sm font-bold tracking-wide hover:bg-surface-container-high transition-colors flex items-center gap-2">
            Jelajahi Koleksi <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Images Grid */}
      <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        
        {/* Tall Image */}
        <div className="row-span-2 col-span-1 rounded-xl overflow-hidden relative group">
          <img 
            alt="Festival Musik" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1200&auto=format&fit=crop" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            <h4 className="font-display text-white text-xl font-bold mb-1">Festival Musik</h4>
            <p className="text-white/80 text-xs">Konser outdoor & rave party</p>
          </div>
        </div>
        
        {/* Wide Image */}
        <div className="col-span-2 rounded-xl overflow-hidden relative group h-48 md:h-60">
          <img 
            alt="Olahraga" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            src="https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1200&auto=format&fit=crop" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>
          <div className="absolute top-6 left-6">
            <h4 className="font-display text-white text-xl font-bold mb-1">Turnamen Olahraga</h4>
            <p className="text-white/80 text-xs">Dukung tim favorit Anda secara langsung</p>
          </div>
        </div>

        {/* Square Image 1 */}
        <div className="rounded-xl overflow-hidden relative group h-48">
          <img 
            alt="Pameran Seni" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            src="https://images.unsplash.com/photo-1531913764164-f85c52e6e654?q=80&w=600&auto=format&fit=crop" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            <h4 className="font-display text-white text-lg font-bold mb-1">Pameran Seni</h4>
            <p className="text-white/80 text-xs">Karya seniman lokal & dunia</p>
          </div>
        </div>

        {/* Square Image 2 */}
        <div className="rounded-xl overflow-hidden relative group h-48">
          <img 
            alt="Teater & Drama" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            src="https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=600&auto=format&fit=crop" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            <h4 className="font-display text-white text-lg font-bold mb-1">Teater & Drama</h4>
            <p className="text-white/80 text-xs">Pertunjukan panggung epik</p>
          </div>
        </div>

      </div>
    </section>
  );
}
