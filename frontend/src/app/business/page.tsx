"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooterV2 } from "@/components/home-v2/HomeFooterV2";
import { useAuthStore } from "@/lib/store/authStore";
import { applyOrganizer, getOrganizerApplication, updateOrganizerApplication, deleteOrganizerApplication, OrganizerApplicationResponse } from "@/lib/api/organizer";
import { getMe } from "@/lib/api/auth";
import { CheckCircle2, AlertTriangle, Clock, RefreshCw, Trash2, Building, Mail, Phone, Globe, FileText, UploadCloud, AlertCircle } from "lucide-react";
import { Turnstile } from "@/components/common/Turnstile";
// Shared with the Business Documents card in organizer Settings, which files
// the same paperwork against the same server-side caps.
//
// MAX_REQUEST_BYTES matters HERE and nowhere else: this form submits up to four
// documents in one request, so four individually legal files can still be
// rejected together — and that rejection happens in ParseMultipartForm, before
// any per-file check runs, so the server can only answer with a generic "too
// large or malformed" that names no file. Checking the total below is the only
// place the user can be told which files to trim.
import {
  ACCEPT,
  MAX_REQUEST_BYTES,
  MAX_REQUEST_MB,
  compressImageIfNeeded,
  criteriaForType,
  formatSize,
  maxFileMBForType,
  validateDocument,
} from "@/lib/documentUpload";

type DocumentSlot = "ktp" | "npwp" | "nib" | "siup";

/**
 * The marketing hero for /business.
 *
 * Shown to everyone. It used to render only for signed-out visitors, so
 * signing in replaced the pitch with a bare application form and a returning
 * organizer never saw the page the site links to. Only the call to action
 * changes with who is looking.
 */
