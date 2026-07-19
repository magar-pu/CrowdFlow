import React from "react";
import { VenueSection } from "../../types";
import { Map, Layers } from "lucide-react";

interface WorkspaceVenueProps {
  sections: VenueSection[];
  onUpdateSections?: (updated: VenueSection[]) => void;
}

export default function WorkspaceVenue({ sections }: WorkspaceVenueProps) {
  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-text-primary">Venue Vector Layout</h3>
        <p className="text-xs text-text-secondary">Live graphical layout representing stages, seat positions, and gate sectors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-white border border-border-subtle rounded-xl shadow-sm flex flex-col justify-between min-h-[360px]">
          <div className="flex justify-between items-center border-b border-border-subtle pb-3 mb-4">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5"><Layers className="w-4 h-4 text-secondary" />Floorplan Vector Canvas</span>
            <span className="text-[10px] bg-success/10 text-success border border-success/20 font-mono font-bold px-2 py-0.5 rounded">Active Designer</span>
          </div>

          <div className="relative flex-1 bg-surface-container-low border border-border-subtle/50 rounded-xl overflow-hidden min-h-[250px] flex items-center justify-center">
            <div className="absolute top-4 w-48 h-8 bg-primary border border-primary rounded text-[10px] font-mono font-bold text-on-primary flex items-center justify-center">
              STAGE CENTER
            </div>

            {sections.map((sec) => (
              <div
                key={sec.id}
                className="absolute border border-outline rounded p-2 text-center flex flex-col justify-center bg-white hover:border-secondary transition-colors shadow-sm select-none"
                style={{
                  left: `${sec.x}px`,
                  top: `${sec.y}px`,
                  width: `${sec.width}px`,
                  height: `${sec.height}px`
                }}
              >
                <span className="text-[9px] font-bold text-text-primary truncate">{sec.name}</span>
                <span className="text-[8px] font-mono text-on-surface-variant mt-0.5 truncate">{sec.sold}/{sec.capacity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2"><Map className="w-4 h-4 text-secondary" />Sector Allocations</h4>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {sections.map((sec) => {
              const ratio = sec.sold / sec.capacity;
              return (
                <div key={sec.id} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-text-primary">{sec.name}</span>
                    <span className="text-text-secondary font-mono text-[10px]">{sec.sold} / {sec.capacity} sold</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full" style={{ width: `${ratio * 100}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
