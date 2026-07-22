/**
 * components/event-detail/AboutEventSection.tsx
 *
 * "About This Event" card — description paragraphs + "Important
 * Information" bullet list. Matches Stitch markup exactly.
 */

import { Info } from "lucide-react";

interface AboutEventSectionProps {
  description: string;
  important_info: string[];
}

export function AboutEventSection({
  description,
  important_info,
}: AboutEventSectionProps) {
  const paragraphs = description.split("\n\n").filter(Boolean);

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] md:p-8">
      <h2 className="mb-6 flex items-center gap-3 font-headline-md text-headline-md font-bold text-primary">
        <Info size={24} className="text-secondary" />
        About This Event
      </h2>
      <div className="space-y-4 font-body-md text-body-md text-on-surface-variant">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}

        {important_info.length > 0 && (
          <>
            <h4 className="mb-2 mt-6 font-label-md text-label-md text-primary">
              Important Information
            </h4>
            <ul className="list-disc space-y-2 pl-5 text-body-sm">
              {important_info.map((info, index) => (
                <li key={index}>{info}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}