function BusinessLandingHero({
  cta_label,
  on_cta,
}: {
  cta_label: string;
  on_cta: () => void;
}) {
  return (
    <section className="flex flex-col items-center px-6 py-20 text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-semibold text-secondary">
          CrowdFlow Business Dashboard
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
          Host and Manage Your Events at Scale
        </h1>
        <p className="text-lg text-text-secondary">
          Verify your business account, create custom seating charts, sell tickets with
          high concurrency, and request real-time payouts directly to your local
          Indonesian bank account.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={on_cta}
            className="cursor-pointer rounded-lg bg-primary px-8 py-3 font-semibold text-white shadow transition-all duration-250 hover:bg-primary/95"
          >
            {cta_label}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function BusinessPage() {
  const router = useRouter();
  const { user, is_authenticated, set_user_from_api } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [application, setApplication] = useState<OrganizerApplicationResponse | null>(null);
  
  // Form States
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Individual");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  
  // Document File States
  const [ktp, setKtp] = useState<File | null>(null);
  const [npwp, setNpwp] = useState<File | null>(null);
  const [nib, setNib] = useState<File | null>(null);
  const [siup, setSiup] = useState<File | null>(null);
  /** Per-slot rejection reason, so the message sits beside the offending file. */
  const [docErrors, setDocErrors] = useState<Partial<Record<DocumentSlot, string>>>({});

  // Error & Success Feedback
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  /** Scroll target for the hero CTA, which sits above the application. */
  const application_ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (is_authenticated) {
      fetchApplication();
    } else {
      setLoading(false);
    }
  }, [is_authenticated]);

  async function fetchApplication() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await getOrganizerApplication();
      if (res.success && res.data) {
        setApplication(res.data);
        // Pre-fill form fields in case they want to edit (rejected application / needs revision)
        setBusinessName(res.data.business_name);
        setBusinessType(res.data.business_type);
        setBusinessEmail(res.data.business_email);
        setBusinessPhone(res.data.business_phone);
        setWebsite(res.data.website || "");
        setDescription(res.data.description || "");
        setBankName(res.data.bank_name || "");
        setBankAccountHolder(res.data.bank_account_holder || "");
        setBankAccountNumber(res.data.bank_account_number || "");
        setBusinessAddress(res.data.business_address || "");
        
        // If approved, refresh session context to fetch role changes
        if (res.data.status === "approved" && user?.role !== "verified_organizer") {
          const profileRes = await getMe();
          if (profileRes.success && profileRes.data) {
            set_user_from_api(profileRes.data);
          }
        }
      } else {
        setApplication(null);
      }
    } catch (err) {
      console.error("Failed to fetch application status:", err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Validates a freshly picked file and stores it only if it passes.
   *
   * A rejected file clears the slot rather than keeping the previous
   * selection: leaving the old file in place while showing an error reads as
   * "your new file was accepted" on the next glance.
   */
  const handlePickDocument = async (
    slot: DocumentSlot,
    setter: (f: File | null) => void,
    pickedFile: File | null
  ) => {
    setErrorMsg("");
    if (!pickedFile) {
      setter(null);
      setDocErrors((prev) => ({ ...prev, [slot]: undefined }));
      return;
    }
    // Shrink phone-photo-sized images before the size check, so a 4MB photo
    // succeeds silently instead of being rejected and handed back to the
    // user to compress by hand. PDFs pass through untouched.
    const file = await compressImageIfNeeded(pickedFile);
    const problem = validateDocument(file, slot.toUpperCase());
    setDocErrors((prev) => ({ ...prev, [slot]: problem ?? undefined }));
    setter(problem ? null : file);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setActionLoading(true);

    if (!ktp && !application) {
      setErrorMsg("KTP document is required for verification.");
      setActionLoading(false);
      return;
    }

    // The combined cap. Enforced only at submit time because it is a property
    // of the request, not of any one file — no single pick can be blamed for
    // it, and the fix is to drop or shrink one of several.
    const selected: [string, File | null][] = [
      ["KTP", ktp],
      ["NPWP", npwp],
      ["NIB", nib],
      ["SIUP", siup],
    ];
    const attached = selected.filter((entry): entry is [string, File] => entry[1] !== null);
    const totalBytes = attached.reduce((sum, [, file]) => sum + file.size, 0);
    if (totalBytes > MAX_REQUEST_BYTES) {
      const breakdown = attached.map(([label, file]) => `${label} ${formatSize(file.size)}`).join(", ");
      setErrorMsg(
        `Your documents total ${formatSize(totalBytes)}, over the ${MAX_REQUEST_MB}MB limit for one submission (${breakdown}). ` +
          `Each file may be up to ${maxFileMBForType("KTP")}MB, but they are uploaded together. Remove or compress one and try again.`
      );
      setActionLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("business_name", businessName);
    formData.append("business_type", businessType);
    formData.append("business_email", businessEmail);
    formData.append("business_phone", businessPhone);
    formData.append("website", website);
    formData.append("description", description);
    formData.append("bank_name", bankName);
    formData.append("bank_account_holder", bankAccountHolder);
    formData.append("bank_account_number", bankAccountNumber);
    formData.append("business_address", businessAddress);
    if (turnstileToken) formData.append("turnstile_token", turnstileToken);
    
    if (ktp) formData.append("ktp", ktp);
    if (npwp) formData.append("npwp", npwp);
    if (nib) formData.append("nib", nib);
    if (siup) formData.append("siup", siup);

    try {
      let res;
      if (application && (application.status === "rejected" || application.status === "needs_revision")) {
        res = await updateOrganizerApplication(formData);
      } else {
        res = await applyOrganizer(formData);
      }

      if (res.success && res.data) {
        setSuccessMsg("Your application was submitted successfully!");
        setApplication(res.data);
        setKtp(null);
        setNpwp(null);
        setNib(null);
        setSiup(null);
        setDocErrors({});
      } else {
        setErrorMsg(res.error?.message || "Failed to submit application. Please try again.");
      }
    } catch (err) {
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelApplication = async () => {
    if (!window.confirm("Are you sure you want to cancel and delete your application?")) return;
    setErrorMsg("");
    setSuccessMsg("");
    setActionLoading(true);
    try {
      const res = await deleteOrganizerApplication();
      if (res.success) {
        setSuccessMsg("Your application has been cancelled.");
        setApplication(null);
        // Reset form
        setBusinessName("");
        setBusinessType("Individual");
        setBusinessEmail("");
        setBusinessPhone("");
        setWebsite("");
        setDescription("");
      } else {
        setErrorMsg(res.error?.message || "Failed to cancel application.");
      }
    } catch (err) {
      setErrorMsg("Connection error.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar active_href="/business" />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-secondary h-8 w-8" />
            <p className="text-text-secondary text-sm">Loading application status...</p>
          </div>
        </main>
        <HomeFooterV2 />
      </div>
    );
  }

  // Case A: not signed in — the hero alone, with the CTA sending them to log in
  // first. Everything below the hero needs an account.
  if (!is_authenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar active_href="/business" />
        <main className="flex-1">
          <BusinessLandingHero
            cta_label="Apply to Become Organizer"
            on_cta={() => router.push("/login?from=/business")}
          />
        </main>
        <HomeFooterV2 />
      </div>
    );
  }

  // Case B: User is already verified organizer
  if (user?.role === "verified_organizer") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar active_href="/business" />
        <BusinessLandingHero
          cta_label="Enter Organizer Dashboard"
          on_cta={() => router.push("/organizer")}
        />
        <main className="flex-1 flex flex-col justify-center items-center pb-20 px-6">
          <div className="max-w-lg w-full bg-surface-white border border-border-subtle rounded-xl p-8 shadow-sm space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center text-success">
                <CheckCircle2 size={36} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text-primary">Verified Event Organizer</h2>
              <p className="text-text-secondary text-sm">
                Your account is fully approved. You have full access to event, ticket, layout, and payout configurations.
              </p>
            </div>
            <button
              onClick={() => router.push("/organizer")}
              className="w-full bg-secondary hover:bg-secondary/95 text-white font-semibold py-3 rounded-lg transition-all duration-200 cursor-pointer"
            >
              Enter Organizer Dashboard
            </button>
          </div>
        </main>
        <HomeFooterV2 />
      </div>
    );
  }

  // Case C: signed in, but not a verified organizer yet — no application, or one
  // that is pending, needs revision, or was rejected.
  //
  // The hero comes first here too, so the page reads the same as it does signed
  // out. The CTA scrolls to the application rather than navigating: it is
  // already on this page, and a signed-in buyer arriving from the navbar should
  // still see what they are applying for before the form.
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar active_href="/business" />
      <BusinessLandingHero
        cta_label={application ? "View your application" : "Apply to Become Organizer"}
        on_cta={() =>
          application_ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />
      <main ref={application_ref} className="flex-1 pb-12 px-6 max-w-4xl mx-auto w-full scroll-mt-6">
        {successMsg && (
          <div className="mb-6 rounded-lg border border-success/20 bg-success/5 px-4 py-3 font-body-sm text-body-sm text-success flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 font-body-sm text-body-sm text-danger flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {application ? (
          <div className="space-y-8">
            {/* Application Status Information */}
            <div className="bg-surface-white border border-border-subtle rounded-xl p-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">{application.business_name}</h1>
                  <p className="text-text-secondary text-sm mt-1">Application ID: #{application.id}</p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold select-none">
                  {application.status === "pending" && (
                    <span className="bg-warning/10 text-warning px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Clock size={16} /> Pending Verification
                    </span>
                  )}
                  {application.status === "in_review" && (
                    <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Clock size={16} /> Under Review
                    </span>
                  )}
                  {application.status === "needs_revision" && (
                    <span className="bg-warning/10 text-warning px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Clock size={16} /> Needs Revision
                    </span>
                  )}
                  {application.status === "rejected" && (
                    <span className="bg-danger/10 text-danger px-3 py-1 rounded-full flex items-center gap-1.5">
                      <AlertTriangle size={16} /> Rejected
                    </span>
                  )}
                </div>
              </div>

              {application.status === "rejected" && (
                <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 text-sm text-danger space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={16} /> Application Rejected by Auditor</p>
                  <p>{application.notes || "Auditor did not leave notes. Please verify that your KTP and Business documents match."}</p>
                </div>
              )}

              {application.status === "needs_revision" && (
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 text-sm text-warning space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={16} /> Revision Requested by Auditor</p>
                  <p>{application.notes || "Auditor requested changes to your application. Please update the details or documents below."}</p>
                </div>
              )}

              {application.status === "pending" || application.status === "in_review" ? (
                <div className="space-y-6">
                  <p className="text-text-secondary text-sm">
                    Our compliance team is currently reviewing your document uploads. We'll update your account privilege to Event Organizer as soon as approval is confirmed.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl text-sm">
                    <div className="flex items-center gap-3">
                      <Building size={16} className="text-text-secondary" />
                      <div>
                        <p className="text-xs text-text-secondary">Business Entity Type</p>
                        <p className="font-medium text-text-primary">{application.business_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-text-secondary" />
                      <div>
                        <p className="text-xs text-text-secondary">Compliance Contact Email</p>
                        <p className="font-medium text-text-primary">{application.business_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-text-secondary" />
                      <div>
                        <p className="text-xs text-text-secondary">Compliance Contact Phone</p>
                        <p className="font-medium text-text-primary">{application.business_phone}</p>
                      </div>
                    </div>
                    {application.website && (
                      <div className="flex items-center gap-3">
                        <Globe size={16} className="text-text-secondary" />
                        <div>
                          <p className="text-xs text-text-secondary">Website</p>
                          <p className="font-medium text-text-primary">{application.website}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border-subtle pt-6 flex justify-end">
                    <button
                      onClick={handleCancelApplication}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 bg-danger/10 hover:bg-danger/20 text-danger font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={16} /> Cancel & Delete Application
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* If application is rejected or needs revision, display editable form to resubmit */}
            {(application.status === "rejected" || application.status === "needs_revision") && (
              <div className="bg-surface-white border border-border-subtle rounded-xl p-8 shadow-sm space-y-6">
                <h2 className="text-xl font-bold text-text-primary">Update and Resubmit Application</h2>
                <form onSubmit={handleApply} className="space-y-6">
                  {/* Reuse registration fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-text-primary">Business / Organizer Name</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-text-primary">Business Type</label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                      >
                        <option value="Individual">Individual (Perorangan)</option>
                        <option value="Corporate">Corporate (PT/CV)</option>
                        <option value="NGO">NGO / Foundation</option>
                        <option value="Community">Community / Event Collective</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-text-primary">Contact Email</label>
                      <input
                        type="email"
                        value={businessEmail}
                        onChange={(e) => setBusinessEmail(e.target.value)}
                        className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-text-primary">Contact Phone Number</label>
                      <input
                        type="tel"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">Website URL (Optional)</label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">Description (Optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-border-subtle pt-6 space-y-4">
                    <h3 className="font-semibold text-text-primary flex items-center gap-1.5"><Building size={18} /> Bank & Address Verification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-primary">Business Address</label>
                        <textarea
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          rows={2}
                          className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                          placeholder="e.g. Sudirman Central Business District, Jakarta"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-primary">Bank Name</label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                          placeholder="e.g. Bank Central Asia (BCA)"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-primary">Bank Account Holder Name</label>
                        <input
                          type="text"
                          value={bankAccountHolder}
                          onChange={(e) => setBankAccountHolder(e.target.value)}
                          className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                          placeholder="e.g. Richie Obhasa"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-primary">Bank Account Number</label>
                        <input
                          type="text"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                          placeholder="e.g. 5012394012"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-6 space-y-4">
                    <h3 className="font-semibold text-text-primary flex items-center gap-1.5"><FileText size={18} /> Document Re-uploads</h3>
                    <p className="text-xs text-text-secondary">Upload new versions of documents only if corrections were requested. Existing files remain in place.</p>
                    <p className="text-xs text-text-secondary">{criteriaForType("KTP")}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document Item: KTP */}
                      <div className="border border-border-subtle p-4 rounded-lg flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary">Identity Card (KTP)</p>
                          <p className="text-xs text-text-secondary truncate">{ktp ? `${ktp.name} · ${formatSize(ktp.size)}` : "Choose a new file to replace"}</p>
                          {docErrors.ktp && <p className="text-xs text-danger mt-1">{docErrors.ktp}</p>}
                        </div>
                        <label className="bg-surface-container-low hover:bg-surface-container hover:text-primary text-text-secondary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-border-subtle shrink-0">
                          Choose File
                          <input type="file" onChange={(e) => handlePickDocument("ktp", setKtp, e.target.files?.[0] || null)} className="hidden" accept={ACCEPT} />
                        </label>
                      </div>

                      {/* Document Item: NPWP */}
                      <div className="border border-border-subtle p-4 rounded-lg flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary">Tax ID (NPWP)</p>
                          <p className="text-xs text-text-secondary truncate">{npwp ? `${npwp.name} · ${formatSize(npwp.size)}` : "Choose a new file to replace"}</p>
                          {docErrors.npwp && <p className="text-xs text-danger mt-1">{docErrors.npwp}</p>}
                        </div>
                        <label className="bg-surface-container-low hover:bg-surface-container hover:text-primary text-text-secondary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-border-subtle shrink-0">
                          Choose File
                          <input type="file" onChange={(e) => handlePickDocument("npwp", setNpwp, e.target.files?.[0] || null)} className="hidden" accept={ACCEPT} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancelApplication}
                      disabled={actionLoading}
                      className="bg-danger/10 hover:bg-danger/20 text-danger font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-sm"
                    >
                      Delete Application
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="bg-primary hover:bg-primary/95 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-sm"
                    >
                      {actionLoading ? "Submitting..." : "Resubmit Application"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* Form: Application Form */
          <div className="bg-surface-white border border-border-subtle rounded-xl p-8 shadow-sm space-y-6">
            <div className="border-b border-border-subtle pb-6 space-y-2">
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">Become an Event Organizer</h1>
              <p className="text-text-secondary text-sm">
                Provide legal business credentials and document uploads. Once our Auditor team approves, your account roles will be updated.
              </p>
            </div>

            <form onSubmit={handleApply} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-text-primary">Business / Organizer Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                    placeholder="e.g. Sonic Labs Net LLC"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-text-primary">Business Type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                  >
                    <option value="Individual">Individual (Perorangan)</option>
                    <option value="Corporate">Corporate (PT/CV)</option>
                    <option value="NGO">NGO / Foundation</option>
                    <option value="Community">Community / Event Collective</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-text-primary">Contact Email</label>
                  <input
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                    placeholder="e.g. billing@soniclabs.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-text-primary">Contact Phone Number</label>
                  <input
                    type="tel"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                    placeholder="e.g. +628123456789"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Website URL (Optional)</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                  placeholder="e.g. https://soniclabs.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                  placeholder="Describe your organization's event hosting background..."
                />
              </div>

              <div className="border-t border-border-subtle pt-6 space-y-4">
                <h3 className="font-semibold text-text-primary flex items-center gap-1.5"><Building size={18} /> Bank & Address Verification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">Business Address</label>
                    <textarea
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      rows={2}
                      className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                      placeholder="e.g. Sudirman Central Business District, Jakarta"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                      placeholder="e.g. Bank Central Asia (BCA)"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">Bank Account Holder Name</label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                      placeholder="e.g. Richie Obhasa"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">Bank Account Number</label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="w-full border border-border-subtle px-3 py-2 rounded-lg text-sm bg-background focus:ring-1 focus:ring-secondary focus:outline-none"
                      placeholder="e.g. 5012394012"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border-subtle pt-6 space-y-4">
                <h3 className="font-semibold text-text-primary flex items-center gap-1.5"><UploadCloud size={18} /> Legal Verification Documents</h3>
                <p className="text-xs text-text-secondary">{criteriaForType("KTP")}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Item: KTP */}
                  <div className="border border-border-subtle p-4 rounded-lg flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">Identity Card (KTP) <span className="text-danger">*</span></p>
                      <p className="text-xs text-text-secondary truncate">{ktp ? `${ktp.name} · ${formatSize(ktp.size)}` : "Not selected (Required)"}</p>
                      {docErrors.ktp && <p className="text-xs text-danger mt-1">{docErrors.ktp}</p>}
                    </div>
                    <label className="bg-surface-container-low hover:bg-surface-container hover:text-primary text-text-secondary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-border-subtle shrink-0">
                      Choose File
                      <input type="file" onChange={(e) => handlePickDocument("ktp", setKtp, e.target.files?.[0] || null)} className="hidden" accept={ACCEPT} />
                    </label>
                  </div>

                  {/* Document Item: NPWP */}
                  <div className="border border-border-subtle p-4 rounded-lg flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">Tax ID (NPWP)</p>
                      <p className="text-xs text-text-secondary truncate">{npwp ? `${npwp.name} · ${formatSize(npwp.size)}` : "Not selected"}</p>
                      {docErrors.npwp && <p className="text-xs text-danger mt-1">{docErrors.npwp}</p>}
                    </div>
                    <label className="bg-surface-container-low hover:bg-surface-container hover:text-primary text-text-secondary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-border-subtle shrink-0">
                      Choose File
                      <input type="file" onChange={(e) => handlePickDocument("npwp", setNpwp, e.target.files?.[0] || null)} className="hidden" accept={ACCEPT} />
                    </label>
                  </div>

                  {/* Document Item: NIB */}
                  <div className="border border-border-subtle p-4 rounded-lg flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">Business Registry Number (NIB)</p>
                      <p className="text-xs text-text-secondary truncate">{nib ? `${nib.name} · ${formatSize(nib.size)}` : "Not selected"}</p>
                      {docErrors.nib && <p className="text-xs text-danger mt-1">{docErrors.nib}</p>}
                    </div>
                    <label className="bg-surface-container-low hover:bg-surface-container hover:text-primary text-text-secondary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-border-subtle shrink-0">
                      Choose File
                      <input type="file" onChange={(e) => handlePickDocument("nib", setNib, e.target.files?.[0] || null)} className="hidden" accept={ACCEPT} />
                    </label>
                  </div>

                  {/* Document Item: SIUP */}
                  <div className="border border-border-subtle p-4 rounded-lg flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">SIUP / Business Permit</p>
                      <p className="text-xs text-text-secondary truncate">{siup ? `${siup.name} · ${formatSize(siup.size)}` : "Not selected"}</p>
                      {docErrors.siup && <p className="text-xs text-danger mt-1">{docErrors.siup}</p>}
                    </div>
                    <label className="bg-surface-container-low hover:bg-surface-container hover:text-primary text-text-secondary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-border-subtle shrink-0">
                      Choose File
                      <input type="file" onChange={(e) => handlePickDocument("siup", setSiup, e.target.files?.[0] || null)} className="hidden" accept={ACCEPT} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Turnstile CAPTCHA */}
              <Turnstile onVerify={(token) => setTurnstileToken(token)} />

              <div className="border-t border-border-subtle pt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-primary hover:bg-primary/95 text-white font-semibold px-8 py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-sm"
                >
                  {actionLoading ? "Submitting Application..." : "Submit Verification Application"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      <HomeFooterV2 />
    </div>
  );
}
