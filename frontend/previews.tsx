import { useState } from "react";
import { Facts, Panel, Table } from "./ui";
import { EstimateReview } from "./estimate";
import { DocumentVerification } from "./documents";

export const previewPages = {
  documents: ["Document Verification", "Review the documents submitted for this claim."],
  estimate: ["Estimate Review", "Review the repair estimate and assess the proposed work."],
  decision: ["Claim Decision", "Record the proposed outcome based on the estimate and policy terms."],
  renewal: ["Policy Renewal", "Review eligible motor policies and compare renewal terms."],
  reports: ["Reports and Audit", "Review operational trends and the audit trail of key actions."],
} as const;
export type PreviewPage = keyof typeof previewPages;

const claim: Array<[string, string]> = [
  ["Claim No.", "MC-2025-01487"], ["Policy No.", "MT-10045872"],
  ["Vehicle", "Toyota Corolla (CBD-4821)"], ["Claim type", "Own Damage"],
  ["Garage", "City Auto Repairs"], ["Status", "Under review"],
];
const repairs = [
  ["Front bumper repair and paint", 87500], ["Headlamp assembly replacement", 62000],
  ["Front fender repair", 24500], ["Bumper clips and fittings", 7500], ["Paint and finishing", 28000],
] as const;
const currency = (value: number) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(value);
const subtotal = repairs.reduce((total, [, value]) => total + value, 0);
const total = subtotal * 1.18;
const months = ["Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024", "Jan 2025"];
const received = [112, 129, 141, 168, 176, 205];
const settled = [68, 79, 93, 113, 133, 161];


