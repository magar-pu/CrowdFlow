"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Check,
  Shield,
  QrCode,
  LineChart,
  Wallet,
  Users,
  Upload,
  Image as ImageIcon,
  Info,
  ChevronDown,
  Globe,
  Share2,
  Verified,
  FileText,
  Camera,
  Clock,
  Eye,
  Trash2,
  Mail,
  Phone,
  Briefcase
} from "lucide-react";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";

export default function BusinessPage() {
  const [openModal, setOpenModal] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    orgName: "",
    orgType: "",
    orgDesc: "",
    orgWebsite: "",
    orgSocial: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    terms: false,
  });

  useEffect(() => {
    const cards = document.querySelectorAll(".bento-card");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100");
            entry.target.classList.remove("translate-y-[20px]", "opacity-0");
          }
        });
      },
      { threshold: 0.1 }
    );

    cards.forEach((card) => {
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="text-on-background bg-background min-h-screen">
      {/* TopNavBar */}
      <nav className="sticky top-0 z-50 flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto bg-surface/80 backdrop-blur-xl border-b border-border-subtle shadow-sm">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
            CrowdFlow
          </Link>
          <div className="hidden md:flex gap-6">
            <Link className="text-text-secondary hover:text-primary transition-colors font-body-md text-body-md" href="/">
              Home
            </Link>
            <Link className="text-text-secondary hover:text-primary transition-colors font-body-md text-body-md" href="/events">
              Events
            </Link>
            <Link className="text-text-secondary hover:text-primary transition-colors font-body-md text-body-md" href="/resale">
              Resale Marketplace
            </Link>
            <Link className="text-primary font-bold border-b-2 border-primary pb-1 font-body-md text-body-md" href="/business">
              Business
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="px-5 py-2 text-text-secondary font-label-md text-label-md hover:text-primary transition-colors">
            Sign In
          </Link>
          <button
            onClick={() => setOpenModal(true)}
            className="px-6 py-2 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all duration-100"
          >
            Become Organizer
          </button>
        </div>
      </nav>

      {/* Modal Overlay */}
      {openModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Modal Content - max-w-4xl for the detailed layouts */}
          <div className="bg-surface-white w-full max-w-4xl rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-border-subtle flex justify-between items-center bg-surface-container-low/30">
              <div>
                <h2 className="font-headline-md text-headline-md text-text-primary">Become an Organizer</h2>
                <p className="font-body-sm text-body-sm text-text-secondary">Join our enterprise ticketing network</p>
              </div>
              <button onClick={() => { setOpenModal(false); setStep(1); }} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Exact Match Progress Stepper (Blue primary actions) */}
            <div className="px-8 py-8 border-b border-border-subtle bg-surface-container-lowest">
              <div className="relative flex items-center justify-between max-w-2xl mx-auto">
                {/* Background Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border-subtle -translate-y-1/2 -z-0"></div>
                {/* Active Line - Blue */}
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-secondary -translate-y-1/2 transition-all duration-500 z-10"
                  style={{ width: `${(step - 1) * 25}%` }}
                ></div>

                {/* Step 1: Personal */}
                <div className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setStep(1)}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step > 1 ? "bg-secondary text-on-secondary shadow-md ring-4 ring-surface-white" : 
                    step === 1 ? "bg-secondary text-on-secondary ring-4 ring-secondary/20 font-bold" : 
                    "bg-surface-container-highest text-text-secondary border-2 border-border-subtle font-bold"
                  }`}>
                    {step > 1 ? <Check size={20} /> : "1"}
                  </div>
                  <span className={`absolute top-12 text-label-sm md:text-label-md whitespace-nowrap ${step >= 1 ? "font-bold text-primary" : "font-medium text-text-secondary"}`}>Personal</span>
                </div>

                {/* Step 2: Organization */}
                <div className="relative z-10 flex flex-col items-center gap-2" onClick={() => step > 2 && setStep(2)}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step > 2 ? "bg-secondary text-on-secondary shadow-md ring-4 ring-surface-white" : 
                    step === 2 ? "bg-secondary text-on-secondary ring-4 ring-secondary/20 font-bold" : 
                    "bg-surface-container-highest text-text-secondary border-2 border-border-subtle font-bold"
                  }`}>
                    {step > 2 ? <Check size={20} /> : "2"}
                  </div>
                  <span className={`absolute top-12 text-label-sm md:text-label-md whitespace-nowrap ${step >= 2 ? "font-bold text-primary" : "font-medium text-text-secondary"}`}>Organization</span>
                </div>

                {/* Step 3: Documents */}
                <div className="relative z-10 flex flex-col items-center gap-2" onClick={() => step > 3 && setStep(3)}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step > 3 ? "bg-secondary text-on-secondary shadow-md ring-4 ring-surface-white" : 
                    step === 3 ? "bg-secondary text-on-secondary ring-4 ring-secondary/20 font-bold" : 
                    "bg-surface-container-highest text-text-secondary border-2 border-border-subtle font-bold"
                  }`}>
                    {step > 3 ? <Check size={20} /> : "3"}
                  </div>
                  <span className={`absolute top-12 text-label-sm md:text-label-md whitespace-nowrap ${step >= 3 ? "font-bold text-primary" : "font-medium text-text-secondary"}`}>Documents</span>
                </div>

                {/* Step 4: Bank */}
                <div className="relative z-10 flex flex-col items-center gap-2" onClick={() => step > 4 && setStep(4)}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step > 4 ? "bg-secondary text-on-secondary shadow-md ring-4 ring-surface-white" : 
                    step === 4 ? "bg-secondary text-on-secondary ring-4 ring-secondary/20 font-bold" : 
                    "bg-surface-container-highest text-text-secondary border-2 border-border-subtle font-bold"
                  }`}>
                    {step > 4 ? <Check size={20} /> : "4"}
                  </div>
                  <span className={`absolute top-12 text-label-sm md:text-label-md whitespace-nowrap ${step >= 4 ? "font-bold text-primary" : "font-medium text-text-secondary"}`}>Bank</span>
                </div>

                {/* Step 5: Review */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step > 5 ? "bg-secondary text-on-secondary shadow-md ring-4 ring-surface-white" : 
                    step === 5 ? "bg-secondary text-on-secondary ring-4 ring-secondary/20 font-bold" : 
                    "bg-surface-container-highest text-text-secondary border-2 border-border-subtle font-bold"
                  }`}>
                    {step > 5 ? <Check size={20} /> : "5"}
                  </div>
                  <span className={`absolute top-12 text-label-sm md:text-label-md whitespace-nowrap ${step >= 5 ? "font-bold text-primary" : "font-medium text-text-secondary"}`}>Review</span>
                </div>

              </div>
              <div className="h-6"></div> {/* Spacer for absolute text */}
            </div>

            {/* Modal Body */}
            <div className="px-8 py-8 overflow-y-auto bg-surface-bright flex-1">
              {/* Step 1: Personal */}
              {step === 1 && (
                <div className="animate-in fade-in duration-300 max-w-3xl mx-auto">
                  <div className="mb-8">
                    <h3 className="font-headline-md text-headline-md text-text-primary mb-2">Step 1: Personal Information</h3>
                    <p className="font-body-md text-body-md text-text-secondary">Please provide your official contact information. This will be used for administrative communication and account security.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-primary">Full Name</label>
                      <input
                        className="w-full px-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all bg-surface-bright text-body-md"
                        placeholder="e.g. Alexander Hamilton"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-primary">Position / Title</label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all bg-surface-bright text-body-md"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      >
                        <option disabled value="">Select your role</option>
                        <option value="ceo">CEO / Founder</option>
                        <option value="event_manager">Event Manager</option>
                        <option value="ops">Operations Director</option>
                        <option value="marketing">Marketing Lead</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-primary">Business Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all bg-surface-bright text-body-md"
                          placeholder="alex@company.com"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-primary">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all bg-surface-bright text-body-md"
                          placeholder="+1 (555) 000-0000"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Organization */}
              {step === 2 && (
                <div className="animate-in fade-in duration-300 max-w-3xl mx-auto">
                  <div className="mb-8">
                    <h3 className="font-headline-lg text-headline-lg text-text-primary mb-2">Step 2: Organization Details</h3>
                    <p className="font-body-md text-body-md text-text-secondary">Tell us more about your company or event management organization.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                      <label className="font-label-md text-label-md text-text-primary">Organization Name</label>
                      <input
                        className="w-full px-4 py-3 bg-surface-white border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none"
                        placeholder="e.g. Hamilton Events"
                        type="text"
                        value={formData.orgName}
                        onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                      <label className="font-label-md text-label-md text-text-primary">Organization Type</label>
                      <select
                        className="w-full px-4 py-3 bg-surface-white border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none"
                        value={formData.orgType}
                        onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                      >
                        <option disabled value="">Select type...</option>
                        <option>Event Organizer</option>
                        <option>Venue Provider</option>
                        <option>Vendor</option>
                        <option>Government</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="font-label-md text-label-md text-text-primary">Description</label>
                      <textarea
                        className="w-full px-4 py-3 bg-surface-white border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none resize-none"
                        rows={4}
                        placeholder="Briefly describe your organization's mission and event history..."
                        value={formData.orgDesc}
                        onChange={(e) => setFormData({ ...formData, orgDesc: e.target.value })}
                      ></textarea>
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                      <label className="font-label-md text-label-md text-text-primary">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3.5 text-text-secondary" size={20} />
                        <input
                          className="w-full pl-11 pr-4 py-3 bg-surface-white border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none"
                          placeholder="https://www.hamiltonevents.com"
                          type="url"
                          value={formData.orgWebsite}
                          onChange={(e) => setFormData({ ...formData, orgWebsite: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                      <label className="font-label-md text-label-md text-text-primary">Instagram</label>
                      <div className="relative">
                        <Camera className="absolute left-3 top-3.5 text-text-secondary" size={20} />
                        <input
                          className="w-full pl-11 pr-4 py-3 bg-surface-white border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none"
                          placeholder="@hamilton_events"
                          type="text"
                          value={formData.orgSocial}
                          onChange={(e) => setFormData({ ...formData, orgSocial: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 p-4 bg-primary-container/5 border-l-4 border-secondary rounded-r-lg">
                    <div className="flex gap-3">
                      <Info className="text-secondary shrink-0" size={24} />
                      <p className="font-body-sm text-body-sm text-on-primary-container">
                        These details will be shown on your public organizer profile. You can update these anytime in your Business Settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Documents (Bento Layout Exact) */}
              {step === 3 && (
                <div className="animate-in fade-in duration-300">
                  <div className="mb-10">
                    <h2 className="font-headline-lg text-headline-lg text-text-primary">Documents Verification</h2>
                    <p className="font-body-md text-body-md text-text-secondary mt-2">
                      Please upload the required legal documentation for our compliance team and certified auditors to review. This ensures the integrity of the CrowdFlow ecosystem.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Top Left (Large): Government ID & Selfie Verification */}
                    <div className="md:col-span-2 space-y-6">
                      {/* Government ID Card */}
                      <div className="bg-white p-6 rounded-[20px] border border-border-subtle shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-headline-sm text-headline-sm">Government ID</h3>
                          <Check className="text-success" size={24} />
                        </div>
                        <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary-container/10 flex items-center justify-center rounded-lg text-primary">
                              <FileText size={24} />
                            </div>
                            <div>
                              <p className="font-body-md font-bold text-text-primary">KTP_Richie.pdf</p>
                              <p className="font-label-sm text-text-secondary">2.4 MB • Oct 24, 2023</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="p-2 hover:bg-surface-container rounded-lg transition-colors">
                              <Eye className="text-primary" size={20} />
                            </button>
                            <button className="p-2 hover:bg-danger/5 rounded-lg transition-colors">
                              <Trash2 className="text-danger" size={20} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Selfie Verification Card */}
                      <div className="bg-white p-6 rounded-[20px] border border-border-subtle shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-headline-sm text-headline-sm">Selfie Verification</h3>
                          <div className="w-6 h-6 rounded-full border-2 border-border-subtle"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border-2 border-dashed border-border-subtle rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-secondary hover:bg-secondary/5 transition-all">
                            <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center text-primary mb-4">
                              <Camera size={24} />
                            </div>
                            <p className="font-label-md font-bold text-text-primary">Take or Upload Selfie</p>
                            <p className="text-body-sm text-text-secondary mt-1">Holding your ID card clearly</p>
                          </div>
                          <div className="bg-surface-container-low p-6 rounded-xl">
                            <h4 className="font-label-sm font-bold text-text-primary mb-4">Tips for Success</h4>
                            <ul className="space-y-3">
                              <li className="flex items-start gap-2">
                                <Check className="text-success shrink-0 mt-0.5" size={16} />
                                <span className="text-body-sm text-text-secondary">Ensure face is fully visible without hats or sunglasses.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="text-success shrink-0 mt-0.5" size={16} />
                                <span className="text-body-sm text-text-secondary">ID details must be readable in the photo.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="text-success shrink-0 mt-0.5" size={16} />
                                <span className="text-body-sm text-text-secondary">Use a plain background and good lighting.</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Right (Vertical): Verification Status & Security */}
                    <div className="md:col-span-1 space-y-6">
                      {/* Status Panel */}
                      <div className="bg-white p-6 rounded-[20px] border border-border-subtle shadow-sm h-full flex flex-col">
                        <h4 className="font-label-md font-bold text-text-primary mb-6">Verification Panel</h4>
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-3 p-3 bg-success/5 rounded-lg">
                            <Check className="text-success" size={20} />
                            <span className="text-body-sm font-medium">ID Uploaded</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                            <div className="w-5 h-5 rounded-full border-2 border-border-subtle"></div>
                            <span className="text-body-sm text-text-secondary">Legal Docs Incomplete</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                            <div className="w-5 h-5 rounded-full border-2 border-border-subtle"></div>
                            <span className="text-body-sm text-text-secondary">Selfie Pending</span>
                          </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-border-subtle">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="text-secondary" size={16} />
                            <p className="font-label-sm font-bold">1-7 Business Days</p>
                          </div>
                          <p className="text-[11px] text-text-secondary">Estimated review time for business accounts.</p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Organization Documents */}
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* NIB Card */}
                      <div className="bg-white p-6 rounded-[20px] border border-border-subtle shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 bg-primary-container/10 rounded-lg flex items-center justify-center text-primary">
                            <FileText size={24} />
                          </div>
                          <span className="text-label-sm font-bold text-secondary">65%</span>
                        </div>
                        <p className="font-label-md font-bold mb-1">NIB Document</p>
                        <p className="text-[11px] text-text-secondary mb-4 truncate">nib_corporate_final.pdf</p>
                        <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                          <div className="bg-secondary h-full rounded-full" style={{ width: "65%" }}></div>
                        </div>
                      </div>
                      {/* SIUP/NPWP Grid */}
                      <div className="bg-white p-6 rounded-[20px] border border-border-subtle shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center text-text-secondary">
                            <Upload size={24} />
                          </div>
                          <div>
                            <p className="font-label-md font-bold">SIUP & NPWP</p>
                            <p className="text-[11px] text-text-secondary">Required for verification</p>
                          </div>
                        </div>
                        <button className="w-full py-2 border border-border-subtle rounded-lg text-label-sm font-bold hover:bg-surface-container transition-colors">
                          Upload Files
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Bank */}
              {step === 4 && (
                <div className="animate-in fade-in duration-300 max-w-3xl mx-auto">
                  <div className="mb-8">
                    <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Step 4: Bank Details</h3>
                    <p className="font-body-md text-body-md text-text-secondary">Where should we send your ticket sales revenue?</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-primary">Bank Name</label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all bg-surface-bright text-body-md"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      >
                        <option value="">Select bank</option>
                        <option>Bank Mandiri</option>
                        <option>BCA</option>
                        <option>BNI</option>
                        <option>Bank Rakyat Indonesia</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-primary">Account Holder Name</label>
                      <input
                        className="w-full px-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all bg-surface-bright text-body-md"
                        type="text"
                        value={formData.accountHolder}
                        onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-primary">Account Number</label>
                      <input
                        className="w-full px-4 py-3 rounded-lg border border-border-subtle focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all bg-surface-bright text-body-md"
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {step === 5 && (
                <div className="animate-in fade-in duration-300 max-w-3xl mx-auto">
                  <div className="mb-8">
                    <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Step 5: Review & Submit</h3>
                    <p className="font-body-md text-body-md text-text-secondary">Please review your information before final submission.</p>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-surface-container-low border border-border-subtle rounded-xl p-6 space-y-4 shadow-sm">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <span className="block text-[11px] uppercase font-bold text-text-secondary mb-1">Name</span>
                          <span className="font-body-md text-body-md font-medium">{formData.name || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] uppercase font-bold text-text-secondary mb-1">Organization</span>
                          <span className="font-body-md text-body-md font-medium">{formData.orgName || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] uppercase font-bold text-text-secondary mb-1">Email</span>
                          <span className="font-body-md text-body-md font-medium">{formData.email || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] uppercase font-bold text-text-secondary mb-1">Bank Account</span>
                          <span className="font-body-md text-body-md font-medium">{formData.accountNumber || "-"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mt-6">
                      <input
                        className="mt-1 w-5 h-5 rounded border-border-subtle text-primary focus:ring-secondary cursor-pointer"
                        type="checkbox"
                        checked={formData.terms}
                        onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                      />
                      <label className="font-body-sm text-body-sm text-text-secondary cursor-pointer" onClick={() => setFormData({ ...formData, terms: !formData.terms })}>
                        I hereby confirm that all information provided is accurate and I agree to CrowdFlow's Organizer Terms of Service and Privacy Policy.
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Blue buttons matching HTML */}
            <div className="px-8 py-6 border-t border-border-subtle bg-surface-white flex justify-between gap-4">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 border border-border-subtle bg-surface-white rounded-lg font-label-md text-label-md hover:bg-surface-container transition-all shadow-sm flex items-center gap-2"
                >
                  <ChevronDown className="rotate-90" size={18} />
                  Previous
                </button>
              ) : <div></div>}
              
              <div className="flex gap-4">
                <button
                  className="px-6 py-3 text-secondary border border-secondary rounded-lg font-bold hover:bg-secondary/5 active:scale-95 transition-all flex items-center gap-2 font-label-md text-label-md hidden sm:flex"
                >
                  Save Draft
                </button>
                {step < 5 && (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="px-8 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2"
                  >
                    Next Step
                    <ChevronDown className="-rotate-90" size={18} />
                  </button>
                )}
                {step === 5 && (
                  <button
                    disabled={!formData.terms}
                    onClick={() => {
                      setOpenModal(false);
                      setStep(1);
                    }}
                    className="px-8 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <header className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: "radial-gradient(#0F172A 0.5px, transparent 0.5px)", backgroundSize: "24px 24px", opacity: 0.05 }}></div>
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
          <div className="space-y-stack-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 text-secondary rounded-full border border-secondary/20">
              <Verified size={18} />
              <span className="font-label-sm text-label-sm uppercase tracking-wider">Enterprise Grade Platform</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-text-primary leading-tight">Grow Your Event with CrowdFlow</h1>
            <p className="font-body-lg text-body-lg text-text-secondary max-w-xl">
              Secure Ticketing. Seamless Events. Join thousands of organizers scaling their reach with the world's most advanced ticketing infrastructure.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => setOpenModal(true)}
                className="px-8 py-4 bg-primary text-on-primary rounded-lg font-label-md text-label-md shadow-lg hover:shadow-xl transition-all inline-block"
              >
                Become Organizer
              </button>
              <button className="px-8 py-4 border border-border-subtle bg-white text-text-primary rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-all">
                View Demo
              </button>
            </div>
          </div>
          <div className="relative group">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-border-subtle opacity-0 translate-y-[20px] transition-all duration-700 bento-card group-hover:scale-[1.01]">
              <img
                className="w-full aspect-video object-cover"
                alt="Concert scene"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFJnXs6YrLQbCkX454-1BFTwGbxkDJD8tJylOBF8pfSZWRmjkEKVSk-ewewbqq6d7qme1tJoLHPyMWMQLyQ5uzStjn7Ttv1DohI8HELGV37hNPsBAWGeFHfOP-cUN0Vy4We-HD16tv8gZvmsS8u-PRG3XIRJghP4ym77bjjNT4fSbrL0BOe-ioJE34Tc2K5sMkJLKj9NWEap05-ndAZIMCmTNHxhrAiJA--P02yOvIYrjcov56ak4LPYjAICS42_xYffNeVDMlWEMX"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 z-20 glass-card p-6 rounded-xl shadow-xl max-w-[240px]">
              <div className="flex items-center gap-3 mb-2">
                <LineChart className="text-success" size={24} />
                <span className="font-label-md text-label-md">Real-time Sales</span>
              </div>
              <div className="font-headline-md text-headline-md text-text-primary">$42,904.00</div>
              <div className="text-success font-label-sm text-label-sm">+12% from yesterday</div>
            </div>
          </div>
        </div>
      </header>

      {/* Statistics Section */}
      <section className="py-16 bg-white border-y border-border-subtle">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { val: "12k+", label: "Verified Organizers" },
              { val: "450k", label: "Total Events" },
              { val: "8.2M", label: "Tickets Sold" },
              { val: "$1.4B", label: "Monthly Revenue" },
            ].map((stat, i) => (
              <div key={i} className="text-center md:text-left group cursor-pointer">
                <div className="font-headline-lg text-headline-lg text-text-primary mb-1 group-hover:-translate-y-1 transition-transform duration-200">{stat.val}</div>
                <div className="font-label-md text-label-md text-text-secondary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid (Bento Style) */}
      <section className="py-section-gap max-w-container-max mx-auto px-margin-desktop">
        <div className="text-center mb-16">
          <h2 className="font-headline-lg text-headline-lg text-text-primary mb-4">Powerful Features for Growth</h2>
          <p className="font-body-md text-body-md text-text-secondary">Everything you need to manage ticketing at any scale.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Large Card */}
          <div className="md:col-span-2 bg-white p-10 rounded-2xl border border-border-subtle flex flex-col md:flex-row gap-8 items-center group hover:shadow-md bento-card opacity-0 translate-y-[20px] transition-all duration-700">
            <div className="flex-1 space-y-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
                <Shield size={24} />
              </div>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">Secure Ticketing</h3>
              <p className="font-body-md text-body-md text-text-secondary">
                Our military-grade encryption and blockchain-backed validation ensure every ticket is unique and impossible to forge. Protect your revenue and your fans.
              </p>
            </div>
            <div className="flex-1 bg-surface rounded-xl p-4 border border-border-subtle overflow-hidden">
              <img
                className="rounded-lg shadow-sm"
                alt="Security"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoAfXtegtbdUNte26er9eySfFOdG4Xeb0sLsSnrSaRgndu_JzhSdEnbH5HQn80KKGc_GqcsgagwMX5C1gNHGoEUL4KDhcSrvHzvlzubjgFJN33HTdGahYUgLRiex_j-5Y5jlk24HKJXLHsuXVidL48ebiSiKEsQJBWZAXnkZI3RWg91TeoEaf62lmfj_d_EJDf7fhME0Jv0XtZ86VBZYmA0rirbOPbjIMsFc-HqF57F9YBeB72pgVPexZLhmg7OXj4nXVRt92wANoN"
              />
            </div>
          </div>
          {/* Small Card */}
          <div className="bg-primary text-on-primary p-10 rounded-2xl flex flex-col justify-between hover:scale-[1.02] bento-card opacity-0 translate-y-[20px] transition-all duration-700">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <QrCode className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm mb-2">QR Ticket</h3>
              <p className="font-body-sm text-body-sm opacity-80">Instant entry with dynamic QR codes that refresh every 30 seconds to prevent screenshot fraud.</p>
            </div>
          </div>
          {/* Standard Card 1 */}
          <div className="bg-white p-10 rounded-2xl border border-border-subtle hover:shadow-md bento-card opacity-0 translate-y-[20px] transition-all duration-700">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center text-success mb-6">
              <LineChart size={24} />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Analytics</h3>
            <p className="font-body-md text-body-md text-text-secondary">Real-time data visualization of sales, attendee demographics, and marketing ROI.</p>
          </div>
          {/* Standard Card 2 */}
          <div className="bg-white p-10 rounded-2xl border border-border-subtle hover:shadow-md bento-card opacity-0 translate-y-[20px] transition-all duration-700">
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center text-warning mb-6">
              <Wallet size={24} />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Fast Payouts</h3>
            <p className="font-body-md text-body-md text-text-secondary">Get your ticket revenue faster. We support automated daily payouts for verified enterprise accounts.</p>
          </div>
          {/* Standard Card 3 */}
          <div className="bg-white p-10 rounded-2xl border border-border-subtle hover:shadow-md bento-card opacity-0 translate-y-[20px] transition-all duration-700">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6">
              <Users size={24} />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">CRM Tools</h3>
            <p className="font-body-md text-body-md text-text-secondary">Direct communication channels with your ticket buyers for announcements and loyalty programs.</p>
          </div>
        </div>
      </section>

      {/* How It Works (6-step) */}
      <section className="py-section-gap bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-text-primary mb-4">How It Works</h2>
            <p className="font-body-md text-body-md text-text-secondary">Launch your next massive event in six simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 gap-x-8 relative">
            {[
              { num: 1, title: "Onboard", desc: "Create your business profile and verify your organization status within minutes." },
              { num: 2, title: "Create Event", desc: "Use our AI venue builder or upload custom seating charts for your specific venue." },
              { num: 3, title: "Set Pricing", desc: "Configure tiers, early bird specials, and VIP bundles with dynamic pricing options." },
              { num: 4, title: "Promote", desc: "Leverage our internal marketplace and partner network to drive initial ticket sales." },
              { num: 5, title: "Check-in", desc: "Use the CrowdFlow Staff App for zero-latency QR scanning and entry management." },
              { num: 6, title: "Settle", desc: "Automated reporting and revenue payouts directly to your linked bank account." },
            ].map((step) => (
              <div key={step.num} className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">{step.num}</div>
                  <h4 className="font-headline-sm text-headline-sm">{step.title}</h4>
                </div>
                <p className="font-body-md text-body-md text-text-secondary">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-section-gap max-w-3xl mx-auto px-margin-mobile">
        <div className="text-center mb-12">
          <h2 className="font-headline-lg text-headline-lg text-text-primary mb-4">Frequently Asked Questions</h2>
          <p className="font-body-md text-body-md text-text-secondary">Everything you need to know about partnering with CrowdFlow.</p>
        </div>
        <div className="space-y-4">
          {[
            { q: "What are the platform fees?", a: "We offer a competitive tiered pricing model. Standard events pay 2.5% + $0.99 per ticket sold. Enterprise partners with high volumes are eligible for customized lower rates and dedicated account management.", defaultOpen: true },
            { q: "How do you prevent ticket scalping?", a: 'Our platform uses dynamic QR codes and a proprietary "Safe-Transfer" mechanism. Tickets can only be resold through our official marketplace at capped prices, effectively eliminating the incentive for professional scalpers.' },
            { q: "Is there a limit on event size?", a: "No. Our infrastructure is built on cloud-native technology that has successfully handled festivals with over 200,000 attendees and high-velocity \"drop\" sales where millions of users access the site simultaneously." },
            { q: "How do payouts work?", a: "Once an organizer is verified, revenue from sales is settled every 48 hours for past sales or held until the event completion depending on your account tier. Funds are transferred via ACH, Wire, or SWIFT." },
          ].map((faq, idx) => (
            <details key={idx} className="group bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm" open={faq.defaultOpen}>
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="font-headline-sm text-headline-sm text-text-primary">{faq.q}</span>
                <ChevronDown className="transition-transform group-open:rotate-180" size={24} />
              </summary>
              <div className="p-6 pt-0 font-body-md text-body-md text-text-secondary border-t border-border-subtle bg-surface/30">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <HomeFooterV3 />
    </div>
  );
}
