import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  FileText, Zap, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  Minus, BookOpen, Tag, BarChart2, RefreshCw, Archive, ArrowUpRight,
  ClipboardList, Send, Eye, Clock, Download, Upload, Loader2,
  ChevronRight, Sparkles, Info, Filter,
} from 'lucide-react';
import api from '@/lib/axiosClient';
import { isLoggedIn, clearAuth } from '@/lib/auth';
import { getGreeting } from '@/lib/greeting';
import { PERSONA_NAMES } from '@/lib/personas';
import AgentInsightPanel from '@/components/AgentInsightPanel';
import MetricCard from '@/components/MetricCard';
import ChatFAB from '@/components/ChatFAB';
import { SkeletonCard, SkeletonMetricRow } from '@/components/SkeletonCard';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY   = '#0F3D63';
const ACCENT = '#0284c7'; // sky-600 — unique to Content Strategy
const BORDER = '#E6EDF3';
const BG     = '#F6F9FC';
const INK    = '#1A2B3C';
const MUTED  = '#5B6B7B';
const GREEN  = '#2EAD7B';
const AMBER  = '#F5A623';
const RED    = '#E24C4B';
const VIOLET = '#7C3AED';

// ── Animation ─────────────────────────────────────────────────────────────────
const ANIM_CSS = `
  @keyframes cs-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes cs-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .cs-fade { animation: cs-fade 0.28s ease-out both; }
`;

// ── Static content assets — single source of truth (mirrors content_asset DB) ──
const ASSETS = [
  { id:'CA-001', name:'STEP-1 Efficacy Leave-Behind',         type:'Leave-behind',   audience:'Endocrinology', topic:'Efficacy',        status:'approved', compliance:'approved',    downloads:412, avg_time:5.2, rx_lift:18.4, reuse:87,  tagged:true,  version:'3.1' },
  { id:'CA-002', name:'Wegovy Titration Quick Guide',          type:'Leave-behind',   audience:'Endocrinology', topic:'Titration',       status:'approved', compliance:'approved',    downloads:389, avg_time:4.8, rx_lift:14.7, reuse:72,  tagged:true,  version:'2.3' },
  { id:'CA-003', name:'CV Outcomes Email — SUSTAIN-6',         type:'Email',          audience:'Cardiology',    topic:'CV Outcomes',     status:'approved', compliance:'approved',    downloads:198, avg_time:2.1, rx_lift:21.3, reuse:34,  tagged:true,  version:'1.5' },
  { id:'CA-004', name:'Wegovy MOA Detail Aid',                 type:'Detail Aid',     audience:'PCP',           topic:'MOA',             status:'approved', compliance:'approved',    downloads:276, avg_time:6.4, rx_lift:9.8,  reuse:41,  tagged:true,  version:'4.0' },
  { id:'CA-005', name:'Safety & Tolerability Snapshot',        type:'Leave-behind',   audience:'Endocrinology', topic:'Safety',          status:'approved', compliance:'approved',    downloads:147, avg_time:3.9, rx_lift:7.2,  reuse:22,  tagged:true,  version:'2.0' },
  { id:'CA-006', name:'Patient Adherence Support Kit',         type:'Patient Guide',  audience:'PCP',           topic:'Adherence',       status:'approved', compliance:'approved',    downloads:334, avg_time:7.1, rx_lift:11.5, reuse:65,  tagged:true,  version:'3.2' },
  { id:'CA-007', name:'PCP Intro: GLP-1 Class Overview',       type:'Leave-behind',   audience:'PCP',           topic:'Efficacy',        status:'approved', compliance:'approved',    downloads:291, avg_time:4.2, rx_lift:6.3,  reuse:53,  tagged:false, version:'1.8' },
  { id:'CA-008', name:'Formulary & PA Support Toolkit',        type:'PA Tool',        audience:'PCP',           topic:'Formulary/Access',status:'approved', compliance:'approved',    downloads:265, avg_time:8.3, rx_lift:15.9, reuse:48,  tagged:true,  version:'2.1' },
  { id:'CA-009', name:'Simplified Titration Guide v2',         type:'Leave-behind',   audience:'Endocrinology', topic:'Titration',       status:'approved', compliance:'approved',    downloads:178, avg_time:3.6, rx_lift:22.1, reuse:31,  tagged:true,  version:'2.0' },
  { id:'CA-010', name:'CVOT Data Clinical Summary',            type:'Clinical Summary',audience:'Cardiology',   topic:'CV Outcomes',     status:'approved', compliance:'approved',    downloads:88,  avg_time:9.4, rx_lift:19.6, reuse:14,  tagged:true,  version:'1.2' },
  { id:'CA-011', name:'Real-World Evidence Deck',              type:'Detail Aid',     audience:'Endocrinology', topic:'Efficacy',        status:'approved', compliance:'approved',    downloads:52,  avg_time:11.2,rx_lift:3.1,  reuse:8,   tagged:false, version:'1.0' },
  { id:'CA-012', name:'Dosing Flexibility Email',              type:'Email',          audience:'PCP',           topic:'Titration',       status:'approved', compliance:'approved',    downloads:310, avg_time:1.8, rx_lift:2.4,  reuse:58,  tagged:true,  version:'2.5' },
  { id:'CA-013', name:'Injection Training Video Module',       type:'Video Module',   audience:'PCP',           topic:'Adherence',       status:'approved', compliance:'approved',    downloads:145, avg_time:6.2, rx_lift:8.9,  reuse:26,  tagged:true,  version:'1.3' },
  { id:'CA-014', name:'Cardiology CME Slide Deck',             type:'Detail Aid',     audience:'Cardiology',    topic:'CV Outcomes',     status:'draft',    compliance:'pending',      downloads:0,   avg_time:0,   rx_lift:0,    reuse:0,   tagged:false, version:'0.1' },
  { id:'CA-015', name:'Digital Banner — Weight Loss Outcomes', type:'Digital Banner', audience:'PCP',           topic:'Efficacy',        status:'approved', compliance:'approved',    downloads:428, avg_time:0.5, rx_lift:1.8,  reuse:92,  tagged:true,  version:'1.1' },
  { id:'CA-016', name:'Adherence Email — 12-Week Check-In',    type:'Email',          audience:'Endocrinology', topic:'Adherence',       status:'pending_mlr',compliance:'pending',   downloads:0,   avg_time:0,   rx_lift:0,    reuse:0,   tagged:false, version:'1.0' },
  { id:'CA-017', name:'STEP-5 Safety Clinical Summary',        type:'Clinical Summary',audience:'Endocrinology',topic:'Safety',          status:'approved', compliance:'approved',    downloads:93,  avg_time:7.8, rx_lift:5.4,  reuse:17,  tagged:true,  version:'1.2' },
  { id:'CA-018', name:'Old Dosing Protocol Leave-Behind',      type:'Leave-behind',   audience:'Endocrinology', topic:'Titration',       status:'retired',  compliance:'approved',    downloads:301, avg_time:4.1, rx_lift:1.2,  reuse:55,  tagged:true,  version:'1.9' },
  { id:'CA-019', name:'Comorbidity Management Guide',          type:'Patient Guide',  audience:'Cardiology',    topic:'Safety',          status:'draft',    compliance:'pending',      downloads:0,   avg_time:0,   rx_lift:0,    reuse:0,   tagged:false, version:'0.2' },
  { id:'CA-020', name:'Injection-Hesitant Patient Toolkit',    type:'PA Tool',        audience:'PCP',           topic:'Adherence',       status:'approved', compliance:'approved',    downloads:211, avg_time:5.5, rx_lift:10.2, reuse:39,  tagged:true,  version:'1.4' },
];

// Approved assets only (used across tabs)
const APPROVED = ASSETS.filter(a => a.status === 'approved');

// ── Derived KPIs ───────────────────────────────────────────────────────────────
const TOTAL_ASSETS   = ASSETS.length;
const AVG_RX_LIFT    = +(APPROVED.reduce((s, a) => s + a.rx_lift, 0) / APPROVED.length).toFixed(1);
const REUSE_RATE     = +(APPROVED.reduce((s, a) => s + a.reuse, 0) / APPROVED.length).toFixed(1);
const AUTO_TAG_ACC   = Math.round(APPROVED.filter(a => a.tagged).length / APPROVED.length * 100);

// ── Content gaps analysis (canonical topics × audiences) ──────────────────────
const ALL_TOPICS    = ['Efficacy','Safety','Titration','Adherence','CV Outcomes','Formulary/Access','MOA'];
const ALL_AUDIENCES = ['Endocrinology','PCP','Cardiology'];
function buildGapMatrix() {
  const covered = {};
  APPROVED.forEach(a => {
    const key = `${a.audience}|${a.topic}`;
    covered[key] = (covered[key] || 0) + 1;
  });
  const gaps = [];
  ALL_AUDIENCES.forEach(aud => {
    ALL_TOPICS.forEach(top => {
      const count = covered[`${aud}|${top}`] || 0;
      if (count === 0) gaps.push({ audience: aud, topic: top });
    });
  });
  return gaps;
}
const GAPS = buildGapMatrix();

// ── A/B pairs ─────────────────────────────────────────────────────────────────
const AB_PAIRS = [
  {
    title: 'Titration Guide A/B',
    vA: { id: 'CA-002', name: 'Titration Quick Guide v2.3', downloads: 389, rx_lift: 14.7 },
    vB: { id: 'CA-009', name: 'Simplified Titration Guide v2', downloads: 178, rx_lift: 22.1 },
    winner: 'B',
    insight: 'Simplified guide drives +7.4% higher Rx lift with 50% fewer words. Recommend retiring CA-002 and scaling CA-009 field-wide.',
  },
  {
    title: 'Dosing Email A/B',
    vA: { id: 'CA-012', name: 'Dosing Flexibility Email', downloads: 310, rx_lift: 2.4 },
    vB: { id: 'CA-003', name: 'CV Outcomes Email — SUSTAIN-6', downloads: 198, rx_lift: 21.3 },
    winner: 'B',
    insight: 'CV outcomes framing outperforms dosing flexibility by 18.9 pp. Retire dosing email; convert to CV-outcome narrative for PCP channel.',
  },
];

// ── Recommendation buckets ─────────────────────────────────────────────────────
function recLabel(a) {
  if (a.status === 'retired')   return 'Sunset';
  if (a.rx_lift >= 14)          return 'Scale';
  if (a.rx_lift >= 6)           return 'Maintain';
  if (a.rx_lift > 0)            return 'Refresh';
  return 'Pending Data';
}
const REC_CFG = {
  Scale:        { color: GREEN,  bg: '#E8F7F0', icon: <ArrowUpRight size={12} /> },
  Maintain:     { color: ACCENT, bg: '#E0F2FE', icon: <Minus        size={12} /> },
  Refresh:      { color: AMBER,  bg: '#FFF8E6', icon: <RefreshCw    size={12} /> },
  Sunset:       { color: RED,    bg: '#FFF3F2', icon: <Archive      size={12} /> },
  'Pending Data':{ color: MUTED, bg: '#F6F9FC', icon: <Clock        size={12} /> },
};

// ── Status badge config ────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved:    { label: 'Approved',    color: GREEN,  bg: '#E8F7F0' },
  draft:       { label: 'Draft',       color: MUTED,  bg: '#F6F9FC' },
  pending_mlr: { label: 'Pending MLR', color: AMBER,  bg: '#FFF8E6' },
  retired:     { label: 'Retired',     color: RED,    bg: '#FFF3F2' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding:'2px 8px', borderRadius:99,
      background: cfg.bg, color: cfg.color,
      fontSize:11, fontWeight:700, whiteSpace:'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

function RecPill({ label }) {
  const cfg = REC_CFG[label] || REC_CFG.Maintain;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'2px 8px', borderRadius:99,
      background: cfg.bg, color: cfg.color,
      fontSize:11, fontWeight:700,
    }}>
      {cfg.icon} {label}
    </span>
  );
}

// ── Audience chip colors ───────────────────────────────────────────────────────
const AUD_CFG = {
  Endocrinology: { color: VIOLET,  bg: '#F3F0FF' },
  PCP:           { color: '#0891b2', bg: '#E0F2FE' },
  Cardiology:    { color: '#dc2626', bg: '#FEE2E2' },
};
function AudChip({ aud }) {
  const cfg = AUD_CFG[aud] || { color: MUTED, bg: BG };
  return (
    <span style={{
      display:'inline-block', padding:'1px 7px', borderRadius:99,
      background: cfg.bg, color: cfg.color, fontSize:10, fontWeight:700,
    }}>
      {aud}
    </span>
  );
}

