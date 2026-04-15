import { useState, useEffect } from "react";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Tag,
  FileText,
  RefreshCw,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import FileUpload from "../components/FileUpload";
import SectionWrapper from "../components/Sectionwrapper";
import { getResume, scanResume, analyzeResume } from "../services/resumeService";

// ── Helpers ────────────────────────────────────────────────────────────────

const getScoreColor = (pct) => {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 55) return "text-amber-500";
  return "text-red-500";
};

const getScoreBg = (pct) => {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 55) return "bg-amber-400";
  return "bg-red-400";
};

const getScoreLabel = (pct) => {
  if (pct >= 80) return "Strong Match";
  if (pct >= 55) return "Moderate Match";
  return "Weak Match";
};

// ── Score Ring ─────────────────────────────────────────────────────────────

function ScoreRing({ percentage }) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#f4f4f5" strokeWidth={strokeWidth} fill="transparent"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="transparent"
          stroke={percentage >= 80 ? "#10b981" : percentage >= 55 ? "#f59e0b" : "#ef4444"}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold leading-none tabular-nums ${getScoreColor(percentage)}`}>
          {percentage}%
        </span>
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
          {getScoreLabel(percentage)}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Resume() {
  const [resumeFile, setResumeFile] = useState(null);
  const [storedResume, setStoredResume] = useState(null);
  const [fetchingResume, setFetchingResume] = useState(true);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Fetch stored resume on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getResume();
        setStoredResume(data);
      } catch {
        setStoredResume(null);
      } finally {
        setFetchingResume(false);
      }
    })();
  }, []);

  // Can analyze if: (stored resume OR uploaded file) + JD has enough content
  const hasResume = !!(storedResume || resumeFile);
  const canAnalyze = hasResume && jobDescription.trim().length > 30;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let data;
      if (resumeFile) {
        // New file uploaded — use analyze endpoint (saves + scores)
        data = await analyzeResume(resumeFile, jobDescription);
        setStoredResume({ word_count: "—", uploaded_at: new Date().toISOString() });
      } else {
        // Use stored resume — just scan with JD
        data = await scanResume(jobDescription);
      }
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error || "Analysis failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sidebar>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .anim-in { animation: fadeUp 0.4s ease both; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner-sm { width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block; }
      `}</style>

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-zinc-900 tracking-tight leading-tight">
          ATS Checker
        </h1>
        <p className="text-zinc-400 text-sm mt-1 font-light">
          Upload your resume and a job description to get an instant ATS compatibility score.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Resume Upload / Stored */}
        <SectionWrapper
          title="Your Resume"
          description={storedResume ? "Resume on file — upload a new one to replace it" : "PDF · Max 5 MB"}
        >
          {fetchingResume ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400 py-4">
              <span className="spinner-sm" style={{ borderColor: "rgba(0,0,0,.15)", borderTopColor: "#71717a" }} />
              Checking for stored resume…
            </div>
          ) : storedResume && !resumeFile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">Resume on file</p>
                  <p className="text-xs text-emerald-600 font-light mt-0.5">
                    {storedResume.word_count?.toLocaleString()} words · Uploaded {new Date(storedResume.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
              </div>
              <button
                onClick={() => setStoredResume(null)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors font-medium"
              >
                <RefreshCw size={12} /> Replace with a different resume
              </button>
            </div>
          ) : (
            <FileUpload
              onFileSelect={setResumeFile}
              accept=".pdf"
              label="Upload Resume"
            />
          )}
          {/* After picking a new file while a stored one exists, show clear option */}
          {storedResume && resumeFile && (
            <button
              onClick={() => setResumeFile(null)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors font-medium mt-2"
            >
              <RefreshCw size={12} /> Use stored resume instead
            </button>
          )}
        </SectionWrapper>

        {/* Job Description */}
        <SectionWrapper
          title="Job Description"
          description="Paste the full job posting for best results"
        >
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here...&#10;&#10;e.g. We're looking for a Senior React Engineer with experience in TypeScript, Redux, and REST APIs..."
            rows={7}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-all resize-none font-light leading-relaxed"
          />
          <p className="text-[10px] text-zinc-300 mt-2 font-medium">
            {jobDescription.trim().length} characters
            {jobDescription.trim().length < 30 && jobDescription.trim().length > 0 && (
              <span className="text-amber-400 ml-2">— add more detail for better results</span>
            )}
          </p>
        </SectionWrapper>
      </div>

      {/* Analyze Button */}
      <div className="mb-8">
        {error && (
          <p className="text-sm text-red-500 mb-3 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze || loading}
          className={`flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm
            ${canAnalyze && !loading
              ? "bg-zinc-900 text-white hover:bg-zinc-700 hover:-translate-y-0.5 hover:shadow-md"
              : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
            }`}
        >
          {loading ? (
            <><span className="spinner-sm" /> Analyzing…</>
          ) : (
            <><Zap size={16} /> Analyze Resume</>
          )}
        </button>
        {!canAnalyze && !loading && (
          <p className="text-xs text-zinc-400 mt-2 font-light">
            {!hasResume
              ? "Upload your resume to get started."
              : "Paste a job description (min. 30 characters)."}
          </p>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="anim-in space-y-5">

          {/* Score + Strengths row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Score Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-3">
              <ScoreRing percentage={result.matchPercentage} />
              <div className="text-center">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">ATS Match Score</p>
                {/* Progress bar */}
                <div className="w-32 h-1.5 bg-zinc-100 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getScoreBg(result.matchPercentage)}`}
                    style={{ width: `${result.matchPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Strengths */}
            <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <h3 className="font-display font-bold text-sm text-zinc-900 tracking-tight">Keywords Matched</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.strengths?.map((kw) => (
                  <span
                    key={kw}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Missing Keywords */}
          <SectionWrapper
            title="Missing Keywords"
            description="These terms appear in the job description but not in your resume"
            action={
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 px-2 py-1 rounded-md">
                {result.missingKeywords?.length} found
              </span>
            }
          >
            {result.missingKeywords?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200"
                  >
                    <Tag size={10} /> {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 font-light">
                No missing keywords found. Great coverage!
              </p>
            )}
          </SectionWrapper>

          {/* Suggestions */}
          <SectionWrapper
            title="Improvement Suggestions"
            description="Actionable tips to increase your ATS score"
          >
            <ul className="space-y-3">
              {result.suggestions?.map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lightbulb size={12} className="text-amber-500" />
                  </div>
                  <p className="text-sm text-zinc-600 font-light leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </SectionWrapper>

        </div>
      )}
    </Sidebar>
  );
}
