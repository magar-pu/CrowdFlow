import React, { useMemo, useRef, useState } from 'react';
import { SavedVenue, VenueElement } from '../../types';
import {
  Layers, MapPin, Search, Plus, ZoomIn, ZoomOut, Maximize2, Minimize2,
  ShieldAlert, ShieldCheck, Crown, Music2, Armchair, Mic2, DoorOpen, Bath, Wine, Trash2, X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StepVenueDesignerProps {
  venue: string;
  setVenue: (v: string) => void;
  savedVenues: SavedVenue[];
  setSavedVenues: (v: SavedVenue[]) => void;
  elements: VenueElement[];
  setElements: (v: VenueElement[]) => void;
}

const ZONE_PALETTE: { subtype: VenueElement['subtype']; label: string; icon: LucideIcon; capacity: number }[] = [
  { subtype: 'VIP', label: 'VIP Zone', icon: Crown, capacity: 80 },
  { subtype: 'Festival', label: 'Festival Zone', icon: Music2, capacity: 300 },
  { subtype: 'Grandstand', label: 'Grandstand', icon: Armchair, capacity: 200 },
];

const INFRA_PALETTE: { subtype: VenueElement['subtype']; label: string; icon: LucideIcon }[] = [
  { subtype: 'Stage', label: 'Stage', icon: Mic2 },
  { subtype: 'Exit', label: 'Exit', icon: DoorOpen },
  { subtype: 'Restroom', label: 'Restroom', icon: Bath },
  { subtype: 'Bar', label: 'Bar', icon: Wine },
];

const CANVAS_W = 320;
const CANVAS_H = 220;
const EL_W = 92;
const EL_H = 48;

function iconFor(subtype: VenueElement['subtype']): LucideIcon {
  return [...ZONE_PALETTE, ...INFRA_PALETTE].find(p => p.subtype === subtype)?.icon ?? Layers;
}

export default function StepVenueDesigner({
  venue, setVenue,
  savedVenues, setSavedVenues,
  elements, setElements,
}: StepVenueDesignerProps) {
  const [search, setSearch] = useState('');
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueCity, setNewVenueCity] = useState('');
  const [newVenueCapacity, setNewVenueCapacity] = useState(500);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const idSeed = useRef(1);

  const filteredVenues = useMemo(
    () => savedVenues.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.city.toLowerCase().includes(search.toLowerCase())),
    [savedVenues, search]
  );

  const selectedVenue = savedVenues.find(v => v.name === venue);
  const layoutMaxCapacity = selectedVenue?.capacity ?? 0;
  const totalSeats = elements.filter(e => e.kind === 'zone').reduce((acc, e) => acc + (e.capacity ?? 0), 0);
  const capacityRatio = layoutMaxCapacity > 0 ? Math.min(100, (totalSeats / layoutMaxCapacity) * 100) : 0;
  const isOverCapacity = layoutMaxCapacity > 0 && totalSeats > layoutMaxCapacity;
  const selectedElement = elements.find(e => e.id === selectedId) ?? null;

  const handleAddVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName) return;
    const created: SavedVenue = { id: `v-${Date.now()}`, name: newVenueName, city: newVenueCity, capacity: newVenueCapacity };
    setSavedVenues([...savedVenues, created]);
    setVenue(created.name);
    setNewVenueName('');
    setNewVenueCity('');
    setNewVenueCapacity(500);
    setShowAddVenue(false);
  };

  const addElement = (kind: VenueElement['kind'], subtype: VenueElement['subtype'], label: string, capacity?: number) => {
    const count = elements.length;
    const el: VenueElement = {
      id: `el-${idSeed.current++}`,
      kind,
      subtype,
      label,
      capacity,
      x: 16 + (count % 3) * (EL_W + 10),
      y: 16 + Math.floor(count / 3) * (EL_H + 10),
    };
    setElements([...elements, el]);
    setSelectedId(el.id);
  };

  const updateElement = (id: string, patch: Partial<VenueElement>) => {
    setElements(elements.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const clamp = (val: number, max: number) => Math.max(0, Math.min(max, val));

  const onElementPointerDown = (e: React.PointerEvent, el: VenueElement) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedId(el.id);
    setDragId(el.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = {
      x: (e.clientX - rect.left) / zoom - el.x,
      y: (e.clientY - rect.top) / zoom - el.y,
    };
  };

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp((e.clientX - rect.left) / zoom - dragOffset.current.x, CANVAS_W - EL_W);
    const y = clamp((e.clientY - rect.top) / zoom - dragOffset.current.y, CANVAS_H - EL_H);
    updateElement(dragId, { x, y });
  };

  const endDrag = () => setDragId(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-fade-in">
      <div className="lg:col-span-2 space-y-6">
        {/* Advanced Canvas & Layout Editor */}
        <div className={`bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''}`}>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-secondary" />
              Advanced Canvas & Layout Editor
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="p-1.5 rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-container-low hover:text-text-primary transition-colors cursor-pointer" title="Zoom out">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-text-secondary w-9 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, +(z + 0.25).toFixed(2)))} className="p-1.5 rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-container-low hover:text-text-primary transition-colors cursor-pointer" title="Zoom in">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsFullscreen(f => !f)} className="p-1.5 rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-container-low hover:text-text-primary transition-colors cursor-pointer ml-1" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Palette */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ZONE_PALETTE.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.subtype}
                  onClick={() => addElement('zone', p.subtype, p.label, p.capacity)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-secondary/20 bg-secondary/5 text-secondary text-[10px] font-bold hover:bg-secondary hover:text-on-secondary transition-colors cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" /> {p.label}
                </button>
              );
            })}
            <span className="w-px bg-border-subtle mx-1"></span>
            {INFRA_PALETTE.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.subtype}
                  onClick={() => addElement('infra', p.subtype, p.label)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-subtle text-text-secondary text-[10px] font-bold hover:bg-surface-container-low hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" /> {p.label}
                </button>
              );
            })}
          </div>

          <div className={`relative flex-1 bg-surface-container-low border border-border-subtle/50 rounded-lg overflow-auto ${isFullscreen ? 'min-h-[60vh]' : 'min-h-[240px]'}`}>
            <div
              ref={canvasRef}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onPointerDown={() => setSelectedId(null)}
              className="relative origin-top-left"
              style={{ transform: `scale(${zoom})`, width: CANVAS_W, height: CANVAS_H }}
            >
              {elements.map((el) => {
                const Icon = iconFor(el.subtype);
                const isSelected = selectedId === el.id;
                return (
                  <div
                    key={el.id}
                    onPointerDown={(e) => onElementPointerDown(e, el)}
                    className={`absolute select-none rounded p-1.5 text-center flex flex-col items-center justify-center gap-0.5 shadow-sm font-mono text-[9px] font-bold cursor-grab active:cursor-grabbing transition-colors ${
                      el.kind === 'zone'
                        ? isSelected ? 'bg-secondary text-white border border-secondary' : 'bg-secondary/10 text-secondary border border-secondary/30'
                        : isSelected ? 'bg-primary text-on-primary border border-primary' : 'bg-white text-text-primary border border-outline'
                    }`}
                    style={{ left: el.x, top: el.y, width: EL_W, height: EL_H }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate max-w-full px-1">{el.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedElement && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-surface-container-low border border-border-subtle rounded-lg">
              <input
                value={selectedElement.label}
                onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
                className="flex-1 h-9 px-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none"
              />
              {selectedElement.kind === 'zone' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Seats</label>
                  <input
                    type="number"
                    value={selectedElement.capacity ?? 0}
                    onChange={(e) => updateElement(selectedElement.id, { capacity: Number(e.target.value) })}
                    className="w-20 h-9 px-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none"
                  />
                </div>
              )}
              <button onClick={() => removeElement(selectedElement.id)} className="p-2 text-on-surface-variant hover:text-danger transition-colors cursor-pointer shrink-0" title="Delete element">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setSelectedId(null)} className="p-2 text-on-surface-variant hover:text-text-primary transition-colors cursor-pointer shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Capacity Confirmation Widget */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-sm font-bold text-text-primary">Capacity Confirmation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Total Seats in Layout</label>
              <div className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-surface-container-low flex items-center font-mono font-bold text-text-primary">
                {totalSeats.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Room Max Capacity</label>
              <div className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-surface-container-low flex items-center font-mono font-bold text-text-primary">
                {layoutMaxCapacity > 0 ? layoutMaxCapacity.toLocaleString() : 'Select a venue'}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-text-primary">{totalSeats.toLocaleString()} seats mapped</span>
              <span className="text-text-secondary font-mono text-[10px]">{layoutMaxCapacity.toLocaleString()} max</span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isOverCapacity ? 'bg-danger' : 'bg-secondary'}`} style={{ width: `${capacityRatio}%` }}></div>
            </div>
          </div>

          {layoutMaxCapacity > 0 && (
            isOverCapacity ? (
              <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg text-xs text-danger">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Total seats mapped exceed the selected venue&apos;s max capacity. Remove or resize zones to stay compliant.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-xs text-success">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Seats mapped are within the compliant capacity range for this layout.</span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-sm font-bold text-text-primary">Venue Selection</h3>

          <div className="relative">
            <Search className="absolute top-2.5 left-3 w-3.5 h-3.5 text-on-surface-variant" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved venues..."
              className="w-full h-9 pl-8 pr-3 border border-border-subtle rounded-lg text-xs bg-white outline-none"
            />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredVenues.map((v) => (
              <button
                key={v.id}
                onClick={() => setVenue(v.name)}
                className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                  venue === v.name ? 'border-primary bg-surface-container-low' : 'border-border-subtle hover:bg-surface-container-low'
                }`}
              >
                <p className="text-xs font-bold text-text-primary">{v.name}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-on-surface-variant font-mono">{v.city}</span>
                  <span className="text-[10px] text-on-surface-variant font-mono">Cap. {v.capacity.toLocaleString()}</span>
                </div>
              </button>
            ))}
            {filteredVenues.length === 0 && (
              <p className="text-[10px] text-on-surface-variant font-mono">No venues match your search.</p>
            )}
          </div>

          {!showAddVenue ? (
            <button
              onClick={() => setShowAddVenue(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Venue
            </button>
          ) : (
            <form onSubmit={handleAddVenue} className="space-y-2 border-t border-border-subtle pt-3">
              <input type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Venue name" className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              <input type="text" value={newVenueCity} onChange={(e) => setNewVenueCity(e.target.value)} placeholder="City" className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              <input type="number" value={newVenueCapacity} onChange={(e) => setNewVenueCapacity(Number(e.target.value))} placeholder="Max capacity" className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer">Save Venue</button>
                <button type="button" onClick={() => setShowAddVenue(false)} className="flex-1 border border-border-subtle text-text-secondary text-xs font-bold py-2 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer">Cancel</button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-3">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5"><MapPin className="w-4 h-4 text-secondary" /> Layout Zones</h3>
          {elements.filter(e => e.kind === 'zone').length === 0 ? (
            <p className="text-xs text-on-surface-variant font-mono">No zones placed yet. Use the palette above the canvas.</p>
          ) : (
            <div className="space-y-2">
              {elements.filter(e => e.kind === 'zone').map((z) => (
                <div key={z.id} className="flex justify-between items-center text-xs px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg">
                  <span className="font-bold text-text-primary truncate">{z.label}</span>
                  <span className="text-on-surface-variant font-mono text-[10px]">{z.capacity} seats</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
