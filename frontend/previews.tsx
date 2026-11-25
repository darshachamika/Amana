import { useState } from "react";
import { Facts, Panel, Table } from "./ui";

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

export function Preview({ page }: { page: PreviewPage }) {
  const [message, setMessage] = useState("");
  const [estimateAction, setEstimateAction] = useState("Approve estimate");
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
    {page === "documents" && <>
      <Panel title="Claim MC-2025-01487" tone="tinted"><div className="inline-facts"><Facts rows={claim}/></div></Panel>
      <Panel title="Submitted Documents (4)"><Table columns={["#", "Document", "File name", "Submitted on", "Review status"]}>
        {["Claim Form", "Identity Card", "Vehicle Registration", "Accident Photos"].map((name, index) => <tr key={name}><td>{index + 1}</td><td>{name}</td><td>{name.toLowerCase().replaceAll(" ", "_")}.{index === 3 ? "zip" : "pdf"}</td><td>15 Jan 2025, 2:17 PM</td><td><span className={`badge ${index < 2 ? "decision_recorded" : "awaiting_documents"}`}>{index < 2 ? "Verified" : "Pending review"}</span></td></tr>)}
      </Table></Panel>
      <div className="actions"><button className="secondary" onClick={() => result("Requesting documents")}>Request More Documents</button><button onClick={() => result("Verifying documents")}>Verify Documents</button></div>
    </>}
    {page === "estimate" && <>
      <Panel title="Claim MC-2025-01487"><div className="inline-facts"><Facts rows={claim}/></div></Panel>
      <div className="columns wide-first">
        <Panel title="Repair Estimate (Garage Submission)"><Table columns={["#", "Description", "Qty", "Unit price", "Line total"]}>
          {repairs.map(([name, value], index) => <tr key={name}><td>{index + 1}</td><td>{name}</td><td>1</td><td>{currency(value)}</td><td>{currency(value)}</td></tr>)}
        </Table><Facts rows={[[ "Subtotal", currency(subtotal)], ["VAT (18%)", currency(total - subtotal)]]}/><div className="total"><strong>Total Estimate</strong><strong>{currency(total)}</strong></div></Panel>
        <Panel title="Estimate Actions"><form className="stack" onSubmit={(event) => { event.preventDefault(); result(estimateAction); }}>
          {["Approve estimate", "Amend estimate", "Return for clarification"].map((action) => <button className={estimateAction === action ? "selected" : "secondary"} key={action} type="button" aria-pressed={estimateAction === action} onClick={() => setEstimateAction(action)}>{action}</button>)}
          <label>Review Notes (optional)<textarea maxLength={500}/></label><button>{estimateAction === "Approve estimate" ? "Approve & Continue" : estimateAction}</button>
        </form></Panel>
      </div>
    </>}
    {page === "decision" && <div className="columns">
      <Panel title="Claim Summary"><Facts rows={[...claim.slice(0, 4), ["Date of loss", "14 Jan 2025"], ["Estimated amount", currency(total)], ["Coverage", "Comprehensive"], ["Status", <span className="badge awaiting_documents">Decision pending</span>]]}/></Panel>
      <Panel title="Decision Details" icon="check"><form className="stack" onSubmit={(event) => { event.preventDefault(); result("Recording the decision"); }}>
        <label>Outcome<select><option>Approve Claim</option><option>Decline Claim</option><option>Return for Review</option></select></label>
        <label>Internal Reason<textarea required maxLength={500}/></label><button>Record Decision</button>
      </form></Panel>
    </div>}
    {page === "renewal" && <>
      <section className="panel"><form className="form-row" onSubmit={(event) => { event.preventDefault(); setMatched(["mt-10045872", "mohamed rizan"].includes(renewalQuery.trim().toLowerCase())); setMessage(""); }}>
        <label>Policy No. or Insured Name<input required value={renewalQuery} onChange={(event) => setRenewalQuery(event.target.value)}/></label><button>Find Policy</button>
      </form></section>
      {matched ? <>
        <div className="columns">{[false, true].map((proposed) => <Panel key={String(proposed)} title={proposed ? "Proposed Renewal Term" : "Current Term (Expiring)"} icon="calendar" tone={proposed ? "tinted" : ""}>
          <Facts rows={[[ "Policy No.", proposed ? "MT-10045872-R1" : "MT-10045872"], ["Insured", "Mohamed Rizan"], ["Vehicle", "Toyota Corolla (CBD-4821)"], ["Period", proposed ? "01 Feb 2025 – 31 Jan 2026" : "01 Feb 2024 – 31 Jan 2025"], ["Coverage", "Comprehensive"], ["Sum insured", currency(proposed ? 5500000 : 5000000)], ["Annual contribution", currency(proposed ? 52800 : 48750)]]}/>
        </Panel>)}</div>
        <form className="form-row" onSubmit={(event) => { event.preventDefault(); result("Processing the renewal"); }}><label>Renewal Notes (optional)<textarea maxLength={500}/></label><button>Process Renewal</button></form>
      </> : <p role="status">No sample policy matched. Try MT-10045872.</p>}
    </>}
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

