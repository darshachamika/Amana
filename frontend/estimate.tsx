import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { EstimateComment, EstimateLineItem, EstimateRecord } from "../shared/contracts";
import { Facts, Panel, Table } from "./ui";

const claimReference = "MC-2025-01487";
const money = (value: number) => new Intl.NumberFormat("en-LK", {
  style: "currency", currency: "LKR", maximumFractionDigits: 2,
}).format(value);

export function EstimateReview() {
  const [estimate, setEstimate] = useState<EstimateRecord>();
  const [lines, setLines] = useState<EstimateLineItem[]>([]);
  const [comment, setComment] = useState("");
  const [action, setAction] = useState<EstimateComment["action"]>("approve");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/estimates/${encodeURIComponent(claimReference)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not load estimate.");
      setEstimate(data); setLines(data.current.lineItems);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load estimate.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateLine(id: string, field: "description" | "quantity" | "unitPrice", value: string) {
    setLines((current) => current.map((line) => line.id === id
      ? { ...line, [field]: field === "description" ? value : Number(value) } : line));
  }
  function addLine() {
    setLines((current) => [...current, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }]);
  }
  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }
  async function saveLines(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/estimates/${encodeURIComponent(claimReference)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems: lines }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not save estimate.");
      setEstimate(data); setLines(data.current.lineItems);
      setNotice(`Estimate version ${data.currentVersion} saved successfully.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save estimate.");
    } finally { setBusy(false); }
  }
  async function submitReview(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/estimates/${encodeURIComponent(claimReference)}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not save reviewer comment.");
      setEstimate(data.estimate); setComment("");
      setNotice("Reviewer action and comment saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save reviewer comment.");
    } finally { setBusy(false); }
  }

  const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  if (loading) return <p role="status">Loading estimate…</p>;
  if (!estimate) return <Panel title="Estimate unavailable"><p role="alert" className="error">{error || "No estimate is available for this claim."}</p><button className="secondary" onClick={() => void load()}>Retry</button></Panel>;

  return <>
    <p className="preview-note"><strong>Estimate review</strong> · Claim {estimate.claimReference} · Status: {estimate.status.replaceAll("_", " ")}</p>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="notice">{notice}</p>}
    <form onSubmit={saveLines}>
      <Panel title={`Repair Estimate · Version ${estimate.currentVersion}`}>
        <Table columns={["#", "Description", "Qty", "Unit price", "Line total", ""]}>
          {lines.map((line, index) => <tr key={line.id}>
            <td>{index + 1}</td>
            <td><input aria-label={`Description for line ${index + 1}`} required maxLength={160} value={line.description} onChange={(event) => updateLine(line.id, "description", event.target.value)}/></td>
            <td><input aria-label={`Quantity for line ${index + 1}`} required type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(line.id, "quantity", event.target.value)}/></td>
            <td><input aria-label={`Unit price for line ${index + 1}`} required type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.id, "unitPrice", event.target.value)}/></td>
            <td>{money((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}</td>
            <td><button className="secondary" type="button" aria-label={`Remove line ${index + 1}`} onClick={() => removeLine(line.id)}>Remove</button></td>
          </tr>)}
        </Table>
        <div className="actions"><button className="secondary" type="button" onClick={addLine}>Add line item</button><button disabled={busy || lines.length === 0}>{busy ? "Saving…" : "Save estimate version"}</button></div>
        <Facts rows={[["Subtotal", money(subtotal)], ["VAT (18%)", money(tax)]]}/>
        <div className="total"><strong>Total Estimate</strong><strong>{money(total)}</strong></div>
      </Panel>
    </form>
    <div className="columns">
      <Panel title="Reviewer Action">
        <form className="stack" onSubmit={submitReview}>
          <label>Action<select value={action} onChange={(event) => setAction(event.target.value as EstimateComment["action"])}>
            <option value="approve">Approve estimate</option><option value="amend">Request amendment</option>
            <option value="return">Return for clarification</option><option value="comment">Add comment only</option>
          </select></label>
          <label>Reviewer comment<textarea required maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)}/></label>
          <button disabled={busy || !comment.trim()}>{busy ? "Saving…" : "Save reviewer action"}</button>
        </form>
      </Panel>
      <Panel title={`Estimate Versions (${estimate.versions.length})`}>
        <ol className="timeline">{[...estimate.versions].reverse().map((version) => <li key={version.id}>
          <strong>Version {version.version} · {money(version.total)}</strong>
          <span>{new Date(version.createdAt).toLocaleString()} · {version.createdBy}</span>
        </li>)}</ol>
      </Panel>
    </div>
    <Panel title={`Reviewer Comments (${estimate.comments.length})`}>
      {estimate.comments.length ? <Table columns={["Date", "Reviewer", "Version", "Action", "Comment"]}>
        {estimate.comments.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.reviewer}</td><td>{item.version}</td><td>{item.action}</td><td>{item.comment}</td></tr>)}
      </Table> : <p className="muted">No reviewer comments have been recorded.</p>}
    </Panel>
  </>;
}
