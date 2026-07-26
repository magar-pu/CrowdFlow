import Link from "next/link";

export function HomeFooterV3() {
  return (
    <footer className="w-full bg-surface-white border-t border-border-subtle text-text-primary">
      {/* Main Footer Content */}
      <div className="py-16 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
          
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="text-2xl font-bold text-primary mb-6 block">
              CrowdFlow
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed">
              Your trusted event ticketing platform with real-time identity verification technology. Discover and book your favorite events securely.
            </p>
          </div>
          
          {/* Explore */}
          <div className="lg:col-span-2">
            <h5 className="text-sm font-bold text-text-primary mb-6">Explore</h5>
            <ul className="space-y-3">
              <li><Link href="/" className="text-sm text-text-secondary hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/events" className="text-sm text-text-secondary hover:text-primary transition-colors">Events</Link></li>
              <li><Link href="/resale" className="text-sm text-text-secondary hover:text-primary transition-colors">Resale Marketplace</Link></li>
              <li><Link href="/business" className="text-sm text-text-secondary hover:text-primary transition-colors">Business</Link></li>
            </ul>
          </div>
          
          {/* Account */}
          <div className="lg:col-span-3">
            <h5 className="text-sm font-bold text-text-primary mb-6">Account</h5>
            <ul className="space-y-3">
              <li><Link href="/profile" className="text-sm text-text-secondary hover:text-primary transition-colors">Profile</Link></li>
              <li><Link href="/orders" className="text-sm text-text-secondary hover:text-primary transition-colors">My Orders</Link></li>
              <li><Link href="/profile/history" className="text-sm text-text-secondary hover:text-primary transition-colors">Ticket History</Link></li>
              <li><Link href="/profile/payments" className="text-sm text-text-secondary hover:text-primary transition-colors">Payment Methods</Link></li>
            </ul>
          </div>

        
          
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="py-8 px-6 lg:px-16 border-t border-border-subtle bg-surface-container">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-text-secondary text-xs">© 2026 CrowdFlow Events &amp; Ticketing. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