// ── Top bar with greeting ──────────────────────────────────────────────────────
function ScreenHeader({ persona, tab, setTab, tabs, greeting }) {
  return (
    <div style={{
      background:'#fff', borderBottom:`1px solid ${BORDER}`,
      padding:'0 28px', flexShrink:0,
    }}>
      {/* Title row */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'18px 0 12px',
      }}>
        <div>
          <div style={{ fontSize:12, color: MUTED, fontWeight:500, marginBottom:3 }}>
            {greeting}, <strong style={{ color: INK }}>{persona.name}</strong>
          </div>
          <h1 style={{ fontSize:20, fontWeight:700, color: INK, margin:0, lineHeight:1.25 }}>
            Content Strategy
          </h1>
          <div style={{ fontSize:12, color: MUTED, marginTop:2 }}>
            {persona.role}
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderTop:`1px solid ${BORDER}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'10px 20px', border:'none', background:'none', cursor:'pointer',
            fontSize:13, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? ACCENT : MUTED,
            borderBottom: tab === t.id ? `2px solid ${ACCENT}` : '2px solid transparent',
            transition:'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — MLR Review
// ─────────────────────────────────────────────────────────────────────────────

// ── Cross-tab MLR queue store (module-level pub/sub) ─────────────────────────
let _mlrQueue = [];
const _mlrListeners = new Set();
function _notifyMLR() { _mlrListeners.forEach(fn => fn([..._mlrQueue])); }
function pushMLRItem(item) { _mlrQueue = [..._mlrQueue, item]; _notifyMLR(); }
function updateMLRItem(id, patch) { _mlrQueue = _mlrQueue.map(i => i.id === id ? { ...i, ...patch } : i); _notifyMLR(); }
function useMLRQueue() {
  const [q, setQ] = useState([..._mlrQueue]);
  useEffect(() => { _mlrListeners.add(setQ); return () => _mlrListeners.delete(setQ); }, []);
  return q;
}

const MLR_STEPS = [
  { key: 'ingestion',       label: 'Ingesting document' },
  { key: 'preprocessing',   label: 'Preprocessing & detecting sections' },
  { key: 'understanding',   label: 'Understanding content (LLM)' },
  { key: 'rule_evaluation', label: 'Evaluating 18 MLR rules (M/L/R)' },
  { key: 'aggregation',     label: 'Aggregating scores by section' },
  { key: 'reporting',       label: 'Generating compliance report' },
];

const MLR_RULES_META = [
  // ─ Medical (M) ─────────────────────────────────────────────────────────────
  { id: 'M1', section: 'M', name: 'Fair Balance Required',            category: 'Mandatory',   severity: 'high'   },
  { id: 'M2', section: 'M', name: 'AE Disclosure Complete',           category: 'Mandatory',   severity: 'high'   },
  { id: 'M3', section: 'M', name: 'Approved Indication Only',         category: 'Mandatory',   severity: 'high'   },
  { id: 'M4', section: 'M', name: 'Clinical Data Accuracy',           category: 'Validation',  severity: 'high'   },
  { id: 'M5', section: 'M', name: 'Comparative Claims Substantiated', category: 'Validation',  severity: 'medium' },
  { id: 'M6', section: 'M', name: 'Statistical Context Provided',     category: 'Validation',  severity: 'medium' },
  // ─ Legal (L) ───────────────────────────────────────────────────────────────
  { id: 'L1', section: 'L', name: 'No Absolute Claims',               category: 'Validation',  severity: 'high'   },
  { id: 'L2', section: 'L', name: 'Trademark Usage Correct',          category: 'Format',      severity: 'medium' },
  { id: 'L3', section: 'L', name: 'Copyright & Attribution',          category: 'Format',      severity: 'low'    },
  { id: 'L4', section: 'L', name: 'Claims Substantiation On File',    category: 'Compliance',  severity: 'medium' },
  { id: 'L5', section: 'L', name: 'No Misleading Comparisons',        category: 'Validation',  severity: 'medium' },
  { id: 'L6', section: 'L', name: 'Legal Disclaimer Present',         category: 'Format',      severity: 'low'    },
  // ─ Regulatory (R) ──────────────────────────────────────────────────────────
  { id: 'REG1', section: 'R', name: 'ISI Completeness',               category: 'Mandatory',   severity: 'high'   },
  { id: 'REG2', section: 'R', name: 'Boxed Warning Present',          category: 'Mandatory',   severity: 'high'   },
  { id: 'REG3', section: 'R', name: 'Prescribing Information Cited',  category: 'Mandatory',   severity: 'high'   },
  { id: 'REG4', section: 'R', name: 'Promotional Tone Compliant',     category: 'Compliance',  severity: 'medium' },
  { id: 'REG5', section: 'R', name: 'Audience Appropriate',           category: 'Compliance',  severity: 'medium' },
  { id: 'REG6', section: 'R', name: 'Reference Section Complete',     category: 'Format',      severity: 'low'    },
];

// Map legacy backend rule IDs (R1–R8) → new section IDs
const LEGACY_RULE_SECTION = { R1:'R', R2:'R', R3:'L', R4:'M', R5:'M', R6:'R', R7:'R', R8:'L' };
function getRuleSection(ruleId) {
  const meta = MLR_RULES_META.find(r => r.id === ruleId);
  if (meta) return meta.section;
  return LEGACY_RULE_SECTION[ruleId] || 'M';
}

// Synthetic MLR result for Content-Studio queue submissions
function generateStudioMLRResult(queueItem) {
  const PENALTY = { high: 20, medium: 10, low: 5 };
  const FIXES = {
    M5:   'Add citation: "[Wilding et al., STEP-1, NEJM 2021]" or rephrase as "Wegovy achieved 14.9% weight reduction in STEP-1."',
    M6:   'Add citation for the real-world persistence claim: "[Author et al., 2024][X]" and include in reference list.',
    L1:   'Replace superlative with: "Wegovy achieved 14.9% weight loss — among the highest in the GLP-1 class (STEP-1).[1]"',
    REG1: 'Add ISI block or: "See full Prescribing Information including Boxed Warning at [URL]."',
  };
  const varViolations = {
    A: [{ rule_id:'M5', section:'M', severity:'medium', name:'Comparative Claims Substantiated',
          message:'Efficacy claim "14.9% vs. lifestyle alone" implies class comparison without head-to-head citation.',
          explanation:'Comparative or superlative language requires direct supporting evidence or must be scoped to the trial.' }],
    B: [{ rule_id:'REG1', section:'R', severity:'high',   name:'ISI Completeness',
          message:'Abbreviated ISI present but full boxed-warning block is missing.',
          explanation:'Short-format pieces must include the full ISI text or a direct URL reference per FDA promotional guidelines.' }],
    C: [{ rule_id:'L1',  section:'L', severity:'high',   name:'No Absolute Claims',
          message:'"Highest weight reduction in its class" is a superlative claim requiring head-to-head evidence.',
          explanation:'Without a direct comparative trial, "highest in class" cannot be substantiated. Rephrase or add citation.' },
        { rule_id:'M6',  section:'M', severity:'medium', name:'Statistical Context Provided',
          message:'"12+ months persistence" claim has no n= or study citation.',
          explanation:'All quantitative claims require a citation number with the source study listed in the reference section.' }],
  };
  const violations = varViolations[queueItem.variation] || [];
  const violatedIds = new Set(violations.map(v => v.rule_id));
  const passedRules = MLR_RULES_META.filter(r => !violatedIds.has(r.id)).map(r => ({ rule_id: r.id, name: r.name, section: r.section }));
  const penalty = violations.reduce((s, v) => s + (PENALTY[v.severity] || 0), 0);
  const score = Math.max(0, 100 - penalty);
  const sev = violations.reduce((a, v) => ({ ...a, [v.severity]: (a[v.severity] || 0) + 1 }), {});
  return {
    compliance_status: score >= 80 ? 'Approved' : score >= 60 ? 'Needs Review' : 'Rejected',
    score, violations, passed_rules: passedRules,
    severity_summary: sev,
    suggestions: violations.map(v => ({ rule_id: v.rule_id, name: v.name, section: v.section, severity: v.severity, fix: FIXES[v.rule_id] || 'Review and update this section.' })),
    metadata: { title: queueItem.title, word_count: queueItem.wordCount, tone: queueItem.tone, audience_type: queueItem.audience },
  };
}

const SEVERITY_CFG = {
  high:   { color: RED,    bg: '#FFF3F2', label: 'High'   },
  medium: { color: AMBER,  bg: '#FFF8E6', label: 'Medium' },
  low:    { color: MUTED,  bg: '#F6F9FC', label: 'Low'    },
};

const COMPLIANCE_CFG = {
  'Approved':     { color: GREEN,  bg: '#E8F7F0', icon: <CheckCircle2 size={14} /> },
  'Needs Review': { color: AMBER,  bg: '#FFF8E6', icon: <AlertTriangle size={14} /> },
  'Rejected':     { color: RED,    bg: '#FFF3F2', icon: <AlertTriangle size={14} /> },
};

const MLR_SAMPLE_DOC = `WEGOVY® CLINICAL EVIDENCE SUMMARY — HCP Detail Aid v2.1

INDICATION
Wegovy® (semaglutide injection 2.4 mg) is indicated as an adjunct to a reduced-calorie
diet and increased physical activity for chronic weight management in adults with obesity
(BMI ≥30) or overweight (BMI ≥27) with at least one weight-related comorbidity.

EFFICACY
In the landmark STEP-1 trial (n=1,961), patients achieved a mean body weight reduction
of 14.9% at 68 weeks vs. 2.4% with placebo (p<0.001). This is the best weight loss
result ever seen in a GLP-1 trial — a revolutionary breakthrough for obesity medicine.

CARDIOVASCULAR OUTCOMES
The SUSTAIN-6 CVOT demonstrated a 26% reduction in MACE (HR 0.74; 95% CI 0.58–0.95)
in patients with type 2 diabetes at high cardiovascular risk.

DOSING & TITRATION
Start at 0.25 mg weekly, escalate every 4 weeks to the 2.4 mg maintenance dose.
This guaranteed titration schedule ensures all patients will benefit.

IMPORTANT SAFETY INFORMATION
The most common adverse reactions (≥5%) include nausea, diarrhea, vomiting, and constipation.
Contraindicated in patients with a personal or family history of MTC or MEN 2.
Consult prescribing information for full safety details.`;

function ScoreRing({ score }) {
  const r   = 36;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? GREEN : pct >= 60 ? AMBER : RED;

  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={48} cy={48} r={r} fill="none" stroke={BORDER} strokeWidth={8} />
        <circle
          cx={48} cy={48} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, color: MUTED, fontWeight: 600, marginTop: 1 }}>/ 100</div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CFG[severity] || SEVERITY_CFG.low;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  );
}

function MLRReviewTab() {
  // ── State ──────────────────────────────────────────────────────────────────
  const mlrQueue = useMLRQueue();
  const [activeQueueId,  setActiveQueueId]  = useState(null);
  const [mlrSection,     setMlrSection]     = useState('M');   // 'M' | 'L' | 'R'
  const [docText,        setDocText]        = useState('');
  const [fileName,       setFileName]       = useState('');
  const [dragging,       setDragging]       = useState(false);
  const [running,        setRunning]        = useState(false);
  const [logs,           setLogs]           = useState({});
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState('');
  const [overrides,      setOverrides]      = useState({});
  const [feedback,       setFeedback]       = useState({});
  const [showSendBack,   setShowSendBack]   = useState(false);
  const [sendBackReason, setSendBackReason] = useState('');
  const fileRef  = useRef(null);
  const abortRef = useRef(null);

  function loadFile(file) {
    if (!file) return;
    setFileName(file.name);
    setResult(null); setLogs({}); setError(''); setOverrides({}); setFeedback({});
    const reader = new FileReader();
    reader.onload = e => setDocText(e.target.result || '');
    reader.readAsText(file);
  }

  function loadSample() {
    setFileName('wegovy_hcp_detail_aid_v2.1.txt');
    setDocText(MLR_SAMPLE_DOC);
    setResult(null); setLogs({}); setError(''); setOverrides({}); setFeedback({});
  }

  async function handleRun() {
    if (!docText.trim()) { setError('Please upload a document or load the sample first.'); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setRunning(true); setResult(null); setError(''); setOverrides({}); setFeedback({});
    setLogs(Object.fromEntries(MLR_STEPS.map(s => [s.key, { status: 'pending', message: '' }])));

    try {
      const token   = localStorage.getItem('auth_token');
      const baseUrl = api.defaults.baseURL || '';

      const res = await fetch(`${baseUrl}/content-strategy/mlr-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ document_text: docText, file_name: fileName || 'document.txt' }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { setRunning(false); return; }
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'log') {
              setLogs(prev => ({ ...prev, [evt.step]: { status: evt.status, message: evt.message } }));
            } else if (evt.type === 'result') {
              setResult(evt);
            } else if (evt.type === 'error') {
              setError(evt.message);
            }
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  // ── Queue-item handlers ────────────────────────────────────────────────────
  function selectQueueItem(item) {
    setActiveQueueId(item.id);
    setDocText(item.content || '');
    setFileName(item.title);
    setLogs({});
    setError('');
    setOverrides({});
    setFeedback({});
    setShowSendBack(false);
    setSendBackReason('');
    setMlrSection('M');
    setResult(null);
    setRunning(true);
    // Populate all steps as "done" immediately for visual continuity
    setLogs(Object.fromEntries(MLR_STEPS.map(s => [s.key, { status: 'done', message: 'Complete' }])));
    setTimeout(() => { setResult(generateStudioMLRResult(item)); setRunning(false); }, 900);
  }

  function clearQueueItem() {
    setActiveQueueId(null);
    setDocText(''); setFileName(''); setLogs({}); setResult(null);
    setError(''); setOverrides({}); setFeedback({});
    setShowSendBack(false); setSendBackReason('');
  }

  function handleAccept() {
    if (activeQueueId) updateMLRItem(activeQueueId, { status: 'approved' });
  }

  function handleSendBack() {
    if (activeQueueId) updateMLRItem(activeQueueId, { status: 'sent_back', sendBackReason });
    setShowSendBack(false); setSendBackReason('');
  }

  function handleOverride(ruleId) {
    setOverrides(prev => ({ ...prev, [ruleId]: prev[ruleId] === 'override' ? null : 'override' }));
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const hasDoc    = docText.trim().length > 0;
  const hasResult = result && result.compliance_status;
  const anyLog    = Object.keys(logs).length > 0;

  const SECTION_CFG = {
    M: { label: 'Medical',    color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
    L: { label: 'Legal',      color: VIOLET,   bg: '#F5F3FF', border: '#DDD6FE' },
    R: { label: 'Regulatory', color: AMBER,    bg: '#FFFBEB', border: '#FDE68A' },
  };

  const effectiveViolations = hasResult ? (result.violations || []).filter(v => overrides[v.rule_id] !== 'override') : [];
  const overrideCount = Object.values(overrides).filter(v => v === 'override').length;
  const PENALTY = { high: 20, medium: 10, low: 5 };
  const adjustedScore = hasResult
    ? Math.min(100, (result.score || 0) + Object.entries(overrides).filter(([, v]) => v === 'override').reduce((sum, [rid]) => { const viol = (result.violations || []).find(v => v.rule_id === rid); return sum + (PENALTY[viol?.severity] || 0); }, 0))
    : 0;
  const adjustedStatus = adjustedScore >= 80 ? 'Approved' : adjustedScore >= 60 ? 'Needs Review' : 'Rejected';

  function secStatus(sec) {
    const vs = effectiveViolations.filter(v => getRuleSection(v.rule_id) === sec);
    if (vs.some(v => v.severity === 'high')) return 'high';
    if (vs.length > 0) return 'medium';
    return 'pass';
  }
  const secViolations  = hasResult ? effectiveViolations.filter(v => getRuleSection(v.rule_id) === mlrSection) : [];
  const secPassed      = hasResult ? (result.passed_rules || []).filter(r => getRuleSection(r.rule_id || r.id) === mlrSection) : [];
  const secSuggestions = hasResult ? (result.suggestions  || []).filter(s => getRuleSection(s.rule_id) === mlrSection) : [];
  const activeQueueItem = _mlrQueue.find(i => i.id === activeQueueId);
  const queueItemStatus = activeQueueItem?.status;

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Agent banner */}
      <div style={{
        background: 'linear-gradient(135deg, #FFF3F2 0%, #FFF8F7 100%)',
        border: `1px solid #FECACA`, borderRadius: 10, padding: '12px 18px',
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <CheckCircle2 size={16} color={RED} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RED, marginBottom: 3 }}>
            MLR Review Agent · <span style={{ fontWeight: 400, color: MUTED }}>
              18 rules · Medical / Legal / Regulatory · LLM + deterministic evaluation
            </span>
          </div>
          <div style={{ fontSize: 12, color: INK, lineHeight: 1.6 }}>
            Submit content via <strong>Content Studio</strong> to auto-load it here, or upload a document manually.
            The agent evaluates all 18 rules across <strong>M</strong>, <strong>L</strong>, and <strong>R</strong> sections and produces a scored report with fix suggestions.
          </div>
        </div>
      </div>

      {/* ── Queue inbox (items submitted from Content Studio) ── */}
      {mlrQueue.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '11px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(90deg, #F6F9FC 0%, #fff 100%)' }}>
            <ClipboardList size={14} color={ACCENT} />
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Submitted for Review</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: '#E0F2FE', padding: '2px 8px', borderRadius: 99 }}>
              {mlrQueue.filter(i => i.status === 'pending').length} pending
            </span>
            {activeQueueId && (
              <button onClick={clearQueueItem} style={{ marginLeft: 'auto', fontSize: 11, color: MUTED, border: 'none', background: 'none', cursor: 'pointer' }}>✕ Close</button>
            )}
          </div>
          <div style={{ padding: '10px 18px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {mlrQueue.map(item => {
              const isActive = activeQueueId === item.id;
              const stCfg = item.status === 'approved'  ? { color: GREEN,  bg: '#E8F7F0', label: '✓ Approved'  }
                          : item.status === 'sent_back' ? { color: AMBER,  bg: '#FFF8E6', label: '↩ Sent Back' }
                          :                               { color: ACCENT, bg: '#E0F2FE', label: '● Pending'   };
              return (
                <button key={item.id} onClick={() => selectQueueItem(item)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', borderRadius: 10,
                  border: `2px solid ${isActive ? ACCENT : BORDER}`,
                  background: isActive ? '#F0F9FF' : '#fff',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: isActive ? ACCENT : '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isActive ? '#fff' : ACCENT }}>
                    {item.variation}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? ACCENT : INK }}>{item.title}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                      {item.submittedAt} · {item.audience}
                      <span style={{ marginLeft: 7, padding: '1px 7px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: stCfg.bg, color: stCfg.color }}>{stCfg.label}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: upload + log + rules ref ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer?.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? RED : BORDER}`,
              borderRadius: 12, padding: '22px 16px',
              background: dragging ? '#FFF3F2' : '#fff',
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <input ref={fileRef} type="file" accept=".txt,.pdf,.docx"
              style={{ display: 'none' }} onChange={e => loadFile(e.target.files?.[0])} />
            <Upload size={24} color={dragging ? RED : MUTED} style={{ marginBottom: 8 }} />
            {fileName
              ? <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{fileName}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>{docText.length.toLocaleString()} chars · click to replace</div>
                </div>
              : <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>Drop document here</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>TXT, PDF, DOCX</div>
                </div>
            }
          </div>

          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={loadSample} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${BORDER}`,
              background: '#fff', color: MUTED, fontWeight: 600, fontSize: 11,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <FileText size={12} /> Sample Doc
            </button>
            <button onClick={handleRun} disabled={running || !hasDoc} style={{
              flex: 2, padding: '8px 0', borderRadius: 8, border: 'none',
              background: running ? '#FECACA' : !hasDoc ? '#F6F9FC' : RED,
              color: !hasDoc ? MUTED : '#fff',
              fontWeight: 700, fontSize: 12, cursor: running || !hasDoc ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.2s',
            }}>
              {running
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Reviewing…</>
                : <><CheckCircle2 size={13} /> Run MLR Review</>}
            </button>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFF3F2', border: `1px solid #FECACA`, color: RED, fontSize: 11 }}>
              <AlertTriangle size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />{error}
            </div>
          )}

          {/* Processing log */}
          {anyLog && (
            <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{
                padding: '10px 14px', borderBottom: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <ChevronRight size={13} color={RED} />
                <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>Processing Log</span>
                {running && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: RED, background: '#FFF3F2', padding: '1px 7px', borderRadius: 99 }}>
                    LIVE
                  </span>
                )}
                {!running && hasResult && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: GREEN, background: '#E8F7F0', padding: '1px 7px', borderRadius: 99 }}>
                    DONE
                  </span>
                )}
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {MLR_STEPS.map(step => (
                  <StepRow key={step.key} step={step} logEntry={logs[step.key]} />
                ))}
              </div>
            </div>
          )}

          {/* 18-rule reference grouped by M / L / R */}
          <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Info size={12} color={MUTED} />
              <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>Rules Reference</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: MUTED }}>18 rules</span>
            </div>
            {['M', 'L', 'R'].map(sec => {
              const scfg = SECTION_CFG[sec];
              const rules = MLR_RULES_META.filter(r => r.section === sec);
              return (
                <div key={sec} style={{ borderBottom: sec !== 'R' ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ padding: '5px 14px', background: scfg.bg, fontSize: 10, fontWeight: 800, color: scfg.color, letterSpacing: '0.05em' }}>
                    {sec} — {scfg.label}
                  </div>
                  <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {rules.map(rule => (
                      <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: scfg.color, background: scfg.bg, padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>{rule.id}</span>
                        <span style={{ fontSize: 10, color: INK, flex: 1, lineHeight: 1.3 }}>{rule.name}</span>
                        <SeverityBadge severity={rule.severity} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Idle */}
          {!hasResult && !anyLog && (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: '50px 28px', textAlign: 'center' }}>
              <CheckCircle2 size={36} color={BORDER} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>No document reviewed yet</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 6, lineHeight: 1.6, maxWidth: 300, margin: '8px auto 0' }}>
                {mlrQueue.length > 0
                  ? 'Click a submitted item above to load it for review, or upload a document manually.'
                  : 'Submit content from Content Studio, or upload a document and click Run MLR Review.'}
              </div>
            </div>
          )}

          {/* Running */}
          {anyLog && !hasResult && (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: '50px 28px', textAlign: 'center' }}>
              <Loader2 size={28} color={RED} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>Review in progress…</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Evaluating 18 compliance rules across M / L / R</div>
            </div>
          )}

          {/* Results */}
          {hasResult && (() => {
            const cs    = overrideCount > 0 ? adjustedStatus : result.compliance_status;
            const score = overrideCount > 0 ? adjustedScore  : result.score;
            const csCfg = COMPLIANCE_CFG[cs] || COMPLIANCE_CFG['Needs Review'];
            const sev   = result.severity_summary || {};
            return (
              <>
                {/* Score header */}
                <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: '18px 22px', display: 'flex', gap: 20, alignItems: 'center' }}>
                  <ScoreRing score={score} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: csCfg.bg, color: csCfg.color, fontSize: 13, fontWeight: 800 }}>
                        {csCfg.icon} {cs}
                      </span>
                      {overrideCount > 0 && (
                        <span style={{ fontSize: 10, color: AMBER, fontWeight: 700, background: '#FFF8E6', padding: '2px 8px', borderRadius: 99 }}>{overrideCount} override(s)</span>
                      )}
                      {activeQueueId && queueItemStatus !== 'pending' && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, color: queueItemStatus === 'approved' ? GREEN : AMBER, background: queueItemStatus === 'approved' ? '#E8F7F0' : '#FFF8E6' }}>
                          {queueItemStatus === 'approved' ? '✓ Accepted' : '↩ Sent Back'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {[{ label:'High', val:sev.high||0, color:RED }, { label:'Medium', val:sev.medium||0, color:AMBER }, { label:'Low', val:sev.low||0, color:MUTED }, { label:'Passed', val:(result.passed_rules||[]).length, color:GREEN }].map(m => (
                        <div key={m.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.val}</div>
                          <div style={{ fontSize: 10, color: MUTED }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>Document</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: INK, maxWidth: 180, lineHeight: 1.3 }}>{result.metadata?.title || fileName}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{result.metadata?.tone} · {result.metadata?.audience_type}</div>
                  </div>
                </div>

                {/* M / L / R sub-tabs */}
                <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                  {/* Tab strip */}
                  <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
                    {['M', 'L', 'R'].map(sec => {
                      const cfg = SECTION_CFG[sec];
                      const st  = secStatus(sec);
                      const isActive = mlrSection === sec;
                      const dotColor = st === 'high' ? RED : st === 'medium' ? AMBER : GREEN;
                      return (
                        <button key={sec} onClick={() => setMlrSection(sec)} style={{
                          flex: 1, padding: '11px 16px', border: 'none', cursor: 'pointer',
                          borderBottom: isActive ? `3px solid ${cfg.color}` : '3px solid transparent',
                          background: isActive ? cfg.bg : '#fff',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          transition: 'all 0.15s',
                        }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: isActive ? cfg.color : MUTED }}>{sec}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? cfg.color : MUTED }}>{cfg.label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                            <span style={{ fontSize: 9, color: dotColor, fontWeight: 700 }}>{st === 'pass' ? 'Pass' : st === 'high' ? 'Fail' : 'Warn'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Section body */}
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Violations */}
                    {secViolations.length > 0 && (
                      <div style={{ borderRadius: 10, border: `1px solid #FECACA`, overflow: 'hidden' }}>
                        <div style={{ padding: '9px 14px', borderBottom: `1px solid #FECACA`, display: 'flex', alignItems: 'center', gap: 8, background: '#FFF3F2' }}>
                          <AlertTriangle size={13} color={RED} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: RED }}>Violations</span>
                          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: RED, background: '#fff', padding: '1px 7px', borderRadius: 99 }}>{secViolations.length}</span>
                        </div>
                        {secViolations.map((v, i) => (
                          <div key={v.rule_id} style={{ padding: '12px 14px', borderBottom: i < secViolations.length - 1 ? `1px solid ${BORDER}` : 'none', background: i % 2 === 0 ? '#fff' : BG }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: '#E0F2FE', padding: '1px 6px', borderRadius: 4 }}>{v.rule_id}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: INK, flex: 1 }}>{v.name}</span>
                              <SeverityBadge severity={v.severity} />
                              <button onClick={() => handleOverride(v.rule_id)} style={{ padding: '2px 9px', borderRadius: 99, border: `1px solid ${BORDER}`, background: overrides[v.rule_id] === 'override' ? GREEN : '#fff', color: overrides[v.rule_id] === 'override' ? '#fff' : MUTED, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                                {overrides[v.rule_id] === 'override' ? '✓ Overridden' : 'Override'}
                              </button>
                            </div>
                            <div style={{ fontSize: 11, color: INK, marginBottom: 4, lineHeight: 1.5 }}><strong style={{ color: RED }}>Issue:</strong> {v.message}</div>
                            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}><strong>Context:</strong> {v.explanation}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggested fixes */}
                    {secSuggestions.length > 0 && (
                      <div style={{ borderRadius: 10, border: `1px solid #DDD6FE`, overflow: 'hidden' }}>
                        <div style={{ padding: '9px 14px', borderBottom: `1px solid #DDD6FE`, display: 'flex', alignItems: 'center', gap: 8, background: '#F5F3FF' }}>
                          <Sparkles size={13} color={VIOLET} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: VIOLET }}>Suggested Fixes</span>
                        </div>
                        {secSuggestions.map((s, i) => (
                          <div key={s.rule_id} style={{ padding: '10px 14px', borderBottom: i < secSuggestions.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: '#E0F2FE', padding: '1px 6px', borderRadius: 4 }}>{s.rule_id}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>{s.name}</span>
                              <SeverityBadge severity={s.severity} />
                            </div>
                            <div style={{ fontSize: 11, color: INK, lineHeight: 1.55, paddingLeft: 4 }}>{s.fix}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Passed */}
                    {secPassed.length > 0 && (
                      <div style={{ borderRadius: 10, border: `1px solid #A7F3D0`, overflow: 'hidden' }}>
                        <div style={{ padding: '9px 14px', borderBottom: `1px solid #A7F3D0`, display: 'flex', alignItems: 'center', gap: 8, background: '#E8F7F0' }}>
                          <CheckCircle2 size={13} color={GREEN} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>Passed</span>
                          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: GREEN }}>{secPassed.length}</span>
                        </div>
                        <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {secPassed.map(r => (
                            <span key={r.rule_id || r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: '#E8F7F0', color: GREEN, fontSize: 11, fontWeight: 600 }}>
                              <CheckCircle2 size={10} /> {r.rule_id || r.id} {r.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {secViolations.length === 0 && secPassed.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: MUTED, fontSize: 12 }}>No rules evaluated in this section.</div>
                    )}
                  </div>
                </div>

                {/* Accept / Send Back — queue items only */}
                {activeQueueId && queueItemStatus === 'pending' && (
                  <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>Reviewer Decision</div>
                    {!showSendBack ? (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleAccept} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: GREEN, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <CheckCircle2 size={14} /> Accept — Approved
                        </button>
                        <button onClick={() => setShowSendBack(true)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${AMBER}`, background: '#FFF8E6', color: AMBER, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          ↩ Send Back for Revision
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea value={sendBackReason} onChange={e => setSendBackReason(e.target.value)} placeholder="Describe what needs to be revised before re-submission…" rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: `1px solid ${AMBER}`, fontSize: 11, color: INK, resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={handleSendBack} disabled={!sendBackReason.trim()} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: sendBackReason.trim() ? AMBER : '#F6F9FC', color: sendBackReason.trim() ? '#fff' : MUTED, fontWeight: 700, fontSize: 12, cursor: sendBackReason.trim() ? 'pointer' : 'not-allowed' }}>↩ Confirm Send Back</button>
                          <button onClick={() => setShowSendBack(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: MUTED, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Decision badge */}
                {activeQueueId && queueItemStatus !== 'pending' && (
                  <div style={{ borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 10, background: queueItemStatus === 'approved' ? '#E8F7F0' : '#FFF8E6', border: `1px solid ${queueItemStatus === 'approved' ? '#A7F3D0' : '#FDE68A'}` }}>
                    {queueItemStatus === 'approved'
                      ? <><CheckCircle2 size={16} color={GREEN} style={{ flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>Content accepted — approved for distribution.</span></>
                      : <><AlertTriangle size={16} color={AMBER} style={{ flexShrink: 0 }} /><div><div style={{ fontSize: 13, fontWeight: 700, color: AMBER }}>Sent back for revision</div>{activeQueueItem?.sendBackReason && <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{activeQueueItem.sendBackReason}</div>}</div></>
                    }
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
          };

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — Auto-Tagging
// ─────────────────────────────────────────────────────────────────────────────

// Synthetic promotional content archive
const CONTENT_DB = [
  { id:'DOC-001', filename:'Wegovy_STEP1_HCP_LeaveBehind_v3.1.pdf',      type:'Leave-Behind',    icon:'📄', tags:{ therapeutic_area:['obesity'],                  content_type:['hcp_education','clinical'],           audience:['endocrinologist'],          topic:['efficacy'],          format:['pdf'] }, description:'STEP-1 trial efficacy summary for rep-led HCP detail visits. Headline: 14.9% mean weight reduction at 68 weeks.',                          date:'Jan 2025', downloads:412, status:'active'      },
  { id:'DOC-002', filename:'Wegovy_Titration_QuickCard_v2.3.pdf',         type:'Quick Reference', icon:'📋', tags:{ therapeutic_area:['obesity'],                  content_type:['hcp_education'],                      audience:['endocrinologist','pcp'],    topic:['titration'],         format:['pdf'] }, description:'Pocket-sized dose escalation card. 0.25 mg → 2.4 mg titration timeline with GI management tips.',                                          date:'Nov 2024', downloads:389, status:'active'      },
  { id:'DOC-003', filename:'SUSTAIN6_CV_Outcomes_Email_Cardio.html',      type:'Email',           icon:'✉️', tags:{ therapeutic_area:['type_2_diabetes'],          content_type:['clinical','hcp_education'],           audience:['endocrinologist'],          topic:['efficacy'],          format:['pdf'] }, description:'SUSTAIN-6 CVOT email for cardiologists. 26% MACE reduction, HR 0.74 (95% CI 0.58–0.95).',                                                   date:'Dec 2024', downloads:198, status:'active'      },
  { id:'DOC-004', filename:'Wegovy_MOA_DetailAid_v4.0.pdf',               type:'Detail Aid',      icon:'📊', tags:{ therapeutic_area:['obesity','type_2_diabetes'], content_type:['clinical','hcp_education'],           audience:['pcp'],                      topic:['efficacy'],          format:['pdf'] }, description:'Mechanism of action interactive detail aid for PCP sales calls. GLP-1 receptor agonist pathway illustrated.',                                date:'Oct 2024', downloads:276, status:'active'      },
  { id:'DOC-005', filename:'Wegovy_Safety_Tolerability_Snapshot_v2.pdf',  type:'Leave-Behind',    icon:'📄', tags:{ therapeutic_area:['obesity'],                  content_type:['hcp_education','clinical'],           audience:['endocrinologist','pcp'],    topic:['safety'],            format:['pdf'] }, description:'Safety and tolerability snapshot. AE profile, contraindications, boxed warning, and monitoring guidance.',                                   date:'Sep 2024', downloads:147, status:'active'      },
  { id:'DOC-006', filename:'Patient_Adherence_SupportKit_v3.2.pdf',       type:'Patient Guide',   icon:'📗', tags:{ therapeutic_area:['obesity'],                  content_type:['patient_education'],                  audience:['patient'],                  topic:['titration'],         format:['pdf'] }, description:'Comprehensive 12-week adherence kit for patients starting Wegovy. Injection tips, nausea management, lifestyle guidance.',                   date:'Feb 2025', downloads:334, status:'active'      },
  { id:'DOC-007', filename:'GLP1_ClassOverview_PCP_v1.8.pdf',             type:'Leave-Behind',    icon:'📄', tags:{ therapeutic_area:['obesity','type_2_diabetes'], content_type:['hcp_education'],                      audience:['pcp'],                      topic:['efficacy'],          format:['pdf'] }, description:'GLP-1 class overview for PCP introduction visits. Compares Wegovy efficacy vs. class agents.',                                               date:'Aug 2024', downloads:291, status:'active'      },
  { id:'DOC-008', filename:'Formulary_PA_SupportToolkit_v2.1.pdf',        type:'PA Tool',         icon:'🏥', tags:{ therapeutic_area:['obesity'],                  content_type:['access'],                             audience:['payer','pcp'],              topic:['access'],            format:['pdf'] }, description:'Prior authorization appeal letter templates + formulary positioning data for payer conversations.',                                           date:'Mar 2025', downloads:265, status:'active'      },
  { id:'DOC-009', filename:'Wegovy_SimplifiedTitration_v2.pdf',           type:'Quick Reference', icon:'📋', tags:{ therapeutic_area:['obesity'],                  content_type:['hcp_education','patient_education'],  audience:['endocrinologist'],          topic:['titration'],         format:['pdf'] }, description:'Simplified 1-page titration guide — outperforms full guide by 7.4 pp Rx lift.',                                                             date:'Jan 2025', downloads:178, status:'active'      },
  { id:'DOC-010', filename:'STEP5_Safety_ClinicalSummary_v1.2.pdf',       type:'Clinical Summary',icon:'🔬', tags:{ therapeutic_area:['obesity'],                  content_type:['clinical','hcp_education'],           audience:['endocrinologist'],          topic:['safety'],            format:['pdf'] }, description:'STEP-5 two-year long-term safety data. Tolerability, discontinuation rates, and CV signals.',                                                date:'Dec 2024', downloads:93,  status:'active'      },
  { id:'DOC-011', filename:'WeightLoss_PatientJourney_VideoModule.mp4',   type:'Video',           icon:'🎬', tags:{ therapeutic_area:['obesity'],                  content_type:['patient_education'],                  audience:['patient'],                  topic:['efficacy'],          format:['video']},description:'Patient testimonial video: 6-month weight loss journey with Wegovy. For waiting room & digital channels.',                                    date:'Nov 2024', downloads:145, status:'active'      },
  { id:'DOC-012', filename:'Dosing_Flexibility_Email_PCP.html',           type:'Email',           icon:'✉️', tags:{ therapeutic_area:['obesity'],                  content_type:['hcp_education'],                      audience:['pcp'],                      topic:['titration'],         format:['pdf'] }, description:'Monthly drip email to PCP panel on dosing flexibility and GI management during titration.',                                                  date:'Oct 2024', downloads:310, status:'active'      },
  { id:'DOC-013', filename:'Obesity_T2D_Comorbidity_Pamphlet.pdf',        type:'Pamphlet',        icon:'📰', tags:{ therapeutic_area:['obesity','type_2_diabetes'], content_type:['patient_education','hcp_education'],  audience:['patient','pcp'],            topic:['efficacy','safety'], format:['pdf'] }, description:'Tri-fold pamphlet on obesity-T2D comorbidity management with Wegovy. For clinic waiting areas.',                                              date:'Feb 2025', downloads:221, status:'active'      },
  { id:'DOC-014', filename:'CostSupport_PatientAssistance_v1.5.pdf',      type:'Access Guide',    icon:'💊', tags:{ therapeutic_area:['obesity'],                  content_type:['access','patient_education'],         audience:['patient','payer'],          topic:['cost','access'],     format:['pdf'] }, description:'Patient assistance program guide: savings card, co-pay support, income eligibility tiers.',                                                   date:'Jan 2025', downloads:289, status:'active'      },
  { id:'DOC-015', filename:'CVOT_DataSummary_CardioPresentation.pptx',    type:'Slide Deck',      icon:'📊', tags:{ therapeutic_area:['type_2_diabetes'],          content_type:['clinical','hcp_education'],           audience:['endocrinologist'],          topic:['efficacy'],          format:['ppt'] }, description:'CVOT comprehensive deck for cardiology CME: 32 slides, SUSTAIN-6 + SELECT trial analysis.',                                                  date:'Mar 2025', downloads:88,  status:'active'      },
  { id:'DOC-016', filename:'Adherence_CheckIn_Email_12wk.html',           type:'Email',           icon:'✉️', tags:{ therapeutic_area:['obesity'],                  content_type:['patient_education','hcp_education'],  audience:['endocrinologist','patient'],topic:['titration'],         format:['pdf'] }, description:'12-week patient adherence check-in email sequence. Awaiting MLR clearance.',                                                                 date:'Mar 2025', downloads:0,   status:'pending_mlr' },
  { id:'DOC-017', filename:'WeightManagement_DigitalBanner_v1.1.jpg',     type:'Digital Banner',  icon:'🖥️', tags:{ therapeutic_area:['obesity'],                  content_type:['patient_education'],                  audience:['patient'],                  topic:['efficacy'],          format:['pdf'] }, description:'Weight outcomes digital banner for HCP portal placements. 300×250 and 728×90 formats.',                                                      date:'Aug 2024', downloads:428, status:'active'      },
  { id:'DOC-018', filename:'InjectionTraining_VideoModule_v1.3.mp4',      type:'Video',           icon:'🎬', tags:{ therapeutic_area:['obesity'],                  content_type:['patient_education'],                  audience:['patient'],                  topic:['titration'],         format:['video']},description:'Step-by-step injection technique video for new Wegovy patients. Available in English & Spanish.',                                            date:'Oct 2024', downloads:145, status:'active'      },
  { id:'DOC-019', filename:'T2D_WeightMgmt_JointLeaveB_v1.pdf',          type:'Leave-Behind',    icon:'📄', tags:{ therapeutic_area:['type_2_diabetes','obesity'], content_type:['hcp_education','clinical'],           audience:['endocrinologist','pcp'],    topic:['efficacy','safety'], format:['pdf'] }, description:'Joint T2D + weight management leave-behind for endocrinologists managing dual-indication patients.',                                           date:'Feb 2025', downloads:156, status:'active'      },
  { id:'DOC-020', filename:'Payer_Access_PriorAuth_Deck.pptx',            type:'Slide Deck',      icon:'📊', tags:{ therapeutic_area:['obesity'],                  content_type:['access'],                             audience:['payer'],                    topic:['cost','access'],     format:['ppt'] }, description:'Payer meeting deck: formulary positioning, health economic data, utilisation management strategy.',                                           date:'Jan 2025', downloads:67,  status:'active'      },
];

const CONTENT_DB_STATS = {
  total: CONTENT_DB.length,
  byType: ['Leave-Behind','Email','Patient Guide','Detail Aid','Clinical Summary','Quick Reference','Video','Pamphlet','PA Tool','Access Guide','Slide Deck','Digital Banner'],
  byStatus: { active: CONTENT_DB.filter(d => d.status === 'active').length, pending_mlr: CONTENT_DB.filter(d => d.status === 'pending_mlr').length },
};

// Helper: filter CONTENT_DB by query string + active tag filters
function filterContentDB(query, activeFilters) {
  return CONTENT_DB.filter(item => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const haystack = [
        item.filename, item.type, item.description,
        ...Object.values(item.tags).flat(),
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    for (const [dim, tagList] of Object.entries(activeFilters)) {
      if (!tagList || tagList.length === 0) continue;
      const itemTags = item.tags[dim] || [];
      if (!tagList.some(t => itemTags.includes(t))) return false;
    }
    return true;
  });
}

const TAXONOMY_META = [
  {
    dimension: 'therapeutic_area',
    label: 'Therapeutic Area',
    labels: ['obesity', 'type_2_diabetes'],
    color: VIOLET,
    bg: '#F3F0FF',
  },
  {
    dimension: 'content_type',
    label: 'Content Type',
    labels: ['clinical', 'patient_education', 'hcp_education', 'access'],
    color: ACCENT,
    bg: '#E0F2FE',
  },
  {
    dimension: 'audience',
    label: 'Audience',
    labels: ['endocrinologist', 'pcp', 'patient', 'payer'],
    color: '#0891b2',
    bg: '#E0F2FE',
  },
  {
    dimension: 'topic',
    label: 'Topic',
    labels: ['efficacy', 'safety', 'titration', 'cost', 'access'],
    color: GREEN,
    bg: '#E8F7F0',
  },
  {
    dimension: 'format',
    label: 'Format',
    labels: ['pdf', 'ppt', 'video'],
    color: AMBER,
    bg: '#FFF8E6',
  },
];

const PIPELINE_STEPS = [
  { key: 'preprocessing', label: 'Processing the document' },
  { key: 'understanding', label: 'Understanding document' },
  { key: 'scoring',       label: 'Calculating signals' },
  { key: 'aggregating',   label: 'Aggregating scores' },
  { key: 'finalizing',    label: 'Finalizing tags' },
];

const SAMPLE_DOC = `WEGOVY® (semaglutide injection 2.4 mg) — Clinical Evidence Summary

EFFICACY
In the STEP-1 trial (n=1,961 adults with obesity), patients treated with Wegovy achieved a
mean body weight reduction of 14.9% at 68 weeks vs. 2.4% with placebo (p<0.001).
The STEP-2 trial demonstrated efficacy in patients with type 2 diabetes (T2D), with a
mean weight reduction of 9.6% vs. 3.4% with placebo.

CARDIOVASCULAR OUTCOMES
The SUSTAIN-6 CVOT demonstrated a 26% reduction in major adverse cardiovascular events
(MACE) in patients with T2D at high CV risk (HR 0.74; 95% CI 0.58–0.95).

TITRATION & DOSING
Wegovy is initiated at 0.25 mg subcutaneous weekly for 4 weeks, then titrated in 4-week
increments to the maintenance dose of 2.4 mg weekly. The titration schedule is designed
to reduce GI adverse events.

IMPORTANT SAFETY INFORMATION
Wegovy® is contraindicated in patients with a personal or family history of MTC or MEN 2.
The most common adverse reactions (≥5%) are nausea, diarrhea, vomiting, and constipation.
Refer to full Prescribing Information including Boxed Warning.

INDICATION
Wegovy® is indicated as an adjunct to a reduced-calorie diet and increased physical activity
for chronic weight management in adults with obesity (BMI ≥30) or overweight (BMI ≥27)
with ≥1 weight-related comorbidity.

AUDIENCE
This clinical summary is intended for HCPs including endocrinologists and primary care
physicians (PCPs) prescribing chronic weight management therapies.

See full Prescribing Information including Boxed Warning.`;

function StepRow({ step, logEntry }) {
  const status = logEntry?.status || 'pending';
  const message = logEntry?.message || '';

  const dot = status === 'done'
    ? <CheckCircle2 size={14} color={GREEN} />
    : status === 'running'
      ? <Loader2 size={14} color={ACCENT} style={{ animation: 'spin 1s linear infinite' }} />
      : status === 'error'
        ? <AlertTriangle size={14} color={RED} />
        : <div style={{ width: 14, height: 14, borderRadius: '50%', background: BORDER }} />;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      background: status === 'running' ? '#F0F9FF' : status === 'done' ? '#F6FEF9' : status === 'error' ? '#FFF3F2' : BG,
      border: `1px solid ${status === 'running' ? '#BAE6FD' : status === 'done' ? '#D1FAE5' : status === 'error' ? '#FECACA' : BORDER}`,
      transition: 'all 0.2s',
    }}>
      <div style={{ marginTop: 1, flexShrink: 0 }}>{dot}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: status === 'pending' ? MUTED : INK }}>
          {step.label}
        </div>
        {message && (
          <div style={{ fontSize: 11, color: status === 'done' ? GREEN : MUTED, marginTop: 2, lineHeight: 1.4 }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function TagChip({ label, score, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 99,
      background: bg, color: color, border: `1px solid ${color}22`,
      fontSize: 12, fontWeight: 700,
    }}>
      {label.replace(/_/g, ' ')}
      {score !== undefined && (
        <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.75 }}>
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
}

function AutoTaggingTab() {
  // ── Archive search state ──────────────────────────────────────────────────
  const [query,         setQuery]         = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilters,   setShowFilters]   = useState(false);
  const [previewDoc,    setPreviewDoc]    = useState(null);
  const [showUpload,    setShowUpload]    = useState(false);

  const filteredDocs = filterContentDB(query, activeFilters);

  function toggleTagFilter(dim, tag) {
    setActiveFilters(prev => {
      const cur = prev[dim] || [];
      const next = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag];
      return { ...prev, [dim]: next };
    });
  }
  function clearFilters() { setQuery(''); setActiveFilters({}); }
  const hasFilters = query.trim() || Object.values(activeFilters).some(v => v && v.length > 0);

  // ── Upload + pipeline state ───────────────────────────────────────────────
  const [docText,    setDocText]    = useState('');
  const [fileName,   setFileName]   = useState('');
  const [dragging,   setDragging]   = useState(false);
  const [running,    setRunning]    = useState(false);
  const [logs,       setLogs]       = useState({});
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');
  const [showTaxonomy, setShowTaxonomy] = useState(false);
  const fileRef = useRef(null);
  const abortRef = useRef(null);

  function loadFile(file) {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setLogs({});
    setError('');
    const reader = new FileReader();
    reader.onload = e => setDocText(e.target.result || '');
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  }

  function loadSample() {
    setFileName('sample_wegovy_clinical_summary.txt');
    setDocText(SAMPLE_DOC);
    setResult(null);
    setLogs({});
    setError('');
  }

  async function handleRun() {
    if (!docText.trim()) { setError('Please upload a document or load the sample first.'); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRunning(true);
    setResult(null);
    setError('');
    setLogs(Object.fromEntries(PIPELINE_STEPS.map(s => [s.key, { status: 'pending', message: '' }])));

    try {
      const token   = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const baseUrl = api.defaults.baseURL || '';

      const res = await fetch(`${baseUrl}/content-strategy/auto-tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ document_text: docText }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { setRunning(false); return; }
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'log') {
              setLogs(prev => ({ ...prev, [evt.step]: { status: evt.status, message: evt.message } }));
            } else if (evt.type === 'result') {
              setResult(evt);
            } else if (evt.type === 'error') {
              setError(evt.message);
            }
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const hasDoc    = docText.trim().length > 0;
  const hasResult = result && result.tags;
  const anyLog    = Object.keys(logs).length > 0;

  // Status pill colour for archive cards
  const docStatusCfg = {
    active:      { label: 'Active',      color: GREEN,  bg: '#E8F7F0' },
    pending_mlr: { label: 'Pending MLR', color: AMBER,  bg: '#FFF8E6' },
    draft:       { label: 'Draft',       color: MUTED,  bg: BG        },
  };

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Agent insight banner ────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F1B2D 0%, #1A2D45 100%)',
        borderRadius: 12, border: `1px solid rgba(2,132,199,0.35)`,
        padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'flex-start',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: `${ACCENT}12`,
        }} />
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Tag size={18} color={ACCENT} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Auto-Tagging Agent
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#64748B', background: 'rgba(255,255,255,0.08)', padding: '1px 7px', borderRadius: 99 }}>
              5 dimensions · keyword + semantic scoring
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 }}>
            <strong style={{ color: '#E2E8F0' }}>{CONTENT_DB_STATS.total} promotional materials</strong> in archive across PDFs, emails, pamphlets, videos, and slide decks — all tagged across therapeutic area, audience, topic, content type, and format.
            Search the archive below, or upload a new document to run the tagging pipeline.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {[
              { label: `${CONTENT_DB_STATS.byStatus.active} active`, color: GREEN },
              { label: `${CONTENT_DB_STATS.byStatus.pending_mlr} pending MLR`, color: AMBER },
              { label: '5 content types', color: ACCENT },
            ].map(chip => (
              <span key={chip.label} style={{
                fontSize: 10, fontWeight: 700, color: chip.color,
                background: `${chip.color}18`, padding: '2px 9px', borderRadius: 99,
              }}>{chip.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — CONTENT ARCHIVE
      ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>

        {/* Archive header */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(90deg, #F6F9FC 0%, #fff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Archive size={15} color={ACCENT} />
            <span style={{ fontSize: 14, fontWeight: 800, color: INK }}>Promotional Material Archive</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: MUTED,
              background: BG, border: `1px solid ${BORDER}`,
              padding: '2px 8px', borderRadius: 99,
            }}>
              {filteredDocs.length} of {CONTENT_DB.length} assets
            </span>
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, border: `1px solid ${showFilters ? ACCENT : BORDER}`,
              background: showFilters ? '#E0F2FE' : '#fff',
              color: showFilters ? ACCENT : MUTED, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Filter size={11} /> Filters {hasFilters && <span style={{ color: ACCENT }}>●</span>}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} style={{
              fontSize: 11, color: RED, fontWeight: 700,
              border: 'none', background: 'none', cursor: 'pointer', padding: 0,
            }}>Clear all</button>
          )}
        </div>

        {/* Search bar */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: BG }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}>
              <Eye size={13} color={MUTED} />
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Search by keyword or natural language — e.g. "titration guide for PCP" or "patient safety email"'
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px 9px 34px', borderRadius: 8,
                border: `1px solid ${query ? ACCENT : BORDER}`,
                fontSize: 12, color: INK, background: '#fff',
                outline: 'none', transition: 'border-color 0.15s',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                border: 'none', background: 'none', cursor: 'pointer', color: MUTED, fontSize: 14,
              }}>×</button>
            )}
          </div>
        </div>

        {/* Tag filter pills */}
        {showFilters && (
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: '#FAFCFF' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TAXONOMY_META.map(meta => (
                <div key={meta.dimension} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, width: 110, flexShrink: 0 }}>
                    {meta.label}
                  </span>
                  {meta.labels.map(tag => {
                    const isActive = (activeFilters[meta.dimension] || []).includes(tag);
                    return (
                      <button key={tag} onClick={() => toggleTagFilter(meta.dimension, tag)} style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${isActive ? meta.color : BORDER}`,
                        background: isActive ? meta.bg : '#fff',
                        color: isActive ? meta.color : MUTED,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        {tag.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Asset grid */}
        <div style={{ padding: '16px 20px' }}>
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: MUTED }}>
              <Tag size={28} color={BORDER} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>No assets match your search</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Try different keywords or clear filters</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {filteredDocs.map(doc => {
                const stCfg = docStatusCfg[doc.status] || docStatusCfg.draft;
                const keyTags = [
                  ...(doc.tags.audience || []).slice(0, 1),
                  ...(doc.tags.topic || []).slice(0, 1),
                ].map(t => t.replace(/_/g, ' '));

                return (
                  <div
                    key={doc.id}
                    onClick={() => setPreviewDoc(previewDoc?.id === doc.id ? null : doc)}
                    style={{
                      background: previewDoc?.id === doc.id ? '#F0F9FF' : '#fff',
                      borderRadius: 10,
                      border: `1px solid ${previewDoc?.id === doc.id ? ACCENT : BORDER}`,
                      padding: '12px 14px', cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}
                    onMouseEnter={e => { if (previewDoc?.id !== doc.id) e.currentTarget.style.borderColor = '#94A3B8'; }}
                    onMouseLeave={e => { if (previewDoc?.id !== doc.id) e.currentTarget.style.borderColor = BORDER; }}
                  >
                    {/* Icon + type + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{doc.icon}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: ACCENT,
                        background: '#E0F2FE', padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                      }}>{doc.type}</span>
                      <span style={{
                        marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                        color: stCfg.color, background: stCfg.bg,
                        padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                      }}>{stCfg.label}</span>
                    </div>

                    {/* Filename */}
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: INK,
                      lineHeight: 1.3, wordBreak: 'break-all',
                    }}>
                      {doc.filename}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
                      {doc.description.length > 90 ? doc.description.slice(0, 88) + '…' : doc.description}
                    </div>

                    {/* Key tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {keyTags.map(t => (
                        <span key={t} style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                          background: '#E0F2FE', color: ACCENT,
                        }}>{t}</span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: MUTED }}>{doc.date}</span>
                      {doc.downloads > 0 && (
                        <span style={{ fontSize: 10, color: MUTED }}>
                          <Download size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                          {doc.downloads.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expanded preview panel */}
        {previewDoc && (
          <div style={{
            margin: '0 20px 20px', borderRadius: 10,
            border: `1px solid ${ACCENT}`, background: '#F0F9FF', padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{previewDoc.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{previewDoc.filename}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: '#E0F2FE', padding: '1px 7px', borderRadius: 4 }}>
                    {previewDoc.type}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginBottom: 10 }}>
                  {previewDoc.description}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {TAXONOMY_META.map(meta => {
                    const tags = previewDoc.tags[meta.dimension] || [];
                    if (!tags.length) return null;
                    return (
                      <div key={meta.dimension} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, width: 110, flexShrink: 0 }}>
                          {meta.label}
                        </span>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {tags.map(t => (
                            <span key={t} style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                              background: meta.bg, color: meta.color,
                            }}>{t.replace(/_/g, ' ')}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{
                fontSize: 18, color: MUTED, border: 'none', background: 'none',
                cursor: 'pointer', lineHeight: 1, flexShrink: 0,
              }}>×</button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — TAG NEW DOCUMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <button
          onClick={() => setShowUpload(v => !v)}
          style={{
            width: '100%', padding: '14px 20px', border: 'none', background: 'none',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            borderBottom: showUpload ? `1px solid ${BORDER}` : 'none',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Upload size={13} color={ACCENT} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Tag New Document</span>
          <span style={{ fontSize: 11, color: MUTED }}>· Upload a new promotional material to classify and add to the archive</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>
            {showUpload ? '▲' : '▼'}
          </span>
        </button>

        {showUpload && (
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20, alignItems: 'start' }}>

            {/* ── Left: upload + logs ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? ACCENT : BORDER}`,
                  borderRadius: 12, padding: '28px 20px',
                  background: dragging ? '#F0F9FF' : BG,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <input ref={fileRef} type="file" accept=".txt,.pdf,.docx,.pptx,.csv"
                  style={{ display: 'none' }} onChange={e => loadFile(e.target.files?.[0])} />
                <Upload size={28} color={dragging ? ACCENT : MUTED} style={{ marginBottom: 10 }} />
                {fileName ? (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{fileName}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{docText.length.toLocaleString()} chars · click to replace</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>Drop a document here</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>or click to browse · TXT, PDF, DOCX, PPTX</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={loadSample} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: '#fff', color: MUTED, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <FileText size={13} /> Load Sample
                </button>
                <button onClick={handleRun} disabled={running || !hasDoc} style={{
                  flex: 2, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: running ? '#BAE6FD' : !hasDoc ? '#F6F9FC' : ACCENT,
                  color: !hasDoc ? MUTED : '#fff', fontWeight: 700, fontSize: 13,
                  cursor: running || !hasDoc ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'background 0.2s',
                }}>
                  {running
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running Pipeline…</>
                    : <><Sparkles size={14} /> Run Auto-Tagging</>}
                </button>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFF3F2', border: `1px solid #FECACA`, color: RED, fontSize: 12 }}>
                  <AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}
                </div>
              )}

              {anyLog && (
                <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChevronRight size={14} color={ACCENT} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Processing Log</span>
                    {running && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: ACCENT, background: '#E0F2FE', padding: '2px 8px', borderRadius: 99 }}>LIVE</span>}
                    {!running && hasResult && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: GREEN, background: '#E8F7F0', padding: '2px 8px', borderRadius: 99 }}>COMPLETE</span>}
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PIPELINE_STEPS.map(step => <StepRow key={step.key} step={step} logEntry={logs[step.key]} />)}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: results ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {hasResult ? (
                <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={14} color={ACCENT} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Auto-Tag Results</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: GREEN, background: '#E8F7F0', padding: '2px 8px', borderRadius: 99 }}>
                      {result.tag_count} tags assigned
                    </span>
                  </div>
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {TAXONOMY_META.map(meta => {
                      const dimTags  = result.tags?.[meta.dimension] || [];
                      const dimScores = result.scores?.[meta.dimension] || {};
                      const dimExpls  = result.explanations?.[meta.dimension] || {};
                      return (
                        <div key={meta.dimension}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                            {meta.label}
                          </div>
                          {dimTags.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {dimTags.map(tag => (
                                <div key={tag}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <TagChip label={tag} score={dimScores[tag]} color={meta.color} bg={meta.bg} />
                                  </div>
                                  {dimExpls[tag]?.slice(0, 3).map((exp, i) => (
                                    <div key={i} style={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>· {exp}</div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: MUTED, fontStyle: 'italic' }}>No tags above threshold</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '12px 18px', borderTop: `1px solid ${BORDER}`, background: BG }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 6 }}>Structured Output</div>
                    <pre style={{
                      margin: 0, fontSize: 10, color: INK, background: '#fff',
                      border: `1px solid ${BORDER}`, borderRadius: 7,
                      padding: '10px 12px', overflowX: 'auto',
                      fontFamily: 'monospace', lineHeight: 1.6,
                    }}>{JSON.stringify(result.tags, null, 2)}</pre>
                  </div>
                </div>
              ) : !anyLog ? (
                <div style={{ background: BG, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '40px 28px', textAlign: 'center' }}>
                  <Tag size={32} color={BORDER} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>No document tagged yet</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 6, lineHeight: 1.6, maxWidth: 280, margin: '8px auto 0' }}>
                    Upload a document (or load the sample) and click <strong>Run Auto-Tagging</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ background: BG, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '40px 28px', textAlign: 'center' }}>
                  <Loader2 size={28} color={ACCENT} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>Pipeline running…</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Results will appear here when complete</div>
                </div>
              )}

              {/* Taxonomy reference */}
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <button onClick={() => setShowTaxonomy(v => !v)} style={{
                  width: '100%', padding: '12px 18px', border: 'none', background: 'none',
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  borderBottom: showTaxonomy ? `1px solid ${BORDER}` : 'none',
                }}>
                  <Info size={13} color={MUTED} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Taxonomy Reference</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>
                    {showTaxonomy ? 'Hide' : 'Show'} · 5 dimensions · 18 labels
                  </span>
                </button>
                {showTaxonomy && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: BG }}>
                          {['Dimension', 'Labels', 'Count'].map(h => (
                            <th key={h} style={{
                              padding: '8px 14px', textAlign: 'left', color: MUTED,
                              fontWeight: 700, fontSize: 10, textTransform: 'uppercase',
                              letterSpacing: '0.05em', borderBottom: `1px solid ${BORDER}`,
                              whiteSpace: 'nowrap',
                            }}>{h}</th>
                          ))}
                            </tr>
                          </thead>
                          <tbody>
                            {TAXONOMY_META.map((meta, i) => (
                              <tr key={meta.dimension} style={{
                                borderBottom: i < TAXONOMY_META.length - 1 ? `1px solid ${BORDER}` : 'none',
                                background: i % 2 === 0 ? '#fff' : BG,
                              }}>
                                <td style={{ padding: '10px 14px', fontWeight: 700, color: meta.color, whiteSpace: 'nowrap' }}>
                                  {meta.label}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {meta.labels.map(lbl => (
                                      <span key={lbl} style={{
                                        padding: '2px 8px', borderRadius: 99,
                                        background: meta.bg, color: meta.color,
                                        fontSize: 10, fontWeight: 700,
                                      }}>
                                        {lbl.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ padding: '10px 14px', color: MUTED, fontWeight: 700 }}>
                                  {meta.labels.length}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — Overview  (was TAB 1 before Auto-Tagging was added)
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const topAssets = [...APPROVED].sort((a, b) => b.rx_lift - a.rx_lift).slice(0, 6);
  const alerts = APPROVED.filter(a => !a.tagged || a.rx_lift < 4 || (a.downloads > 200 && a.rx_lift < 4));

  const barData = topAssets.map(a => ({
    name: a.name.length > 24 ? a.name.slice(0, 22) + '…' : a.name,
    rx_lift: a.rx_lift,
    audience: a.audience,
  }));

  const BARCOLORS = topAssets.map(a =>
    AUD_CFG[a.audience]?.color || ACCENT
  );

  return (
    <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:20 }}>

      {/* Agent insight */}
      <AgentInsightPanel
        endpoint="/content-strategy/agent-insight"
        screenId="content-strategy-overview"
        accentColor={ACCENT}
        insightOnly={true}
      />

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <MetricCard label="Total Assets"      value={TOTAL_ASSETS}          unit=""     accent={ACCENT} />
        <MetricCard label="Avg Rx Lift"       value={`${AVG_RX_LIFT}%`}     unit=""     accent={GREEN}  />
        <MetricCard label="Avg Asset Reuse"   value={`${REUSE_RATE}×`}      unit=""     accent={VIOLET} />
        <MetricCard label="Auto-Tag Accuracy" value={`${AUTO_TAG_ACC}%`}    unit=""     accent={AMBER}  />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20 }}>

        {/* Top performing content */}
        <div style={{
          background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden',
        }}>
          <div style={{
            padding:'14px 18px', borderBottom:`1px solid ${BORDER}`,
            display:'flex', alignItems:'center', gap:8,
          }}>
            <TrendingUp size={14} color={GREEN} />
            <span style={{ fontSize:13, fontWeight:700, color: INK }}>Top Performing Content</span>
            <span style={{ marginLeft:'auto', fontSize:11, color: MUTED }}>Ranked by Rx lift</span>
          </div>
          <div style={{ padding:'8px 0' }}>
            {topAssets.map((a, i) => (
              <div key={a.id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'9px 18px', borderBottom: i < topAssets.length - 1 ? `1px solid ${BORDER}` : 'none',
              }}>
                <div style={{
                  width:24, height:24, borderRadius:'50%',
                  background: i < 3 ? ACCENT : '#E6EDF3',
                  color: i < 3 ? '#fff' : MUTED,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:700, flexShrink:0,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: INK, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {a.name}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    <AudChip aud={a.audience} />
                    <span style={{ fontSize:10, color: MUTED }}>{a.type}</span>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color: GREEN }}>{a.rx_lift}%</div>
                  <div style={{ fontSize:10, color: MUTED }}>Rx lift</div>
                </div>
              </div>
            ))}
          </div>
          {/* Mini chart */}
          <div style={{ padding:'12px 18px 16px', borderTop:`1px solid ${BORDER}` }}>
            <div style={{ fontSize:11, color: MUTED, marginBottom:8, fontWeight:600 }}>Rx Lift by Asset (top 6)</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={barData} barCategoryGap="25%">
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 'dataMax + 4']} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Rx Lift']}
                  contentStyle={{ fontSize:11, borderRadius:8, border:`1px solid ${BORDER}` }}
                />
                <Bar dataKey="rx_lift" radius={[4,4,0,0]}>
                  {barData.map((_, i) => <Cell key={i} fill={BARCOLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: gaps + alerts */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Content gaps */}
          <div style={{
            background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden', flex:1,
          }}>
            <div style={{
              padding:'14px 18px', borderBottom:`1px solid ${BORDER}`,
              display:'flex', alignItems:'center', gap:8,
            }}>
              <Tag size={14} color={AMBER} />
              <span style={{ fontSize:13, fontWeight:700, color: INK }}>Content Gaps</span>
              <span style={{
                marginLeft:'auto', padding:'2px 8px', borderRadius:99,
                background:'#FFF8E6', color: AMBER, fontSize:11, fontWeight:700,
              }}>
                {GAPS.length} missing
              </span>
            </div>
            <div style={{ padding:'10px 18px', display:'flex', flexDirection:'column', gap:8, maxHeight:220, overflowY:'auto' }}>
              {GAPS.map((g, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'7px 10px', borderRadius:8, background: BG,
                  border:`1px solid ${BORDER}`,
                }}>
                  <AlertTriangle size={11} color={AMBER} style={{ flexShrink:0 }} />
                  <AudChip aud={g.audience} />
                  <span style={{ fontSize:11, color: INK, fontWeight:500 }}>{g.topic}</span>
                  <span style={{ marginLeft:'auto', fontSize:10, color: MUTED }}>No assets</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div style={{
            background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden',
          }}>
            <div style={{
              padding:'12px 18px', borderBottom:`1px solid ${BORDER}`,
              display:'flex', alignItems:'center', gap:8,
            }}>
              <AlertTriangle size={14} color={RED} />
              <span style={{ fontSize:13, fontWeight:700, color: INK }}>Alerts</span>
              <span style={{
                marginLeft:'auto', padding:'2px 8px', borderRadius:99,
                background:'#FFF3F2', color: RED, fontSize:11, fontWeight:700,
              }}>
                {alerts.length} items
              </span>
            </div>
            <div style={{ padding:'8px 18px 12px', display:'flex', flexDirection:'column', gap:6 }}>
              {alerts.slice(0, 4).map((a, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                  <div style={{
                    width:6, height:6, borderRadius:'50%', marginTop:5, flexShrink:0,
                    background: !a.tagged ? AMBER : a.rx_lift < 4 ? RED : MUTED,
                  }} />
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color: INK }}>{a.name}</div>
                    <div style={{ fontSize:10, color: MUTED }}>
                      {!a.tagged ? 'Not auto-tagged — poor discoverability' :
                       (a.downloads > 200 && a.rx_lift < 4) ? `High usage (${a.downloads} downloads) but only ${a.rx_lift}% Rx lift` :
                       `Low Rx lift: ${a.rx_lift}% — review for refresh`}
                    </div>
                  </div>
                </div>
              ))}
              {/* MLR pending */}
              {ASSETS.filter(a => a.status === 'pending_mlr').map((a, i) => (
                <div key={`mlr-${i}`} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', marginTop:5, flexShrink:0, background: AMBER }} />
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color: INK }}>{a.name}</div>
                    <div style={{ fontSize:10, color: MUTED }}>Pending MLR review — not yet available for field use</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — Content Studio
// ─────────────────────────────────────────────────────────────────────────────
const OBJECTIVES  = ['HCP Education', 'PA Support', 'Disease Awareness', 'Product Launch', 'Adherence Support'];
const AUDIENCES_L = ['Endocrinology', 'PCP', 'Cardiology'];
const TOPICS_L    = ['Efficacy', 'Safety', 'Titration', 'CV Outcomes', 'Adherence', 'Formulary/Access', 'MOA'];
const SOURCES_L   = ['Prescribing Information (PI)', 'STEP-1 Trial Data', 'SUSTAIN-6 CVOT', 'Real-World Evidence', 'Patient Reported Outcomes'];
const TEMPLATES   = [
  { id:'tpl-1', label:'HCP Leave-Behind (1-pager)', icon:'📄', desc:'Single-page summary for rep visits' },
  { id:'tpl-2', label:'Email — Clinical',           icon:'✉️', desc:'Clinical evidence email for HCP outreach' },
  { id:'tpl-3', label:'Patient Guide',              icon:'📋', desc:'Patient-facing adherence support material' },
  { id:'tpl-4', label:'PA Support Letter',          icon:'🏥', desc:'Prior Authorization support template' },
  { id:'tpl-5', label:'Clinical Summary (2-pg)',    icon:'📊', desc:'Two-page clinical trial summary for detail aids' },
  { id:'tpl-6', label:'Digital Banner',             icon:'🖥️',  desc:'Short-format digital engagement asset' },
];
const CITATIONS = [
  { ref:'[1]', text:'Wilding JPH et al. N Engl J Med. 2021;384:989-1002. (STEP-1: −14.9% body weight)' },
  { ref:'[2]', text:'Marso SP et al. N Engl J Med. 2016;375:1834-1844. (SUSTAIN-6: 26% CV event reduction)' },
  { ref:'[3]', text:'Wegovy® (semaglutide) Prescribing Information. Novo Nordisk, 2023.' },
  { ref:'[4]', text:'Davies M et al. Lancet. 2021;397:971-984. (STEP-2: T2D population efficacy)' },
];
const MOCK_DRAFT = `WEGOVY® (semaglutide injection 2.4 mg) — Clinical Evidence Summary

EFFICACY
In the STEP-1 trial (n=1,961 adults with obesity), patients treated with Wegovy achieved a
mean body weight reduction of 14.9% at 68 weeks vs. 2.4% with placebo (p<0.001).[1]

CARDIOVASCULAR OUTCOMES
The SUSTAIN-6 CVOT demonstrated a 26% reduction in major adverse cardiovascular events
(MACE) in patients with T2D at high CV risk (HR 0.74; 95% CI 0.58–0.95).[2]

IMPORTANT SAFETY INFORMATION
Wegovy® is contraindicated in patients with a personal or family history of MTC or MEN 2.
The most common adverse reactions (≥5%) are nausea, diarrhea, vomiting, and constipation.

INDICATION
Wegovy® is indicated as an adjunct to a reduced-calorie diet and increased physical activity
for chronic weight management in adults with obesity (BMI ≥30) or overweight (BMI ≥27)
with ≥1 weight-related comorbidity.

See full Prescribing Information including Boxed Warning.[3]
`;

const MOCK_VARIATIONS = [
  {
    label: 'Variation A — Clinical Evidence Focus',
    tone: 'Data-heavy, peer-to-peer',
    wordCount: 148,
    tags: ['efficacy-forward', 'STEP-1 citation', 'PI compliant'],
    text: `WEGOVY® (semaglutide 2.4 mg) — Clinical Evidence Summary\n\nEFFICACY\nIn the STEP-1 trial (n=1,961), Wegovy achieved mean body weight reduction of 14.9% vs. 2.4% with placebo at 68 weeks (p<0.001).[1] 86.4% of patients achieved ≥5% weight loss.\n\nCARDIOVASCULAR OUTCOMES\nSUSTAIN-6 CVOT demonstrated 26% reduction in MACE in T2D patients at high CV risk (HR 0.74; 95% CI 0.58–0.95).[2]\n\nSAFETY\nContraindicated in personal/family history of MTC or MEN 2. Most common AEs (≥5%): nausea, diarrhea, vomiting, constipation.\n\nINDICATION\nAdjunct to reduced-calorie diet and physical activity for chronic weight management (BMI ≥30, or ≥27 with comorbidity).\n\nSee full Prescribing Information including Boxed Warning.[3]`,
  },
  {
    label: 'Variation B — Concise Key Messages',
    tone: 'Brief, action-oriented',
    wordCount: 82,
    tags: ['high-impact', 'headline-driven', 'rep leave-behind'],
    text: `WEGOVY® (semaglutide 2.4 mg)\n\n3 REASONS TO CONSIDER WEGOVY\n\n✓ PROVEN WEIGHT LOSS — 14.9% average body weight reduction at 68 weeks (STEP-1)[1]\n✓ CV BENEFIT — 26% reduction in MACE events in at-risk T2D patients (SUSTAIN-6)[2]\n✓ ONCE WEEKLY — Subcutaneous injection, self-administered\n\nFor appropriate patients: BMI ≥30, or ≥27 with ≥1 weight-related comorbidity.\n\nISI: Contraindicated with personal/family history MTC/MEN 2. See full PI.[3]`,
  },
  {
    label: 'Variation C — Mechanism & Differentiation',
    tone: 'Scientific, class-context',
    wordCount: 112,
    tags: ['MOA-focused', 'differentiation', 'GLP-1 context'],
    text: `WEGOVY® (semaglutide 2.4 mg) — Mechanism & Differentiation\n\nMECHANISM OF ACTION\nSemaglutide selectively activates GLP-1 receptors, reducing appetite and energy intake while slowing gastric emptying. The 2.4 mg dose is optimized specifically for weight management.\n\nDIFFERENTIATION\nWegovy delivers the highest weight reduction in its class: 14.9% vs. lifestyle alone (2.4%) in STEP-1.[1] Once-weekly dosing supports adherence with median on-treatment persistence of 12+ months in real-world cohorts.\n\nSAFETY PROFILE\nWell-characterized GI-related adverse events, transient in most patients. No new safety signals in post-marketing surveillance.\n\nSee full PI.[3]`,
  },
];

function ContentStudioTab() {
  const [objective,    setObjective]   = useState('HCP Education');
  const [audience,     setAudience]    = useState('Endocrinology');
  const [topic,        setTopic]       = useState('Efficacy');
  const [sources,      setSources]     = useState([SOURCES_L[0], SOURCES_L[1]]);
  const [template,     setTemplate]    = useState('tpl-1');
  const [generating,   setGenerating]  = useState(false);
  const [generationStep, setGenerationStep] = useState(null); // 'sourcing' | 'composing' | 'done'
  const [draftReady,   setDraftReady]  = useState(false);
  const [submitting,   setSubmitting]  = useState(false);
  const [submitted,    setSubmitted]   = useState(false);
  const [selectedVar,  setSelectedVar] = useState(null);
  const [modifyingVar, setModifyingVar] = useState(null);
  const [varTexts,     setVarTexts]    = useState(MOCK_VARIATIONS.map(v => v.text));

  // Map UI values → taxonomy tag keys for DB matching
  const audienceTagMap = { 'Endocrinology': 'endocrinologist', 'PCP': 'pcp', 'Cardiology': 'cardiologist' };
  const topicTagMap    = { 'Efficacy': 'efficacy', 'Safety': 'safety', 'Titration': 'titration',
    'CV Outcomes': 'cv_outcomes', 'Adherence': 'adherence', 'Formulary/Access': 'access', 'MOA': 'moa' };
  const audTag = audienceTagMap[audience] || audience.toLowerCase();
  const topTag = topicTagMap[topic] || topic.toLowerCase();
  const matchedSources = CONTENT_DB.filter(d =>
    (d.tags.audience || []).includes(audTag) || (d.tags.topic || []).includes(topTag)
  ).slice(0, 4);

  function toggleSource(s) {
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }
  function handleGenerate() {
    setGenerating(true);
    setDraftReady(false);
    setSubmitted(false);
    setSelectedVar(null);
    setModifyingVar(null);
    setGenerationStep('sourcing');
    setTimeout(() => setGenerationStep('composing'), 1400);
    setTimeout(() => {
      setGenerating(false);
      setDraftReady(true);
      setGenerationStep('done');
      setVarTexts(MOCK_VARIATIONS.map(v => v.text));
    }, 2800);
  }
  function handleSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      // Push to cross-tab MLR queue
      const varIdx = selectedVar;
      const varLabel = ['A', 'B', 'C'][varIdx];
      const tpl = TEMPLATES.find(t => t.id === template);
      pushMLRItem({
        id: 'MLR-2481',
        variation: varLabel,
        label: MOCK_VARIATIONS[varIdx].label,
        title: `${tpl?.label || 'Content'} — ${objective} (Var ${varLabel})`,
        content: varTexts[varIdx],
        wordCount: MOCK_VARIATIONS[varIdx].wordCount,
        tone: MOCK_VARIATIONS[varIdx].tone,
        audience: audience,
        objective: objective,
        topic: topic,
        submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'pending',
      });
    }, 1200);
  }

  const canSubmit = draftReady && selectedVar !== null;
  const complianceChecks = [
    { label: 'Fair balance included',     pass: draftReady },
    { label: 'AE disclosures present',    pass: draftReady },
    { label: 'Approved indications only', pass: draftReady },
    { label: 'Branding / brand mark',     pass: draftReady },
    { label: 'Citation references valid', pass: draftReady },
  ];

  return (
    <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:18 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes cs-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* ── Insight banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%)',
        border:`1px solid #BAE6FD`, borderRadius:10, padding:'12px 18px',
        display:'flex', gap:14, alignItems:'flex-start',
      }}>
        <Zap size={16} color={ACCENT} style={{ flexShrink:0, marginTop:2 }} />
        <div>
          <div style={{ fontSize:12, fontWeight:700, color: ACCENT, marginBottom:3 }}>Content Co-Pilot Agent</div>
          <div style={{ fontSize:12, color: INK, lineHeight:1.6 }}>
            Generate compliant HCP content in under 2 minutes by pulling from the <strong>{CONTENT_DB_STATS.total}-asset</strong> approved archive.
            The agent surfaces matching tagged sources, then produces <strong>3 differentiated variations</strong> — pick the one that fits, modify if needed, then send directly to MLR.
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.45fr 0.85fr', gap:18, alignItems:'start' }}>

        {/* ── LEFT: Draft Generator ── */}
        <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden' }}>
          <div style={{ padding:'13px 16px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
            <Zap size={13} color={ACCENT} />
            <span style={{ fontSize:13, fontWeight:700, color: INK }}>AI Draft Generator</span>
          </div>
          <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>

            {/* Objective */}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color: MUTED, display:'block', marginBottom:4 }}>Objective</label>
              <select value={objective} onChange={e => setObjective(e.target.value)} style={{
                width:'100%', padding:'7px 10px', borderRadius:7, border:`1px solid ${BORDER}`,
                fontSize:12, color: INK, background:'#fff',
              }}>
                {OBJECTIVES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Audience */}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color: MUTED, display:'block', marginBottom:4 }}>Audience</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {AUDIENCES_L.map(a => (
                  <button key={a} onClick={() => setAudience(a)} style={{
                    padding:'4px 10px', borderRadius:99, border:`1px solid`,
                    borderColor: audience === a ? ACCENT : BORDER,
                    background: audience === a ? '#E0F2FE' : '#fff',
                    color: audience === a ? ACCENT : MUTED,
                    fontSize:11, fontWeight:600, cursor:'pointer',
                  }}>{a}</button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color: MUTED, display:'block', marginBottom:4 }}>Topic</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} style={{
                width:'100%', padding:'7px 10px', borderRadius:7, border:`1px solid ${BORDER}`,
                fontSize:12, color: INK, background:'#fff',
              }}>
                {TOPICS_L.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Template */}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color: MUTED, display:'block', marginBottom:6 }}>Template</label>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setTemplate(t.id)} style={{
                    padding:'6px 10px', borderRadius:7,
                    border:`1px solid ${template === t.id ? ACCENT : BORDER}`,
                    background: template === t.id ? '#E0F2FE' : '#fff',
                    textAlign:'left', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:7,
                  }}>
                    <span style={{ fontSize:13 }}>{t.icon}</span>
                    <span style={{ fontSize:10, fontWeight:700, color: template === t.id ? ACCENT : INK }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color: MUTED, display:'block', marginBottom:6 }}>Approved Sources</label>
              {SOURCES_L.map(s => (
                <label key={s} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, cursor:'pointer' }}>
                  <input type="checkbox" checked={sources.includes(s)} onChange={() => toggleSource(s)} style={{ accentColor: ACCENT }} />
                  <span style={{ fontSize:11, color: INK }}>{s}</span>
                </label>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={generating} style={{
              marginTop:4, padding:'9px 0', borderRadius:8, border:'none',
              background: generating ? '#BAE6FD' : ACCENT, color:'#fff',
              fontWeight:700, fontSize:13, cursor: generating ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'background 0.2s',
            }}>
              {generating
                ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> Generating…</>
                : <><Zap size={14} /> Generate Draft</>}
            </button>
          </div>
        </div>

        {/* ── MIDDLE: Assembly Canvas / Variations ── */}
        <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'13px 16px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
            <BookOpen size={13} color={ACCENT} />
            <span style={{ fontSize:13, fontWeight:700, color: INK }}>
              {draftReady ? '3 Content Variations' : 'Assembly Canvas'}
            </span>
            {draftReady && selectedVar !== null && (
              <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color: GREEN, background:'#E8F7F0', padding:'2px 8px', borderRadius:99 }}>
                Variation {['A','B','C'][selectedVar]} selected
              </span>
            )}
            {!draftReady && !generating && (
              <span style={{ marginLeft:'auto', fontSize:10, color: MUTED }}>Configure left → Generate</span>
            )}
          </div>

          <div style={{ flex:1, padding:'14px 16px', overflowY:'auto' }}>

            {/* Idle */}
            {!generating && !draftReady && (
              <div style={{ textAlign:'center', padding:'36px 20px', color: MUTED }}>
                <Zap size={28} color={BORDER} style={{ marginBottom:12 }} />
                <div style={{ fontSize:13, fontWeight:600 }}>No content generated yet</div>
                <div style={{ fontSize:11, marginTop:6, lineHeight:1.6, maxWidth:260, margin:'8px auto 0' }}>
                  Configure objective, audience, and topic — then click <strong>Generate Draft</strong> to produce 3 variations from the approved archive.
                </div>
              </div>
            )}

            {/* Sourcing from DB */}
            {generating && generationStep === 'sourcing' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, background:'#F0F9FF', border:`1px solid #BAE6FD` }}>
                  <Loader2 size={15} color={ACCENT} style={{ animation:'spin 1s linear infinite', flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color: ACCENT }}>Sourcing from Content Archive…</div>
                    <div style={{ fontSize:10, color: MUTED, marginTop:2 }}>
                      Searching <strong>{CONTENT_DB_STATS.total}</strong> tagged assets · audience: <strong>{audience}</strong> · topic: <strong>{topic}</strong>
                    </div>
                  </div>
                </div>
                {(matchedSources.length > 0 ? matchedSources : CONTENT_DB.slice(0, 3)).map((doc, idx) => (
                  <div key={doc.id} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'8px 12px', borderRadius:8,
                    background: idx < 2 ? '#E8F7F0' : '#F6F9FC',
                    border:`1px solid ${idx < 2 ? '#A7F3D0' : BORDER}`,
                  }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{doc.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, fontWeight:700, color: INK, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.filename}</div>
                      <div style={{ fontSize:10, color: MUTED }}>{doc.type} · {(doc.tags.audience || []).join(', ')}</div>
                    </div>
                    {idx < 2
                      ? <CheckCircle2 size={13} color={GREEN} style={{ flexShrink:0 }} />
                      : <Clock size={12} color={MUTED} style={{ flexShrink:0 }} />}
                  </div>
                ))}
                <div style={{ fontSize:10, color: MUTED, textAlign:'center', marginTop:4 }}>
                  {matchedSources.length || 3} matching assets found · extracting approved modules…
                </div>
              </div>
            )}

            {/* Composing */}
            {generating && generationStep === 'composing' && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:'36px 20px' }}>
                <Loader2 size={28} color={ACCENT} style={{ animation:'spin 1s linear infinite' }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:700, color: INK, marginBottom:6 }}>Composing 3 content variations…</div>
                  <div style={{ fontSize:11, color: MUTED, lineHeight:1.7 }}>
                    Applying tone differentiation · mapping compliance modules<br />
                    Injecting citations · validating against PI
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {['A — Clinical', 'B — Concise', 'C — MOA'].map((v, i) => (
                    <span key={v} style={{
                      fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99,
                      background:'#E0F2FE', color: ACCENT,
                      animation:'cs-pulse 1s ease-in-out infinite',
                      animationDelay: i * 0.25 + 's',
                    }}>{v}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 3 Variations */}
            {draftReady && generationStep === 'done' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {MOCK_VARIATIONS.map((v, idx) => {
                  const isSelected  = selectedVar === idx;
                  const isModifying = modifyingVar === idx;
                  const varLabel    = ['A', 'B', 'C'][idx];
                  return (
                    <div key={idx} style={{
                      borderRadius:10, border:`2px solid ${isSelected ? ACCENT : BORDER}`,
                      background: isSelected ? '#F0F9FF' : '#fff',
                      overflow:'hidden', transition:'all 0.15s',
                    }}>

                      {/* Header */}
                      <div style={{
                        padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:10,
                        background: isSelected ? '#E0F2FE' : BG,
                        borderBottom:`1px solid ${isSelected ? '#BAE6FD' : BORDER}`,
                      }}>
                        <span style={{
                          width:22, height:22, borderRadius:6, flexShrink:0,
                          background: isSelected ? ACCENT : '#CBD5E1', color:'#fff',
                          fontWeight:800, fontSize:11,
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>{varLabel}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color: isSelected ? ACCENT : INK }}>{v.label}</div>
                          <div style={{ fontSize:10, color: MUTED, marginTop:1 }}>{v.tone} · {v.wordCount} words</div>
                        </div>
                        <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                          <button onClick={() => setModifyingVar(isModifying ? null : idx)} style={{
                            padding:'3px 9px', borderRadius:6, fontSize:10, fontWeight:700,
                            border:`1px solid ${BORDER}`,
                            background: isModifying ? '#FFF8E6' : '#fff',
                            color: isModifying ? AMBER : MUTED, cursor:'pointer',
                          }}>✎ Modify</button>
                          <button onClick={() => { setSelectedVar(idx); setModifyingVar(null); }} style={{
                            padding:'3px 12px', borderRadius:6, fontSize:10, fontWeight:700,
                            border:`1px solid ${isSelected ? ACCENT : BORDER}`,
                            background: isSelected ? ACCENT : '#fff',
                            color: isSelected ? '#fff' : MUTED,
                            cursor:'pointer', transition:'all 0.15s',
                          }}>{isSelected ? '✓ Selected' : 'Select'}</button>
                        </div>
                      </div>

                      {/* Tag chips */}
                      <div style={{ padding:'7px 14px', display:'flex', gap:5, flexWrap:'wrap', borderBottom:`1px solid ${BORDER}` }}>
                        {v.tags.map(t => (
                          <span key={t} style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#E0F2FE', color: ACCENT }}>{t}</span>
                        ))}
                      </div>

                      {/* Content area */}
                      {isModifying ? (
                        <textarea
                          value={varTexts[idx]}
                          onChange={e => { const n = [...varTexts]; n[idx] = e.target.value; setVarTexts(n); }}
                          style={{
                            width:'100%', boxSizing:'border-box', padding:'10px 14px',
                            border:'none', outline:'none', fontSize:10, color: INK,
                            lineHeight:1.65, fontFamily:'monospace', resize:'vertical',
                            minHeight:130, background:'#FFFBEB',
                          }}
                        />
                      ) : (
                        <div style={{
                          padding:'10px 14px', fontSize:10, color: INK,
                          lineHeight:1.65, fontFamily:'monospace', whiteSpace:'pre-wrap',
                          maxHeight:110, overflow:'hidden', position:'relative',
                        }}>
                          {varTexts[idx].slice(0, 260)}
                          {varTexts[idx].length > 260 && <span style={{ color: MUTED }}>…</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Compliance + Citations ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Compliance panel */}
          <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
              <CheckCircle2 size={13} color={GREEN} />
              <span style={{ fontSize:13, fontWeight:700, color: INK }}>Compliance Panel</span>
            </div>
            <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:7 }}>
              {complianceChecks.map((c, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{
                    width:16, height:16, borderRadius:'50%', flexShrink:0,
                    background: c.pass ? '#E8F7F0' : '#F6F9FC',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {c.pass
                      ? <CheckCircle2 size={10} color={GREEN} />
                      : <div style={{ width:6, height:6, borderRadius:'50%', background: BORDER }} />}
                  </div>
                  <span style={{ fontSize:11, color: c.pass ? INK : MUTED, fontWeight: c.pass ? 600 : 400 }}>{c.label}</span>
                </div>
              ))}

              {draftReady && selectedVar === null && (
                <div style={{ marginTop:4, padding:'7px 10px', borderRadius:7, background:'#FFF8E6', border:`1px solid #FDE68A`, fontSize:10, color: AMBER, fontWeight:600 }}>
                  ← Select a variation to submit
                </div>
              )}

              <button onClick={handleSubmit} disabled={!canSubmit || submitting || submitted} style={{
                marginTop:8, padding:'8px 0', borderRadius:8, border:'none',
                background: submitted ? '#E8F7F0' : !canSubmit ? '#F6F9FC' : GREEN,
                color: submitted ? GREEN : !canSubmit ? MUTED : '#fff',
                fontWeight:700, fontSize:12,
                cursor: !canSubmit || submitting || submitted ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              }}>
                {submitted
                  ? <><CheckCircle2 size={13} /> Sent to MLR</>
                  : submitting
                    ? <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> Submitting…</>
                    : <><Send size={13} /> Submit to MLR{selectedVar !== null ? ` (Var ${['A','B','C'][selectedVar]})` : ''}</>}
              </button>

              {submitted && (
                <div style={{ padding:'8px 10px', borderRadius:7, background:'#E8F7F0', border:`1px solid #A7F3D0`, fontSize:10, color: GREEN, fontWeight:600, textAlign:'center', lineHeight:1.5 }}>
                  ✓ Variation {['A','B','C'][selectedVar]} sent to MLR Review<br />
                  <span style={{ fontWeight:400, color: MUTED }}>Ticket #MLR-2481 created</span>
                </div>
              )}
            </div>
          </div>

          {/* Citation panel */}
          <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden', flex:1 }}>
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
              <FileText size={13} color={MUTED} />
              <span style={{ fontSize:13, fontWeight:700, color: INK }}>Citation References</span>
            </div>
            <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:8 }}>
              {CITATIONS.map((c, i) => (
                <div key={i} style={{ display:'flex', gap:7, alignItems:'flex-start' }}>
                  <span style={{ fontSize:10, fontWeight:700, color: ACCENT, background:'#E0F2FE', padding:'1px 5px', borderRadius:4, flexShrink:0 }}>{c.ref}</span>
                  <span style={{ fontSize:10, color: MUTED, lineHeight:1.5 }}>{c.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — Performance & Optimization
// ─────────────────────────────────────────────────────────────────────────────
function PerformanceTab() {
  const [selected, setSelected] = useState(null);

  const tableAssets = ASSETS.filter(a => a.status !== 'pending_mlr');
  const selected_asset = tableAssets.find(a => a.id === selected) || null;

  const scaleList   = APPROVED.filter(a => a.rx_lift >= 14).sort((a, b) => b.rx_lift - a.rx_lift);
  const refreshList = APPROVED.filter(a => a.rx_lift > 0 && a.rx_lift < 6).sort((a, b) => b.downloads - a.downloads);
  const sunsetList  = ASSETS.filter(a => a.status === 'retired');

  // Why certain assets perform better — factors
  const insights = [
    { icon:'📐', factor:'Content Length',  finding:'Leave-behinds under 1 page drive 2.3× higher Rx lift vs. detail aids. Reps use them consistently in 5-minute detail windows.' },
    { icon:'🎯', factor:'Audience Match',   finding:'Endocrinology-targeted assets average 13.2% lift vs. 6.8% for PCP. HCP segment alignment is the single largest predictor of Rx lift.' },
    { icon:'⏱️', factor:'Time-to-Engage',  finding:'Assets with avg engagement time 3–6 min outperform shorter (<2 min) and longer (>8 min) formats. Optimal read depth correlates with prescribing intent.' },
    { icon:'📊', factor:'Evidence Anchor',  finding:'Assets citing STEP-1 or SUSTAIN-6 trial data average 17.4% Rx lift — 3× the portfolio average. Data-first framing drives highest conversion.' },
  ];

  return (
    <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:18 }}>
      {/* Insight banner */}
      <div style={{
        background:'linear-gradient(135deg,#F3F0FF 0%,#EEF6FF 100%)',
        border:`1px solid #DDD6FE`, borderRadius:10, padding:'12px 18px',
        display:'flex', gap:14, alignItems:'flex-start',
      }}>
        <BarChart2 size={16} color={VIOLET} style={{ flexShrink:0, marginTop:2 }} />
        <div>
          <div style={{ fontSize:12, fontWeight:700, color: VIOLET, marginBottom:3 }}>Performance Optimization Agent</div>
          <div style={{ fontSize:12, color: INK, lineHeight:1.6 }}>
            <strong>Simplified Titration Guide (CA-009)</strong> is outperforming the standard version with <strong>+7.4% higher Rx conversion</strong>.&nbsp;
            Old dosing assets show high usage but low impact — recommended for refresh or sunset.
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:18 }}>

        {/* ── Asset Performance Table ── */}
        <div>
          <div style={{
            background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden',
          }}>
            <div style={{ padding:'13px 18px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
              <BarChart2 size={13} color={ACCENT} />
              <span style={{ fontSize:13, fontWeight:700, color: INK }}>Asset Performance</span>
              <span style={{ marginLeft:'auto', fontSize:11, color: MUTED }}>Click row for detail</span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background: BG }}>
                    {['Asset','Audience','Downloads','Avg Time','Rx Lift','Status','Action'].map(h => (
                      <th key={h} style={{
                        padding:'8px 12px', textAlign:'left', color: MUTED,
                        fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em',
                        borderBottom:`1px solid ${BORDER}`, whiteSpace:'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableAssets.map((a, i) => {
                    const rec = recLabel(a);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelected(selected === a.id ? null : a.id)}
                        style={{
                          background: selected === a.id ? '#F0F9FF' : i % 2 === 0 ? '#fff' : BG,
                          cursor:'pointer', transition:'background 0.12s',
                          borderBottom:`1px solid ${BORDER}`,
                        }}
                        onMouseEnter={e => { if (selected !== a.id) e.currentTarget.style.background = '#F0F9FF'; }}
                        onMouseLeave={e => { if (selected !== a.id) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : BG; }}
                      >
                        <td style={{ padding:'9px 12px', maxWidth:190 }}>
                          <div style={{ fontWeight:600, color: INK, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {a.name}
                          </div>
                          <div style={{ fontSize:10, color: MUTED }}>{a.type}</div>
                        </td>
                        <td style={{ padding:'9px 12px' }}><AudChip aud={a.audience} /></td>
                        <td style={{ padding:'9px 12px', color: INK, fontWeight:600 }}>
                          {a.downloads > 0 ? a.downloads : '—'}
                        </td>
                        <td style={{ padding:'9px 12px', color: MUTED }}>
                          {a.avg_time > 0 ? `${a.avg_time} min` : '—'}
                        </td>
                        <td style={{ padding:'9px 12px' }}>
                          {a.rx_lift > 0
                            ? <span style={{ fontWeight:700, color: a.rx_lift >= 14 ? GREEN : a.rx_lift >= 6 ? ACCENT : RED }}>{a.rx_lift}%</span>
                            : <span style={{ color: MUTED }}>—</span>}
                        </td>
                        <td style={{ padding:'9px 12px' }}><StatusPill status={a.status} /></td>
                        <td style={{ padding:'9px 12px' }}><RecPill label={rec} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* A/B Testing Panel */}
          <div style={{
            background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden', marginTop:14,
          }}>
            <div style={{ padding:'13px 18px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
              <RefreshCw size={13} color={VIOLET} />
              <span style={{ fontSize:13, fontWeight:700, color: INK }}>A/B Testing Panel</span>
            </div>
            <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:14 }}>
              {AB_PAIRS.map((pair, i) => (
                <div key={i} style={{ background: BG, borderRadius:10, padding:'12px 14px', border:`1px solid ${BORDER}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color: INK, marginBottom:10 }}>{pair.title}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    {[pair.vA, pair.vB].map((v, vi) => {
                      const isWinner = (vi === 0 && pair.winner === 'A') || (vi === 1 && pair.winner === 'B');
                      return (
                        <div key={vi} style={{
                          background:'#fff', borderRadius:8, padding:'10px 12px',
                          border:`1.5px solid ${isWinner ? GREEN : BORDER}`,
                        }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                            <span style={{ fontSize:11, fontWeight:700, color: MUTED }}>Version {vi === 0 ? 'A' : 'B'}</span>
                            {isWinner && (
                              <span style={{
                                fontSize:9, fontWeight:700, color: GREEN,
                                background:'#E8F7F0', padding:'2px 6px', borderRadius:99,
                              }}>WINNER</span>
                            )}
                          </div>
                          <div style={{ fontSize:11, color: INK, marginBottom:6, lineHeight:1.4 }}>{v.name}</div>
                          <div style={{ display:'flex', gap:12 }}>
                            <div>
                              <div style={{ fontSize:10, color: MUTED }}>Downloads</div>
                              <div style={{ fontSize:13, fontWeight:700, color: INK }}>{v.downloads}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, color: MUTED }}>Rx Lift</div>
                              <div style={{ fontSize:13, fontWeight:700, color: isWinner ? GREEN : INK }}>{v.rx_lift}%</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{
                    fontSize:11, color: INK, background:'#fff',
                    borderRadius:7, padding:'8px 10px',
                    border:`1px solid ${BORDER}`, lineHeight:1.55,
                  }}>
                    <strong style={{ color: VIOLET }}>AI Insight: </strong>{pair.insight}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Recommendations panel */}
          <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
              <ClipboardList size={13} color={ACCENT} />
              <span style={{ fontSize:13, fontWeight:700, color: INK }}>Recommendations</span>
            </div>
            <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:10 }}>
              {/* Scale */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color: GREEN, marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                  <ArrowUpRight size={11} /> Scale ({scaleList.length})
                </div>
                {scaleList.map(a => (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, padding:'6px 8px', borderRadius:7, background:'#E8F7F0' }}>
                    <div style={{ fontSize:10, color: INK, flex:1, lineHeight:1.3 }}>{a.name}</div>
                    <span style={{ fontSize:11, fontWeight:700, color: GREEN, flexShrink:0 }}>{a.rx_lift}%</span>
                  </div>
                ))}
              </div>
              {/* Refresh */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color: AMBER, marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                  <RefreshCw size={11} /> Refresh ({refreshList.length})
                </div>
                {refreshList.slice(0, 3).map(a => (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, padding:'6px 8px', borderRadius:7, background:'#FFF8E6' }}>
                    <div style={{ fontSize:10, color: INK, flex:1, lineHeight:1.3 }}>{a.name}</div>
                    <span style={{ fontSize:11, fontWeight:700, color: AMBER, flexShrink:0 }}>{a.rx_lift}%</span>
                  </div>
                ))}
              </div>
              {/* Sunset */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color: RED, marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                  <Archive size={11} /> Sunset ({sunsetList.length})
                </div>
                {sunsetList.map(a => (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, padding:'6px 8px', borderRadius:7, background:'#FFF3F2' }}>
                    <div style={{ fontSize:10, color: INK, flex:1, lineHeight:1.3 }}>{a.name}</div>
                    <span style={{ fontSize:10, color: RED, flexShrink:0 }}>Retired</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insight Explanation Panel */}
          <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={13} color={VIOLET} />
              <span style={{ fontSize:13, fontWeight:700, color: INK }}>Why Assets Perform</span>
            </div>
            <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:10 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  background: BG, borderRadius:8, padding:'10px 12px',
                  border:`1px solid ${BORDER}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:11, fontWeight:700, color: INK }}>{ins.factor}</span>
                  </div>
                  <div style={{ fontSize:11, color: MUTED, lineHeight:1.55 }}>{ins.finding}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5 — Content Engagement
// ─────────────────────────────────────────────────────────────────────────────

const ENG_KPI = [
  { label: 'Total Impressions', value: '284,120', delta: '+12%',  up: true,  accent: ACCENT },
  { label: 'Total Clicks',      value: '41,380',  delta: '+8%',   up: true,  accent: GREEN  },
  { label: 'Avg Engagement',    value: '4 min 22s',delta: '+18%', up: true,  accent: VIOLET },
  { label: 'CTA Conv. Rate',    value: '14.6%',   delta: '-1.2%', up: false, accent: AMBER  },
];

const ENG_CHANNELS = [
  { channel: 'Rep Portal',    impressions: 112400, clicks: 18200, ctr: 16.2, avgTime: '5:08', color: ACCENT  },
  { channel: 'Email (HCP)',   impressions:  84600, clicks: 11340, ctr: 13.4, avgTime: '3:41', color: GREEN   },
  { channel: 'Web / MSL Hub', impressions:  53800, clicks:  7620, ctr: 14.2, avgTime: '4:55', color: VIOLET  },
  { channel: 'Event / Conf.', impressions:  33320, clicks:  4220, ctr: 12.7, avgTime: '2:50', color: AMBER   },
];

const ENG_CTA = [
  { cta: 'Request Sample',         impressions: 58400, clicks: 9840, ctr: 16.8, conversions: 2820, cvr: 28.7, trend: [9,11,14,16,17,16,17] },
  { cta: 'Download PI',            impressions: 71200, clicks: 8960, ctr: 12.6, conversions: 8960, cvr:100.0, trend: [7,8,9,10,9,9,9]  },
  { cta: 'Schedule Follow-up',     impressions: 43600, clicks: 6200, ctr: 14.2, conversions: 1820, cvr: 29.4, trend: [4,5,5,6,7,6,6]  },
  { cta: 'Access Patient Support', impressions: 36800, clicks: 4980, ctr: 13.5, conversions: 1490, cvr: 29.9, trend: [3,4,4,5,5,5,5]  },
  { cta: 'View Full ISI',          impressions: 74120, clicks: 11400, ctr: 15.4, conversions: 11400, cvr:100.0, trend: [8,9,10,11,11,11,11] },
];

const ENG_ASSETS = [
  { id:'DOC-001', name:'Wegovy STEP-1 Leave-Behind v3.1', type:'Leave-Behind', audience:'Endocrinology', views:28400, clicks:5120, engRate:18.0, avgTime:'5:22', ctr:18.0, change:'+14%', up:true  },
  { id:'DOC-004', name:'Wegovy MOA Detail Aid v4.0',      type:'Detail Aid',   audience:'PCP',          views:21600, clicks:3240, engRate:15.0, avgTime:'6:10', ctr:15.0, change:'+9%',  up:true  },
  { id:'DOC-003', name:'SUSTAIN-6 CV Outcomes Email',     type:'Email',        audience:'Endocrinology',views:18900, clicks:2520, engRate:13.3, avgTime:'3:48', ctr:13.3, change:'+21%', up:true  },
  { id:'DOC-002', name:'Titration Quick Card v2.3',       type:'Quick Ref',    audience:'PCP',          views:16200, clicks:1940, engRate:12.0, avgTime:'2:30', ctr:12.0, change:'-3%',  up:false },
  { id:'DOC-005', name:'Safety & Tolerability Snapshot',  type:'Leave-Behind', audience:'PCP',          views:14800, clicks:1640, engRate:11.1, avgTime:'3:02', ctr:11.1, change:'+5%',  up:true  },
  { id:'DOC-006', name:'Patient Adherence Guide v1.2',    type:'Patient Guide',audience:'PCP',          views:12400, clicks:1340, engRate:10.8, avgTime:'4:18', ctr:10.8, change:'+2%',  up:true  },
];

const ENG_AUDIENCE = [
  { seg:'Endocrinology', views:124800, clicks:19600, engRate:15.7, avgTime:'5:10', color: ACCENT  },
  { seg:'PCP',           views: 98400, clicks:13200, engRate:13.4, avgTime:'3:54', color: GREEN   },
  { seg:'Cardiology',    views: 60920, clicks: 8580, engRate:14.1, avgTime:'4:28', color: VIOLET  },
];

const ENG_WEEKLY = [
  { week:'Mar 31', impressions:36200, clicks:5100 },
  { week:'Apr 7',  impressions:38400, clicks:5480 },
  { week:'Apr 14', impressions:41200, clicks:6020 },
  { week:'Apr 21', impressions:44800, clicks:6640 },
  { week:'Apr 28', impressions:43100, clicks:6340 },
  { week:'May 5',  impressions:46800, clicks:7020 },
  { week:'May 12', impressions:33620, clicks:4780 },
];

function MiniSparkline({ data, color = ACCENT }) {
  const max = Math.max(...data);
  const w = 48, h = 22;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow:'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r={3} fill={color} />
    </svg>
  );
}

function ContentEngagementTab() {
  const [assetSort, setAssetSort] = useState('views');
  const [channelHover, setChannelHover] = useState(null);

  const maxImp = Math.max(...ENG_CHANNELS.map(c => c.impressions));

  const sortedAssets = [...ENG_ASSETS].sort((a, b) => b[assetSort] - a[assetSort]);

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Agent insight */}
      <AgentInsightPanel
        endpoint="/content-strategy/agent-insight"
        screenId="content-strategy-engagement"
        accentColor={ACCENT}
        insightOnly={true}
      />

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {ENG_KPI.map(k => (
          <div key={k.label} style={{
            background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`,
            padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{k.label}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: INK, lineHeight: 1 }}>{k.value}</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: k.up ? GREEN : RED,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              {k.up ? '▲' : '▼'} {k.delta} vs last period
            </span>
          </div>
        ))}
      </div>

      {/* Impressions + clicks over time & channel breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>

        {/* Weekly trend */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={14} color={ACCENT} />
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Weekly Impressions & Clicks</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>Last 7 weeks</span>
          </div>
          <div style={{ padding: '16px 18px 12px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={ENG_WEEKLY} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="engImpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="engClkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={GREEN} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v, name) => [v.toLocaleString(), name === 'impressions' ? 'Impressions' : 'Clicks']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${BORDER}` }}
                />
                <Area type="monotone" dataKey="impressions" stroke={ACCENT} strokeWidth={2} fill="url(#engImpGrad)" dot={false} />
                <Area type="monotone" dataKey="clicks"      stroke={GREEN}  strokeWidth={2} fill="url(#engClkGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 4, paddingLeft: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: MUTED }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: ACCENT, display: 'inline-block' }} />
                Impressions
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: MUTED }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: GREEN, display: 'inline-block' }} />
                Clicks
              </span>
            </div>
          </div>
        </div>

        {/* Channel breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={14} color={VIOLET} />
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Engagement by Channel</span>
          </div>
          <div style={{ padding: '12px 0' }}>
            {ENG_CHANNELS.map(c => (
              <div
                key={c.channel}
                onMouseEnter={() => setChannelHover(c.channel)}
                onMouseLeave={() => setChannelHover(null)}
                style={{
                  padding: '9px 18px', cursor: 'default',
                  background: channelHover === c.channel ? '#F8FAFC' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{c.channel}</span>
                  <span style={{ fontSize: 11, color: MUTED }}>CTR {c.ctr}% · ⏱ {c.avgTime}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: BORDER, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${(c.impressions / maxImp) * 100}%`,
                      background: c.color, transition: 'width 0.4s',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.color, minWidth: 52, textAlign: 'right' }}>
                    {(c.impressions / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Performance + Audience breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>

        {/* CTA table */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MousePointer2 size={14} color={ACCENT} />
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>CTA Performance</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>Click-through & conversion rates</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['CTA', 'Impressions', 'Clicks', 'CTR', 'Conv.', 'CVR', 'Trend'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: h === 'CTA' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: MUTED, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ENG_CTA.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < ENG_CTA.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: INK }}>{row.cta}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: MUTED }}>{row.impressions.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: INK, fontWeight: 600 }}>{row.clicks.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: ACCENT, fontWeight: 700 }}>{row.ctr}%</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: MUTED }}>{row.conversions.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: GREEN, fontWeight: 700 }}>{row.cvr}%</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <MiniSparkline data={row.trend} color={ACCENT} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audience breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} color={GREEN} />
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Engagement by Audience</span>
          </div>
          <div style={{ padding: '12px 0' }}>
            {ENG_AUDIENCE.map(a => {
              const maxViews = Math.max(...ENG_AUDIENCE.map(x => x.views));
              return (
                <div key={a.seg} style={{ padding: '10px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{a.seg}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>Eng. rate {a.engRate}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ flex: 1, height: 7, borderRadius: 99, background: BORDER, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${(a.views / maxViews) * 100}%`, background: a.color }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: MUTED }}>👁 {(a.views / 1000).toFixed(1)}k views</span>
                    <span style={{ fontSize: 10, color: MUTED }}>🖱 {(a.clicks / 1000).toFixed(1)}k clicks</span>
                    <span style={{ fontSize: 10, color: MUTED }}>⏱ {a.avgTime} avg</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 6 }}>Insight</div>
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
              Endocrinology HCPs drive the highest engagement rate (15.7%) and longest average read time. PCP assets have the broadest reach but lower depth of engagement — consider shorter, punchier formats for this segment.
            </div>
          </div>
        </div>
      </div>

      {/* Top engaged assets table */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={14} color={ACCENT} />
          <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>Top Engaged Content</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {['views','clicks','engRate','avgTime'].map(col => (
              <button
                key={col}
                onClick={() => setAssetSort(col)}
                style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  border: assetSort === col ? 'none' : `1px solid ${BORDER}`,
                  background: assetSort === col ? ACCENT : '#fff',
                  color: assetSort === col ? '#fff' : MUTED,
                  transition: 'all 0.15s',
                }}
              >
                {col === 'engRate' ? 'Eng. Rate' : col === 'avgTime' ? 'Avg Time' : col.charAt(0).toUpperCase() + col.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Asset', 'Type', 'Audience', 'Views', 'Clicks', 'Eng. Rate', 'Avg Time', 'Change'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Asset' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: MUTED, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < sortedAssets.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: INK, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: '#F0F4FF', color: ACCENT, fontSize: 10, fontWeight: 700 }}>{a.type}</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}><AudChip aud={a.audience} /></td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: assetSort==='views'?700:400, color: assetSort==='views'?ACCENT:INK }}>{a.views.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: assetSort==='clicks'?700:400, color: assetSort==='clicks'?ACCENT:INK }}>{a.clicks.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: assetSort==='engRate'?700:400, color: assetSort==='engRate'?GREEN:INK }}>{a.engRate}%</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: assetSort==='avgTime'?700:400, color: assetSort==='avgTime'?VIOLET:MUTED }}>{a.avgTime}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: a.up ? GREEN : RED }}>{a.up ? '▲' : '▼'} {a.change}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root page component
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'mlr-review',   label: 'MLR Review' },
  { id: 'auto-tagging', label: 'Auto-Tagging' },
  { id: 'overview',     label: 'Overview' },
  { id: 'studio',       label: 'Content Studio' },
  { id: 'engagement',   label: 'Content Engagement' },
  { id: 'performance',  label: 'Performance & Optimization' },
];

export default function ContentStrategyPage() {
  const navigate  = useNavigate();
  const [tab, setTab] = useState('mlr-review');
  const greeting  = getGreeting();
  const persona   = PERSONA_NAMES.contentStrategy || { name: 'Dana Whitfield', role: 'Content Strategy Lead' };

  useEffect(() => {
    if (!isLoggedIn()) { clearAuth(); navigate('/login'); }
  }, [navigate]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background: BG, overflow:'hidden' }}>
      <style>{ANIM_CSS}</style>
      <ScreenHeader persona={persona} tab={tab} setTab={setTab} tabs={TABS} greeting={greeting} />
      <div style={{ flex:1, overflowY:'auto' }}>
        {tab === 'mlr-review'   && <MLRReviewTab />}
        {tab === 'auto-tagging' && <AutoTaggingTab />}
        {tab === 'overview'     && <OverviewTab />}
        {tab === 'studio'       && <ContentStudioTab />}
        {tab === 'engagement'   && <ContentEngagementTab />}
        {tab === 'performance'  && <PerformanceTab />}
      </div>
      <ChatFAB endpoint="/content-strategy/ask" screenId="content-strategy" accentColor={ACCENT} />
    </div>
  );
}
