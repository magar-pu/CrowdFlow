/**
 * components/waiting-room/QueueHeader.tsx
 *
 * Minimal top bar for the waiting room: brand + event name, no nav links
 * (intentionally — the queue is a focused, distraction-free holding page,
 * unlike the full Navbar used elsewhere).
 */

interface QueueHeaderProps {
    event_title: string;
  }
  
  export function QueueHeader({ event_title }: QueueHeaderProps) {
    return (
      <header className="flex w-full items-center justify-center border-b border-border-subtle px-margin-desktop py-4">
        <div className="flex items-center gap-3">
          <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
            CrowdFlow
          </span>
          <div className="h-5 w-px bg-border-subtle" />
          <span className="font-label-md text-label-md text-text-secondary">
            {event_title}
          </span>
        </div>
      </header>
    );
  }