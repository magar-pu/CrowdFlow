/**
 * components/home-v2/NewsletterBanner.tsx
 *
 * Dark navy newsletter signup band.
 * Mobile: stacked layout, full-width button.
 * Desktop: side-by-side.
 */

"use client";

import { useState } from "react";

export function NewsletterBanner() {
  const [email, set_email] = useState("");

  function handle_subscribe(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST /api/v1/newsletter/subscribe
    console.log("Newsletter subscribe:", email);
    set_email("");
  }

  return (
    <section className="bg-primary py-10 md:py-12">
      <div className="mx-auto flex max-w-container-max flex-col gap-6 px-margin-mobile md:flex-row md:items-center md:justify-between md:gap-8 md:px-margin-desktop">
        {/* Copy */}
        <div className="text-center md:text-left">
          <h2 className="mb-2 text-lg font-bold text-white md:font-headline-md md:text-headline-md">
            Stay Updated with the Latest Promos
          </h2>
          <p className="text-sm text-white/70 md:font-body-md md:text-body-md">
            Get exclusive event info and special discounts directly in your inbox.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handle_subscribe}
          className="flex w-full flex-col gap-2 sm:flex-row md:w-auto"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => set_email(e.target.value)}
            placeholder="Your email address"
            className="w-full rounded-lg border-none bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-secondary sm:flex-1 md:w-80"
          />
          <button
            type="submit"
            className="w-full shrink-0 rounded-lg bg-secondary px-8 py-3 font-label-md text-label-md text-white transition-all hover:brightness-110 active:scale-95 sm:w-auto"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}