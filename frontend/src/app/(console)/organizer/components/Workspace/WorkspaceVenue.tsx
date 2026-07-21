import React, { useState } from "react";
import Link from "next/link";
import { VenueSection } from "../../types";
import { Map, Layers, Plus, Edit2, Trash2, X, Maximize2 } from "lucide-react";

interface WorkspaceVenueProps {
  sections: VenueSection[];
  isLoading?: boolean;
  onAddSection: (sec: Omit<VenueSection, "id" | "sold">) => Promise<void>;
  onUpdateSection: (secId: number, sec: Partial<VenueSection>) => Promise<void>;
  onDeleteSection: (secId: number) => Promise<void>;
}

export default function WorkspaceVenue({
  sections,
  isLoading = false,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
}: WorkspaceVenueProps) {
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<"seats" | "standing">("seats");
  const [capacity, setCapacity] = useState(100);
  const [price, setPrice] = useState(50.00);
  const [gate, setGate] = useState("Gate A");

  const openAdd = () => {
    setIsEdit(false);
    setSelectedId(null);
    setName("");
    setType("seats");
    setCapacity(100);
    setPrice(50.00);
    setGate("Gate A");
    setShowModal(true);
  };

  const openEdit = (sec: VenueSection) => {
    setIsEdit(true);
    setSelectedId(Number(sec.id));
    setName(sec.name);
    setType(sec.type as "seats" | "standing" || "seats");
    setCapacity(sec.capacity);
    setPrice(sec.price);
    setGate(sec.gate || "Gate A");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEdit && selectedId !== null) {
      await onUpdateSection(selectedId, {
        name,
        type,
        capacity: Number(capacity),
        price: Number(price),
        gate,
      });
    } else {
      // Auto coordinates mapping offset to layout sections nicely
      const offsetCount = sections.length;
      const x = 50 + (offsetCount * 120) % 400;
      const y = 150 + Math.floor((offsetCount * 120) / 400) * 80;
      const width = type === "seats" ? 240 : 140;
      const height = type === "seats" ? 60 : 110;

      await onAddSection({
        name,
        type,
        capacity: Number(capacity),
        price: Number(price),
        gate,
        x,
        y,
        width,
        height,
        rows: type === "seats" ? 5 : 0,
        cols: type === "seats" ? 10 : 0,
      });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">Venue Vector Layout</h3>
          <p className="text-xs text-text-secondary">Live graphical layout representing stages, seat positions, and gate sectors.</p>
        </div>
        <Link
          href="/venue-designer"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Open Full Designer
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-white border border-border-subtle rounded-xl shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="flex justify-between items-center border-b border-border-subtle pb-3 mb-4">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-secondary" />
              Floorplan Vector Canvas
            </span>
            <span className="text-[10px] bg-success/10 text-success border border-success/20 font-mono font-bold px-2 py-0.5 rounded">Active Designer</span>
          </div>

          <div className="relative flex-1 bg-surface-container-low border border-border-subtle/50 rounded-xl overflow-hidden min-h-[280px] flex items-center justify-center">
            {isLoading ? (
              <span className="text-xs font-mono text-on-surface-variant animate-pulse">Synchronizing layout layout...</span>
            ) : (
              <>
                <div className="absolute top-4 w-48 h-8 bg-primary border border-primary rounded text-[10px] font-mono font-bold text-on-primary flex items-center justify-center shadow">
                  STAGE CENTER
                </div>

                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="absolute border border-outline rounded p-2 text-center flex flex-col justify-center bg-white hover:border-secondary transition-colors shadow-sm select-none"
                    style={{
                      left: `${sec.x || 100}px`,
                      top: `${sec.y || 100}px`,
                      width: `${sec.width || 120}px`,
                      height: `${sec.height || 60}px`
                    }}
                  >
                    <span className="text-[9px] font-bold text-text-primary truncate">{sec.name}</span>
                    <span className="text-[8px] font-mono text-on-surface-variant mt-0.5 truncate">{sec.sold || 0}/{sec.capacity}</span>
                    <span className="text-[8px] font-mono text-secondary mt-0.5 font-bold">${sec.price}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Map className="w-4 h-4 text-secondary" />
                Sector Allocations
              </h4>
              <button
                onClick={openAdd}
                className="h-7 w-7 rounded-lg border border-border-subtle bg-surface-container hover:bg-surface-container-high flex items-center justify-center cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-text-primary" />
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-1 animate-pulse">
                      <div className="h-3 w-28 bg-surface-container rounded"></div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full"></div>
                    </div>
                  ))}
                </div>
              ) : sections.length > 0 ? (
                sections.map((sec) => {
                  const soldCount = sec.sold || 0;
                  const ratio = soldCount / sec.capacity;
                  return (
                    <div key={sec.id} className="space-y-1 text-xs border-b border-border-subtle/50 pb-2">
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-text-primary font-bold">{sec.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(sec)}
                            className="p-1 hover:bg-surface-container rounded text-on-surface-variant cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteSection(Number(sec.id))}
                            className="p-1 hover:bg-danger/10 rounded text-danger cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                        <span>Price: ${sec.price}</span>
                        <span>{soldCount} / {sec.capacity} sold</span>
                      </div>
                      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full" style={{ width: `${Math.min(ratio * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-text-secondary font-mono">
                  No layout sectors configured.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-fade-in">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 h-7 w-7 rounded-lg border border-border-subtle bg-white hover:bg-surface-container flex items-center justify-center cursor-pointer transition-colors text-text-secondary"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <h3 className="text-base font-bold text-text-primary tracking-tight pr-8">
              {isEdit ? "Modify Venue Sector" : "Configure Layout Sector"}
            </h3>
            <p className="text-xs text-text-secondary mt-1">Specify layout dimensions, capacity limits, and pricing structures.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              <div className="space-y-1.5 text-left">
                <label className="font-bold text-text-primary">Sector Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP Stage Front, GA Field North"
                  className="w-full h-10 px-3 border border-border-subtle rounded-lg bg-surface-container-low text-text-primary outline-none focus:border-outline"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-text-primary">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full h-10 px-3 border border-border-subtle rounded-lg bg-surface-container-low text-text-primary outline-none cursor-pointer"
                  >
                    <option value="seats">Seated Area</option>
                    <option value="standing">Standing Zone</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-text-primary">Gate Access</label>
                  <input
                    type="text"
                    required
                    value={gate}
                    onChange={(e) => setGate(e.target.value)}
                    placeholder="e.g. Gate A"
                    className="w-full h-10 px-3 border border-border-subtle rounded-lg bg-surface-container-low text-text-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-text-primary">Capacity Allocation</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full h-10 px-3 border border-border-subtle rounded-lg bg-surface-container-low text-text-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-text-primary">Ticket Price ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={0.01}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full h-10 px-3 border border-border-subtle rounded-lg bg-surface-container-low text-text-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border-subtle hover:bg-surface-container rounded-lg font-sans font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-secondary text-white hover:bg-secondary/90 rounded-lg font-sans font-semibold shadow-sm cursor-pointer transition-colors"
                >
                  {isEdit ? "Save Changes" : "Create Sector"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
