import React, { useState } from 'react';
import { Smartphone, Tablet, Monitor, MapPin, Globe2, CalendarDays, Share2, Link2 } from 'lucide-react';
import { TicketTier } from '../../types';

interface StepPreviewProps {
  eventName: string;
  category: string;
  description: string;
  startDate: string;
  locationType: 'physical' | 'virtual';
  venue: string;
  address: string;
  tiers: TicketTier[];
  coverImageName: string | null;
}

export default function StepPreview({ eventName, category, description, startDate, locationType, venue, address, tiers, coverImageName }: StepPreviewProps) {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop' | 'social'>('mobile');

  const lowestPrice = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : null;
  const totalCapacity = tiers.reduce((acc, t) => acc + t.capacity, 0);
  const totalSold = tiers.reduce((acc, t) => acc + t.sold, 0);
  const isSoldOut = totalCapacity > 0 && totalSold >= totalCapacity;
  const locationLabel = locationType === 'physical' ? (venue || address || 'Venue TBA') : 'Online / Virtual Event';

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 border border-border-subtle rounded-xl soft-shadow">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Device Render Preview</h3>
          <p className="text-[11px] text-text-secondary font-medium">Verify how the landing page cards appear to public ticket buyers.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDevice('mobile')}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              device === 'mobile' ? 'bg-primary border-primary text-on-primary' : 'border-border-subtle text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              device === 'tablet' ? 'bg-primary border-primary text-on-primary' : 'border-border-subtle text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              device === 'desktop' ? 'bg-primary border-primary text-on-primary' : 'border-border-subtle text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('social')}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              device === 'social' ? 'bg-primary border-primary text-on-primary' : 'border-border-subtle text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-surface-container border border-border-subtle rounded-xl">
        {device === 'social' ? (
          <div className="w-full max-w-md bg-white rounded-xl border border-border-subtle shadow-xl overflow-hidden">
            <div
              className="h-44 bg-cover bg-center bg-surface-container-low flex items-center justify-center"
              style={coverImageName ? undefined : { backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))" }}
            >
              {!coverImageName && <span className="text-[10px] font-mono font-bold text-on-primary/80 uppercase">No cover image set</span>}
            </div>
            <div className="p-3.5 space-y-1 text-left border-t border-border-subtle">
              <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-wide">
                <Link2 className="w-2.5 h-2.5" /> crowdflow.io
              </div>
              <h2 className="text-sm font-bold text-text-primary leading-tight truncate">{eventName || 'Untitled Event'}</h2>
              <p className="text-xs text-text-secondary leading-snug line-clamp-2">{description || 'No description provided.'}</p>
            </div>
          </div>
        ) : (
          <div
            className={`bg-white rounded-2xl border-4 border-primary shadow-xl overflow-hidden transition-all duration-300 flex flex-col ${
              device === 'mobile' ? 'w-[320px] h-[520px]' :
              device === 'tablet' ? 'w-[520px] h-[440px]' : 'w-full max-w-2xl h-[420px]'
            }`}
          >
            <div
              className="h-36 shrink-0 bg-cover bg-center bg-surface-container-low flex items-center justify-center"
              style={coverImageName ? undefined : { backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))" }}
            >
              {!coverImageName && <span className="text-[10px] font-mono font-bold text-on-primary/80 uppercase">No cover image set</span>}
            </div>

            <div className="p-4 space-y-3 text-left overflow-y-auto flex-1">
              <span className="bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold px-2 py-0.5 rounded inline-block">
                {category}
              </span>
              <h1 className="text-lg font-bold text-text-primary leading-tight">{eventName || 'Untitled Event'}</h1>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>{startDate || 'Date TBA'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  {locationType === 'physical' ? <MapPin className="w-3.5 h-3.5 shrink-0" /> : <Globe2 className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{locationLabel}</span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed font-normal">{description || 'No description provided.'}</p>
            </div>

            <div className="p-4 border-t border-border-subtle shrink-0 flex items-center justify-between gap-3">
              <div>
                <span className="text-[9px] font-mono font-bold text-on-surface-variant uppercase block">{isSoldOut ? 'Status' : 'From'}</span>
                <span className="text-sm font-bold text-text-primary">{isSoldOut ? 'Sold Out' : lowestPrice !== null ? `$${lowestPrice}` : 'Free'}</span>
              </div>
              <button
                disabled={isSoldOut}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  isSoldOut ? 'bg-surface-container text-on-surface-variant cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-white cursor-pointer'
                }`}
              >
                {isSoldOut ? 'Sold Out' : 'Get Ticket'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
