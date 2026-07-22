import { Award, Ticket, Users, ThumbsUp } from "lucide-react";

export function StatsBanner() {
  return (
    <section className="bg-surface-white rounded-2xl py-8 px-8 flex flex-col md:flex-row justify-around items-center gap-8 border border-border-subtle shadow-sm mt-16">
      
      {/* Stat 1 */}
      <div className="text-center flex flex-col items-center">
        <Award size={32} className="text-accent-blue mb-2" strokeWidth={1.5} />
        <h4 className="text-3xl font-display font-bold text-on-surface mb-1">10+</h4>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Years of Experience</p>
      </div>
      
      <div className="w-px h-16 bg-border-subtle hidden md:block"></div>
      
      {/* Stat 2 */}
      <div className="text-center flex flex-col items-center">
        <Ticket size={32} className="text-accent-blue mb-2" strokeWidth={1.5} />
        <h4 className="text-3xl font-display font-bold text-on-surface mb-1">500+</h4>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Events Annually</p>
      </div>
      
      <div className="w-px h-16 bg-border-subtle hidden md:block"></div>
      
      {/* Stat 3 */}
      <div className="text-center flex flex-col items-center">
        <Users size={32} className="text-accent-blue mb-2" strokeWidth={1.5} />
        <h4 className="text-3xl font-display font-bold text-on-surface mb-1">50K+</h4>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tickets Sold</p>
      </div>
      
      <div className="w-px h-16 bg-border-subtle hidden md:block"></div>
      
      {/* Stat 4 */}
      <div className="text-center flex flex-col items-center">
        <ThumbsUp size={32} className="text-accent-blue mb-2" strokeWidth={1.5} />
        <h4 className="text-3xl font-display font-bold text-on-surface mb-1">98%</h4>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Customer Satisfaction</p>
      </div>

    </section>
  );
}
