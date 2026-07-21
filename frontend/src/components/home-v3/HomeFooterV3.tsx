import Link from "next/link";
import { Globe, Camera, X, PlayCircle } from "lucide-react";

export function HomeFooterV3() {
  return (
    <footer className="w-full bg-surface-white border-t border-border-subtle text-text-primary">
      {/* Main Footer Content */}
      <div className="py-16 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
          
          {/* Brand & Socials */}
          <div className="lg:col-span-3">
            <Link href="/" className="text-2xl font-bold text-primary mb-6 block">
              CrowdFlow
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed mb-8">
              Your trusted partner for discovering and booking the world's most amazing experiences.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                <Globe size={24} />
              </a>
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                <Camera size={24} />
              </a>
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                <X size={24} />
              </a>
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                <PlayCircle size={24} />
              </a>
            </div>
          </div>
          
          {/* Products */}
          <div className="lg:col-span-3">
            <h5 className="text-sm font-bold text-text-primary mb-6">Products</h5>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Tours &amp; Activities</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Event Tickets</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Attractions</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Transport</a></li>
            </ul>
          </div>
          
          {/* Support */}
          <div className="lg:col-span-3">
            <h5 className="text-sm font-bold text-text-primary mb-6">Support</h5>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Terms &amp; Conditions</a></li>
            </ul>
          </div>
          
          {/* About */}
          <div className="lg:col-span-3">
            <h5 className="text-sm font-bold text-text-primary mb-6">About CrowdFlow</h5>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Our Story</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-primary transition-colors">Partnership</a></li>
            </ul>
          </div>
          
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="py-8 px-6 lg:px-16 border-t border-border-subtle bg-surface-container">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-text-secondary text-xs">© 2026 CrowdFlow Events &amp; Ticketing. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-text-secondary hover:text-primary transition-colors">Terms of Use</a>
            <a href="#" className="text-xs text-text-secondary hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-text-secondary hover:text-primary transition-colors">Cookie Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
