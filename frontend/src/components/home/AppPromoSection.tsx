/**
 * components/home/AppPromoSection.tsx
 *
 * Dark navy "Your Tickets, Always in Hand" mobile app promo band.
 * Matches crowdflow_home Stitch markup: full-bleed bg-primary section,
 * App Store / Google Play buttons, a tilted mock-phone illustration with
 * a QR "scan at gate" card, decorative blurred circle in the corner.
 */

import { Grid3x3, Smartphone, QrCode } from "lucide-react";

export function AppPromoSection() {
  return (
    <section className="relative overflow-hidden bg-primary px-margin-mobile py-section-gap text-white md:px-margin-desktop">
      <div className="mx-auto grid max-w-container-max grid-cols-1 items-center gap-16 md:grid-cols-2">
        <div className="z-10 space-y-8">
          <h2 className="font-headline-xl text-headline-xl font-bold">
            Your Tickets, Always in Hand.
          </h2>
          <p className="font-body-lg text-body-lg text-white/80">
            Download the CrowdFlow app for offline ticket access, instant
            queue updates, and seamless venue entry. Never worry about
            connection issues at the gate again.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-surface-white px-6 py-3 font-label-md text-label-md text-primary transition-colors hover:bg-opacity-90"
            >
              <Grid3x3 size={20} /> App Store
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-surface-white px-6 py-3 font-label-md text-label-md text-primary transition-colors hover:bg-opacity-90"
            >
              <Smartphone size={20} /> Google Play
            </button>
          </div>
        </div>

        {/* Mock phone illustration */}
        <div className="relative z-10 flex justify-center md:justify-end">
          <div className="h-[500px] w-64 translate-y-10 rotate-12 rounded-[40px] border-8 border-surface-container bg-surface-white p-4 shadow-2xl">
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-border-subtle bg-surface">
              <div className="rounded-b-3xl bg-primary p-4 pb-8 text-white">
                <h4 className="font-label-sm text-label-sm opacity-80">
                  Upcoming Event
                </h4>
                <p className="mt-1 font-headline-sm text-headline-sm font-bold">
                  Coldplay
                </p>
              </div>
              <div className="-mt-4 flex-1 p-4">
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
                  <QrCode size={64} className="text-primary" />
                  <p className="mt-4 font-label-sm text-label-sm text-text-secondary">
                    Scan at gate
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative blurred circle */}
      <div className="absolute right-0 top-0 h-[800px] w-[800px] -translate-y-1/2 translate-x-1/3 rounded-full bg-secondary/20 blur-3xl" />
    </section>
  );
}