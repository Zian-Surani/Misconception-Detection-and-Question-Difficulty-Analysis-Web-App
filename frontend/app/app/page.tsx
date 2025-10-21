"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "../ThemeToggle";

type AnalyzeReq = {
  question_text: string;
  ideal_answer_text: string;
  user_answer_text: string;
  qid?: number;
};

type MisReq = { user_answer_text: string; qid?: number };
type DiffReq = { question_text: string; qid?: number };

export default function AppPage() {
  const [question, setQuestion] = useState("");
  const [ideal, setIdeal] = useState("");
  const [userAns, setUserAns] = useState("");
  const [geminiKey, setGeminiKey] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('gemini_key')||"") : "");
  const [qid, setQid] = useState<string>("");

  const qidNumber = useMemo(() => {
    const v = parseInt(qid, 10);
    return Number.isNaN(v) ? undefined : v;
  }, [qid]);

  const [loading, setLoading] = useState<"analyze" | "mis" | "diff" | null>(null);
  const [analyzeOut, setAnalyzeOut] = useState<any>(null);
  const [misOut, setMisOut] = useState<any>(null);
  const [diffOut, setDiffOut] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const disabledAnalyze = !question || !ideal || !userAns;
  const disabledMis = !userAns;
  const disabledDiff = !question;

  async function callApi<T>(path: string, body?: unknown): Promise<T> {
    const headers: Record<string,string> = { "content-type": "application/json" };
    // prefer gemini key if present
    try {
      const stored = localStorage.getItem('gemini_key') || geminiKey;
      if (stored) headers['x-gemini-key'] = stored;
    } catch {}
    const r = await fetch(path, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!r.ok) {
      let detail: any;
      try { detail = await r.json(); } catch { detail = await r.text(); }
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return r.json();
  }

  const loadSample = () => {
    setQuestion("Explain photosynthesis and its importance.");
    setIdeal("Photosynthesis converts light energy into chemical energy, producing glucose and oxygen; it's vital for energy flow and atmospheric oxygen.");
    setUserAns("Plants breathe in sunlight and make food; they also give air.");
  };

  const CountUp = ({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) => {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef<number | null>(null);
    const startRef = useRef<number | null>(null);
    const fromRef = useRef(0);
    useEffect(() => {
      fromRef.current = display;
      startRef.current = null;
      const duration = 400;
      const step = (t: number) => {
        if (startRef.current === null) startRef.current = t;
        const p = Math.min(1, (t - startRef.current) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const next = fromRef.current + (value - fromRef.current) * eased;
        setDisplay(next);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    return <>{display.toFixed(decimals)}{suffix}</>;
  };

  const clearAll = () => {
    setQuestion("");
    setIdeal("");
    setUserAns("");
    setQid("");
    setAnalyzeOut(null);
    setMisOut(null);
    setDiffOut(null);
    setError(null);
  };

  const onAnalyze = async () => {
    setLoading("analyze");
    setError(null);
    try {
      const payload: AnalyzeReq = { question_text: question, ideal_answer_text: ideal, user_answer_text: userAns };
      if (qidNumber !== undefined) payload.qid = qidNumber;
      const data = await callApi<any>("/api/analyze/freeform", payload);
      setAnalyzeOut(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(null);
    }
  };

  const onMis = async () => {
    setLoading("mis");
    setError(null);
    try {
      const payload: MisReq = { user_answer_text: userAns };
      if (qidNumber !== undefined) payload.qid = qidNumber;
      const data = await callApi<any>("/api/predict_misconception", payload);
      setMisOut(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(null);
    }
  };

  const onDiff = async () => {
    setLoading("diff");
    setError(null);
    try {
      const payload: DiffReq = { question_text: question };
      if (qidNumber !== undefined) payload.qid = qidNumber;
      const data = await callApi<any>("/api/estimate_difficulty", payload);
      setDiffOut(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(null);
    }
  };

  const Progress = ({ value, label }: { value: number; label: string }) => {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef<number | null>(null);
    const startRef = useRef<number | null>(null);
    const fromRef = useRef(0);
    const target = Math.min(100, Math.max(0, value * 100));

    useEffect(() => {
      fromRef.current = display;
      startRef.current = null;
      const duration = 400;
      const step = (t: number) => {
        if (startRef.current === null) startRef.current = t;
        const p = Math.min(1, (t - startRef.current) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const next = fromRef.current + (target - fromRef.current) * eased;
        setDisplay(next);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [target]);

    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1"><span>{label}</span><span>{Math.round(display)}%</span></div>
        <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-2 transition-[width] duration-300 ease-out"
            style={{
              width: `${target}%`,
              background: `linear-gradient(90deg, var(--accent-1), var(--accent-2), var(--accent-3))`,
            }}
          />
        </div>
      </div>
    );
  };

  // Lightweight inline SVG Pie chart (expects [{name, value}, ...])
  const PieChart = ({ data, size = 140 }: { data: Array<{ name: string; value: number }>; size?: number }) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let angle = -90;
    const slices = data.map((d, i) => {
      const portion = (d.value / total) * 360;
      const start = angle;
      const end = angle + portion;
      angle = end;
      const large = portion > 180 ? 1 : 0;
      const r = size / 2;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const x1 = r + r * Math.cos(toRad(start));
      const y1 = r + r * Math.sin(toRad(start));
      const x2 = r + r * Math.cos(toRad(end));
      const y2 = r + r * Math.sin(toRad(end));
      const path = `M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return { path, name: d.name, value: d.value };
    });
    const colors = ["var(--accent-1)", "var(--accent-2)", "var(--accent-3)", "#f97316", "#10b981"];
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="inline-block">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={colors[i % colors.length]} stroke="rgba(255,255,255,0.06)" />
        ))}
      </svg>
    );
  };

  // Simple horizontal bar chart for small metrics
  const BarChart = ({ data }: { data: Array<{ metric: string; value: number }> }) => {
    return (
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1"><span className="text-contrast-muted">{d.metric}</span><span className="text-contrast-muted">{Math.round(d.value*100)}%</span></div>
            <div className="h-2 bg-black/8 rounded-full overflow-hidden">
              <div className="h-2" style={{ width: `${Math.round(Math.min(100, Math.max(0, d.value*100)))}%`, background: `linear-gradient(90deg, var(--accent-1), var(--accent-2))` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const AISuggestions = ({ guidance }: { guidance?: string }) => {
    if (!guidance) return null;
    const bullets = guidance.split(/\.|\n/).map(s => s.trim()).filter(Boolean);
    const copy = async () => {
      try { await navigator.clipboard.writeText(guidance); } catch {}
    };
    return (
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-surface-contrast">AI Suggestions</h4>
            <p className="text-contrast-muted text-sm">Actionable tips to improve the student's answer.</p>
          </div>
          <div>
            <button onClick={copy} className="btn btn-ghost">Copy</button>
          </div>
        </div>
        <ul className="mt-3 list-disc list-inside text-sm text-contrast-muted space-y-1">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen px-4 py-6 sm:px-8 vignette bg-cool">
      {loading && <div className="top-loader" />}
      <div className="absolute left-1/2 -translate-x-1/2 top-12 pointer-events-none">
        <div className="blob blob-1" style={{opacity:0.12}} />
        <div className="blob blob-2" style={{opacity:0.08, marginTop: -80}} />
        <div className="blob blob-3" style={{opacity:0.06, marginTop: -40}} />
      </div>
      <div className="relative max-w-5xl mx-auto">
        <nav className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] flex items-center justify-center text-white font-bold">📚</div>
              <div>
                <div className="text-sm text-contrast-muted">LearnLens</div>
                <div className="text-lg font-semibold text-surface-contrast">Analytics Tool</div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="btn btn-ghost">
              ← Back to Home
            </Link>
            <ThemeToggle />
          </div>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-surface-contrast mb-2">LearnLens Analytics Platform</h1>
          <p className="text-contrast-muted">Analyze student responses, predict misconceptions, and estimate question difficulty using advanced AI.</p>
        </div>

        <div className="app-shell bg-glass p-4 rounded-2xl border-gradient">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="col-span-1">
              <div className="card">
                <h2 className="font-semibold mb-1 text-surface-contrast">Inputs</h2>
                <p className="text-contrast-muted text-sm mb-2">Question, ideal answer, and student response.</p>
                <div className="space-y-3">
                  <textarea 
                    value={question} 
                    onChange={e=>setQuestion(e.target.value)} 
                    placeholder="Enter your question here..." 
                    className="textarea" 
                  />
                  <textarea 
                    value={ideal} 
                    onChange={e=>setIdeal(e.target.value)} 
                    placeholder="Enter the ideal (reference) answer..." 
                    className="textarea" 
                  />
                  <textarea 
                    value={userAns} 
                    onChange={e=>setUserAns(e.target.value)} 
                    placeholder="Enter student's answer..." 
                    className="textarea" 
                  />
                  <input 
                    value={qid} 
                    onChange={e=>setQid(e.target.value)} 
                    placeholder="Optional question ID (number)" 
                    className="input" 
                  />
                  <div>
                    <input
                      value={geminiKey}
                      onChange={e=>{ setGeminiKey(e.target.value); try{ localStorage.setItem('gemini_key', e.target.value);}catch{} }}
                      placeholder="Optional Gemini API Key (paste here)"
                      className="input"
                    />
                    <div className="text-xxs text-contrast-muted mt-1">Paste a Gemini API key to enable on-demand suggestions (stored locally).</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={loadSample} className="btn btn-primary">Load Sample</button>
                  <button onClick={clearAll} className="btn btn-ghost">Clear All</button>
                </div>
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-4">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-surface-contrast">One-shot Analysis</h3>
                    <p className="text-contrast-muted text-sm">Compare user answer to ideal and get guidance.</p>
                  </div>
                  <div>
                    <button
                      onClick={onAnalyze}
                      disabled={disabledAnalyze || loading!==null}
                      aria-busy={loading==="analyze"}
                      aria-label="Analyze user answer"
                      className="btn btn-primary"
                    >
                      {loading==="analyze"? 'Analyzing...' : 'Analyze'}
                    </button>
                  </div>
                </div>

                {analyzeOut ? (
                  <div className="mt-4 w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-2/3">
                        <Progress value={analyzeOut?.similarity?.user_vs_ideal ?? 0} label="User vs Ideal" />
                      </div>
                      <div className="w-1/3 text-right text-sm text-contrast-muted">
                        <div>Score: <strong><CountUp value={(analyzeOut?.similarity?.user_vs_ideal ?? 0) * 100} decimals={0} suffix="%" /></strong></div>
                      </div>
                    </div>

                    {analyzeOut?.guidance && (
                      <div className="text-sm text-contrast-muted p-3 bg-surface rounded-lg">
                        <strong>Guidance:</strong> {analyzeOut.guidance}
                      </div>
                    )}
                    
                    {/* Charts & AI suggestions */}
                    <div className="mt-4 grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-sm text-contrast-muted mb-2">Answer Composition</div>
                          <PieChart data={analyzeOut?.charts?.pie ?? []} />
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <div className="text-sm text-contrast-muted mb-2">Similarity & Difficulty</div>
                        <BarChart data={analyzeOut?.charts?.bars ?? []} />
                      </div>
                      <div className="md:col-span-1">
                        <AISuggestions guidance={analyzeOut?.guidance} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-contrast-muted">No analysis yet. Provide inputs and click <strong>Analyze</strong>.</div>
                )}
              </div>

              <div className="card grid grid-cols-2 gap-3">
                <div>
                  <h3 className="font-medium text-surface-contrast">Predict Misconception</h3>
                  <p className="text-contrast-muted text-sm">Estimate label, confidence and risk.</p>
                </div>
                <div className="text-right">
                  <button 
                    onClick={onMis} 
                    disabled={disabledMis || loading!==null} 
                    aria-busy={loading==="mis"} 
                    className="btn btn-primary"
                  >
                    {loading==="mis" ? 'Predicting...' : 'Predict'}
                  </button>
                </div>
                <div className="col-span-2">
                  {misOut ? (
                    <div className="mt-2 text-sm text-contrast-muted bg-surface p-3 rounded-lg" aria-live="polite">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-xs opacity-60">Label</span>
                          <strong className="text-surface-contrast">{misOut.label}</strong>
                        </div>
                        <div>
                          <span className="block text-xs opacity-60">Confidence</span>
                          <strong className="text-surface-contrast">{((misOut.confidence||0) * 100).toFixed(1)}%</strong>
                        </div>
                        {misOut.risk !== undefined && (
                          <div className="col-span-2">
                            <span className="block text-xs opacity-60">Risk Level</span>
                            <strong className="text-surface-contrast">{(misOut.risk*100).toFixed(0)}%</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-contrast-muted">No prediction yet. Enter a student answer and click Predict.</div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-surface-contrast">Estimate Difficulty</h3>
                    <p className="text-contrast-muted text-sm">Question difficulty and bucket classification.</p>
                  </div>
                  <button 
                    onClick={onDiff} 
                    disabled={disabledDiff || loading!==null} 
                    className="btn btn-primary"
                  >
                    {loading==="diff" ? 'Estimating...' : 'Estimate'}
                  </button>
                </div>
                {diffOut ? (
                  <div className="mt-3 text-sm text-contrast-muted bg-surface p-3 rounded-lg" aria-live="polite">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs opacity-60">Difficulty Score</span>
                        <strong className="text-surface-contrast">{(diffOut.difficulty_norm ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="block text-xs opacity-60">Difficulty Bucket</span>
                        <strong className="text-surface-contrast">{diffOut.bucket}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-contrast-muted">No estimate yet. Enter a question and click Estimate.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-lg border border-red-300/40 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-contrast-muted hover:text-surface-contrast transition-colors">
            ← Back to landing page
          </Link>
        </div>
      </div>
    </div>
  );
}