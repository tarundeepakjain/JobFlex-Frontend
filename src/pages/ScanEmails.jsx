import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar"; // Adjust path if needed
import api from "../utils/api";

// Map the NLP labels from your Django backend to UI colors
const LABEL_META = {
  "rejected": { cls: "bg-red-50 text-red-600 border-red-200" },
  "interview scheduled": { cls: "bg-violet-50 text-violet-600 border-violet-200" },
  "offer received": { cls: "bg-green-50 text-green-700 border-green-200" },
  "application received": { cls: "bg-blue-50 text-blue-600 border-blue-200" },
  "under review": { cls: "bg-amber-50 text-amber-600 border-amber-200" },
  "assessment or test assigned": { cls: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  "not job related": { cls: "bg-zinc-100 text-zinc-500 border-zinc-200" }
};

export default function ScanEmailsPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [showRescanModal, setShowRescanModal] = useState(false);
  const [hasScannedBefore, setHasScannedBefore] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);

  // Load stored emails on mount
  useEffect(() => {
    loadStoredEmails();
  }, []);

  const loadStoredEmails = async () => {
    try {
      const response = await api("get", "gmail/stored/");
      const data = response.data;
      if (data.emails && data.emails.length > 0) {
        // Normalize stored emails to match the UI's expected structure
        const normalizedEmails = data.emails.map(e => ({
          id: e.id,
          status: e.status,
          subject: e.subject,
          confidence: e.confidence || 0,
          recruiter: e.sender || "",
          date: e.date,
          snippet: e.snippet || "",
          recent_thread: e.snippet ? [{ snippet: e.snippet, date: e.date }] : []
        }));

        // Pre-populate emails state so they render as cards
        setEmails(normalizedEmails);

        // Pre-populate selectedIds with stored email IDs
        const storedIds = new Set(data.emails.map(e => e.id));
        setSelectedIds(storedIds);
        setHasScannedBefore(true);

        // Set last scan time from most recent stored email
        const mostRecent = data.emails[0];
        if (mostRecent && mostRecent.date) {
          setLastScanTime(new Date(mostRecent.date));
        }
      }
    } catch (err) {
      // Silently fail - user just won't have pre-selected emails
      console.log("No stored emails found");
    }
  };

  const handleScan = async (newOnly = false) => {
    setShowRescanModal(false);
    setIsScanning(true);
    setError(null);
    try {
      const url = newOnly ? "gmail/scan/?new_only=true" : "gmail/scan/";
      const response = await api("get", url);
      const data = response.data;
      setEmails(data.emails || []);
      setHasScannedBefore(true);
      setLastScanTime(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRescanClick = () => {
    if (emails.length > 0 && hasScannedBefore) {
      setShowRescanModal(true);
    } else {
      handleScan(false);
    }
  };

  const toggleSelection = (emailId) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const handleSaveSelected = async () => {
    const selectedEmails = emails.filter(e => selectedIds.has(e.id));
    if (selectedEmails.length === 0) {
      alert("Please select at least one email to import.");
      return;
    }
    try {
      const emailsToSave = selectedEmails.map(e => ({
        id: e.id,
        status: e.status,
        subject: e.subject,
        sender: e.recruiter || "",
        snippet: e.recent_thread?.[0]?.snippet || "",
        date: e.recent_thread?.[0]?.date || e.date || new Date().toISOString(),
        confidence: e.confidence
      }));
      await api("post", "gmail/save/", { emails: emailsToSave });
      alert(`Successfully imported ${selectedEmails.length} applications!`);
    } catch (err) {
      setError("Failed to save selections: " + err.message);
    }
  };

  return (
    <Sidebar>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .anim-1 { animation: fadeUp 0.4s ease 0.05s both; }
        .anim-2 { animation: fadeUp 0.4s ease 0.12s both; }
        .anim-3 { animation: fadeUp 0.4s ease 0.20s both; }
      `}</style>

      {/* ── Rescan Modal ── */}
      {showRescanModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-display text-xl font-bold text-zinc-900 mb-2">Scan Options</h3>
            <p className="text-sm text-zinc-500 mb-6">How would you like to scan your inbox?</p>

            <div className="space-y-3">
              <button
                onClick={() => handleScan(false)}
                className="w-full text-left p-4 rounded-xl border border-zinc-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span className="text-lg">↻</span>
                  </div>
                  <div>
                    <div className="font-medium text-zinc-900">Scan All Emails</div>
                    <div className="text-xs text-zinc-500">Rescan your entire inbox from scratch</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleScan(true)}
                className="w-full text-left p-4 rounded-xl border border-zinc-200 hover:border-green-300 hover:bg-green-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <span className="text-lg">+</span>
                  </div>
                  <div>
                    <div className="font-medium text-zinc-900">Scan New Emails Only</div>
                    <div className="text-xs text-zinc-500">
                      Only scan emails received after your last scan
                      {lastScanTime && (
                        <span className="block text-zinc-400 mt-0.5">
                          (Last scan: {lastScanTime.toLocaleDateString()} {lastScanTime.toLocaleTimeString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowRescanModal(false)}
              className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-700 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="anim-1 flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900 tracking-tight">Inbox Scanner</h1>
          <p className="text-zinc-400 text-sm mt-1 font-light">
            AI-powered scan of your Gmail to auto-detect application updates.
          </p>
        </div>

        <div className="flex gap-3">
          {emails.length > 0 && (
            <>
              <button
                onClick={() => setShowRescanModal(true)}
                className="text-sm px-4 py-2 rounded-lg font-medium transition-all shadow-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                Re-Scan
              </button>
              <button
                onClick={handleSaveSelected}
                disabled={selectedIds.size === 0}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-all shadow-sm
                  ${selectedIds.size > 0
                    ? "bg-zinc-900 text-white hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-400 cursor-not-allowed"}`}
              >
                Import Selected ({selectedIds.size})
              </button>
            </>
          )}
          <button
            onClick={handleRescanClick}
            disabled={isScanning}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm disabled:opacity-70"
          >
            {isScanning ? (
              <>
                <span className="animate-spin text-lg leading-none">↻</span>
                Scanning Inbox...
              </>
            ) : (
              <>
                <span>✉️</span>
                Scan Gmail
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="anim-2 bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
          Error: {error}
        </div>
      )}

      {/* ── Empty State ── */}
      {!isScanning && emails.length === 0 && !error && (
        <div className="anim-2 text-center py-24 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
          <div className="text-4xl mb-3 text-zinc-300">🤖</div>
          <p className="text-sm font-medium text-zinc-600">Ready to scan your inbox</p>
          <p className="text-xs mt-1 text-zinc-400 max-w-sm mx-auto leading-relaxed">
            We will fetch your recent emails and use NLP to automatically classify them into statuses like "Interview", "Rejected", or "Offer".
          </p>
        </div>
      )}

      {/* ── Results Grid ── */}
      <div className="anim-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {emails.map((email) => {
          const isSelected = selectedIds.has(email.id);
          const meta = LABEL_META[email.status] || LABEL_META["not job related"];

          return (
            <div
              key={email.id}
              onClick={() => toggleSelection(email.id)}
              className={`relative cursor-pointer bg-white border rounded-2xl p-5 transition-all duration-200 hover:shadow-md
                ${isSelected ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10" : "border-zinc-200 hover:border-zinc-300"}
              `}
            >
              {/* Checkbox indicator */}
              <div className="absolute top-5 right-5">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                  ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-zinc-300 bg-zinc-50"}`}>
                  {isSelected && <span className="text-[10px]">✔</span>}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3 mb-3 pr-8">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md border ${meta.cls}`}>
                  {email.status}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium" title="AI Confidence Score">
                  {(email.confidence * 100).toFixed(0)}% match
                </span>
              </div>

              {/* Email Content */}
              <h3 className="font-semibold text-zinc-900 text-sm mb-1 leading-snug line-clamp-2">
                {email.subject}
              </h3>
              <p className="text-[11px] text-zinc-400 mb-3">
                From: <span className="text-zinc-600">{email.recruiter}</span> • {email.recent_thread?.[0]?.date || email.date}
              </p>

              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <p className="text-[11px] text-zinc-500 line-clamp-3 leading-relaxed">
                  {email.recent_thread?.[0]?.snippet || "No snippet available."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Sidebar>
  );
}