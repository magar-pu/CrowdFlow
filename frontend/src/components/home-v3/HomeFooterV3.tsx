import Link from "next/link";
import { Globe, Camera, X, PlayCircle } from "lucide-react";

export function HomeFooterV3() {
  return (
    <footer className="w-full bg-surface-white border-t border-border-subtle text-on-surface">
      {/* Main Footer Content */}
      <div className="py-16 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
          
          {/* Brand & Socials */}
          <div className="lg:col-span-3">
            <Link href="/" className="text-2xl font-display font-bold text-accent-blue mb-6 block">
              CrowdFlow
            </Link>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
              Your trusted partner for discovering and booking the world's most amazing experiences.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-on-surface-variant hover:text-accent-blue transition-colors">
                <Globe size={24} />
              </a>
              <a href="#" className="text-on-surface-variant hover:text-accent-blue transition-colors">
                <Camera size={24} />
              </a>
              <a href="#" className="text-on-surface-variant hover:text-accent-blue transition-colors">
                <X size={24} />
              </a>
              <a href="#" className="text-on-surface-variant hover:text-accent-blue transition-colors">
                <PlayCircle size={24} />
              </a>
            </div>
          </div>
          
          {/* Products */}
          <div className="lg:col-span-2">
            <h5 className="text-sm font-bold text-on-surface mb-6">Products</h5>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Tours &amp; Activities</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Event Tickets</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Attractions</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Transport</a></li>
            </ul>
          </div>
          
          {/* Support */}
          <div className="lg:col-span-2">
            <h5 className="text-sm font-bold text-on-surface mb-6">Support</h5>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Help Center</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Terms &amp; Conditions</a></li>
            </ul>
          </div>
          
          {/* About */}
          <div className="lg:col-span-2">
            <h5 className="text-sm font-bold text-on-surface mb-6">About CrowdFlow</h5>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Our Story</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Careers</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-accent-blue transition-colors">Partnership</a></li>
            </ul>
          </div>
          
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="py-8 px-6 lg:px-16 border-t border-border-subtle bg-surface">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-on-surface-variant text-xs">© 2026 CrowdFlow Events &amp; Ticketing. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-on-surface-variant hover:text-accent-blue transition-colors">Terms of Use</a>
            <a href="#" className="text-xs text-on-surface-variant hover:text-accent-blue transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-on-surface-variant hover:text-accent-blue transition-colors">Cookie Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