type RenewalItem = {
  id: string; reference: string; insured: string; vehicle: string; periodId: string;
  periodStart: string; periodEnd: string; status: string; outstandingBalance: boolean;
  openClaims: number; coverage: string; sumInsured: number; annualContribution: number;
  eligible: boolean; reasons: string[]; renewed: boolean;
};
type RenewalRecord = { id: string; policyReference: string; previousPeriodId: string; newPeriodId: string; startDate: string; endDate: string; createdAt: string };
type RenewalException = { id: string; policyReference: string; reason: string; recordedAt: string; status: string };
function RenewalPanel() {
  const [items, setItems] = useState<RenewalItem[]>([]);
  const [exceptions, setExceptions] = useState<RenewalException[]>([]);
  const [days, setDays] = useState(60);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [renewals, setRenewals] = useState<Record<string,RenewalRecord>>({});
  const [keys] = useState(() => new Map<string,string>());
  const money = (value:number) => new Intl.NumberFormat("en-LK",{style:"currency",currency:"LKR",maximumFractionDigits:0}).format(value);
  async function load() {
    setLoading(true); setError("");
    try {
      const [result, exceptionRows] = await Promise.all([
        fetch(`/api/renewals?withinDays=${days}`).then(async r => {const d=await r.json();if(!r.ok)throw new Error(d.message);return d;}),
        fetch("/api/renewals/exceptions").then(async r => {const d=await r.json();if(!r.ok)throw new Error(d.message);return d;})
      ]);
      setItems(result.items); setExceptions(exceptionRows);
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to load renewals."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [days]);
  async function process(policy:RenewalItem) {
    setBusy(policy.id); setMessage(""); setError("");
    const key=keys.get(policy.id) ?? crypto.randomUUID(); keys.set(policy.id,key);
    try {
      const response=await fetch(`/api/renewals/${policy.id}/process`,{method:"POST",headers:{"Idempotency-Key":key}});
      const data=await response.json();
      if(!response.ok) throw new Error(data.message ?? "Renewal could not be processed.");
      setRenewals(old=>({...old,[policy.id]:data.renewal}));
      setMessage(data.created ? `Renewal created for ${policy.reference}.` : `Existing renewal returned for ${policy.reference}; no duplicate period was created.`);
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Renewal failed."); }
    finally { setBusy(""); }
  }
  async function recordException(policy:RenewalItem) {
    setBusy(policy.id); setError(""); setMessage("");
    try {
      const response=await fetch(`/api/renewals/${policy.id}/exceptions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:notes[policy.id] ?? ""})});
      const data=await response.json(); if(!response.ok)throw new Error(data.message);
      setNotes(old=>({...old,[policy.id]:""})); setMessage(`Exception recorded for ${policy.reference}.`); await load();
    } catch(e) {setError(e instanceof Error ? e.message : "Could not record exception.");}
    finally {setBusy("");}
  }
  return <>
    <p className="preview-note"><strong>Renewal operations</strong> · Synthetic demonstration records</p>
    <Panel title="Expiring policy search" icon="calendar"><div className="form-row">
      <label>Expiring within<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>1 year</option></select></label>
      <button className="secondary" type="button" onClick={()=>void load()}>Refresh</button>
    </div><p className="muted">Eligibility checks: active policy, no outstanding contribution balance, and no open claims.</p></Panel>
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status" className="notice">{message}</p>}
    {loading ? <p role="status">Loading expiring policies…</p> : items.length===0 ? <Panel title="No expiring policies" icon="check"><p>No policies expire within the selected period.</p></Panel> : items.map(policy=>{
      const renewal=renewals[policy.id];
      return <Panel key={policy.id} title={policy.reference} icon="shield" tone={policy.eligible ? "tinted" : ""}>
        <div className="inline-facts"><Facts rows={[
          ["Insured / vehicle",`${policy.insured} · ${policy.vehicle}`],["Current policy period",`${policy.periodStart} – ${policy.periodEnd}`],
          ["Coverage",policy.coverage],["Sum insured",money(policy.sumInsured)],["Annual contribution",money(policy.annualContribution)],
          ["Eligibility",policy.eligible ? "Eligible" : "Exception required"],["Renewal status",renewal ? "Renewed" : policy.renewed ? "Already renewed" : "Not renewed"]
        ]}/></div>
        {policy.reasons.length>0 && <ul className="error">{policy.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
        {renewal && <p className="notice">New period {renewal.newPeriodId}: {renewal.startDate} – {renewal.endDate}</p>}
        <div className="stack">
          {!policy.eligible && <><label>Exception reason<textarea aria-label={`Exception reason for ${policy.reference}`} maxLength={500} value={notes[policy.id] ?? ""} onChange={e=>setNotes(old=>({...old,[policy.id]:e.target.value}))}/></label><button className="secondary" disabled={busy===policy.id || !(notes[policy.id] ?? "").trim()} onClick={()=>void recordException(policy)}>Record exception</button></>}
          {policy.eligible && <button disabled={busy===policy.id} onClick={()=>void process(policy)}>{busy===policy.id ? "Processing…" : policy.renewed ? "View existing renewal / retry safely" : "Process renewal"}</button>}
        </div>
      </Panel>;
    })}
    <Panel title={`Recorded exceptions (${exceptions.length})`} icon="clock">{exceptions.length ? <Table columns={["Policy","Reason","Recorded","Status"]}>{exceptions.map(item=><tr key={item.id}><td>{item.policyReference}</td><td>{item.reason}</td><td>{new Date(item.recordedAt).toLocaleString()}</td><td>{item.status}</td></tr>)}</Table> : <p className="muted">No exceptions recorded.</p>}</Panel>
  </>;
}

export function Preview({ page }: { page: PreviewPage }) {
  const [message, setMessage] = useState("");
  const [renewalQuery, setRenewalQuery] = useState("MT-10045872");
  const [matched, setMatched] = useState(true);
  const [tab, setTab] = useState("Reports");
  const [period, setPeriod] = useState(6);
  const result = (action: string) => setMessage(`Preview only. ${action} was simulated using sample data.`);
  const auditTable = <Panel title="Recent Activity (Audit History)" icon="clock"><Table columns={["Date & time", "User", "Action", "Reference", "Details"]}>
    <tr><td>20 Jan 2025, 10:24</td><td>Farhan A.</td><td>Claim decision</td><td>MC-2025-01487</td><td>Claim approved</td></tr>
    <tr><td>20 Jan 2025, 09:58</td><td>Nadia S.</td><td>Estimate review</td><td>MC-2025-01487</td><td>Estimate reviewed</td></tr>
    <tr><td>19 Jan 2025, 16:27</td><td>Rizvi M.</td><td>Policy renewal</td><td>MT-10045872-R1</td><td>Renewal processed</td></tr>
  </Table></Panel>;

  return <>
    <p className="preview-note"><strong>Module preview</strong> · Synthetic data</p>
    {page === "documents" && <DocumentVerification/>}
    {false && page === "documents" && <>
      <Panel title="Claim MC-2025-01487" tone="tinted"><div className="inline-facts"><Facts rows={claim}/></div></Panel>
      <Panel title="Submitted Documents (4)"><Table columns={["#", "Document", "File name", "Submitted on", "Review status"]}>
        {["Claim Form", "Identity Card", "Vehicle Registration", "Accident Photos"].map((name, index) => <tr key={name}><td>{index + 1}</td><td>{name}</td><td>{name.toLowerCase().replaceAll(" ", "_")}.{index === 3 ? "zip" : "pdf"}</td><td>15 Jan 2025, 2:17 PM</td><td><span className={`badge ${index < 2 ? "decision_recorded" : "awaiting_documents"}`}>{index < 2 ? "Verified" : "Pending review"}</span></td></tr>)}
      </Table></Panel>
      <div className="actions"><button className="secondary" onClick={() => result("Requesting documents")}>Request More Documents</button><button onClick={() => result("Verifying documents")}>Verify Documents</button></div>
    </>}
    {page === "estimate" && <EstimateReview/>}
    {page === "decision" && <div className="columns">
      <Panel title="Claim Summary"><Facts rows={[...claim.slice(0, 4), ["Date of loss", "14 Jan 2025"], ["Estimated amount", currency(total)], ["Coverage", "Comprehensive"], ["Status", <span className="badge awaiting_documents">Decision pending</span>]]}/></Panel>
      <Panel title="Decision Details" icon="check"><form className="stack" onSubmit={(event) => { event.preventDefault(); result("Recording the decision"); }}>
        <label>Outcome<select><option>Approve Claim</option><option>Decline Claim</option><option>Return for Review</option></select></label>
        <label>Internal Reason<textarea required maxLength={500}/></label><button>Record Decision</button>
      </form></Panel>
    </div>}
    {page === "renewal" && <RenewalPanel/>}
    {page === "reports" && <>
      <div className="filters" aria-label="Report views">{["Reports", "Audit History"].map((label) => <button key={label} className={tab === label ? "selected" : "secondary"} aria-pressed={tab === label} onClick={() => { setTab(label); setMessage(""); }}>{label}</button>)}</div>
      {tab === "Reports" && <div className="columns wide-first"><Panel title="Claims Trend" icon="chart">
        <svg className="chart" viewBox="0 0 520 185" role="img" aria-label={months.slice(-period).map((month, i) => `${month}: ${received[6-period+i]} received, ${settled[6-period+i]} settled`).join("; ")}>
          {[0,50,100,150,200,250].map((value) => <g key={value}><line x1="34" x2="510" y1={151-value/2} y2={151-value/2} stroke="#dce7df"/><text x="3" y={155-value/2}>{value}</text></g>)}
          {received.slice(-period).map((amount, i) => { const x = 40 + i * (465 / period); return <g key={x}><rect x={x} y={151-amount/2} width={465/period-14} height={amount/2} rx="4" fill="#b4e5bc"/><text x={x+8} y={145-amount/2}>{amount}</text><text x={x+2} y="170">{months[6-period+i]}</text></g>; })}
          <polyline fill="none" stroke="#006448" strokeWidth="2.5" points={settled.slice(-period).map((amount,i) => `${33+(i+.5)*465/period},${151-amount/2}`).join(" ")}/>
        </svg><p className="muted">Mint bars · Claims received  Green line · Claims settled</p>
      </Panel><Panel title="Generate Report"><form className="stack" onSubmit={(event) => { event.preventDefault(); result("Generating a report"); }}>
        <label>Report Type<select><option>Motor Claims Summary</option><option>Claims Stage Breakdown</option></select></label>
        <label>Period<select value={period} onChange={(event) => setPeriod(Number(event.target.value))}><option value={6}>Last 6 months</option><option value={3}>Last 3 months</option></select></label><button>Generate Report</button>
      </form></Panel></div>}
      {auditTable}
    </>}
    {message && <p className="notice" role="status">{message}</p>}
  </>;
}

