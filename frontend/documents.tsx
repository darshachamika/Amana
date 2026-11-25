import { useEffect, useState } from "react";
import { Facts, Panel, Table } from "./ui";

type QueueClaim = { id: string; claimNumber: string; policyReference: string; stage: string; pendingReason: string | null };
type Version = { id: string; version: number; fileName: string; uploadedAt: string; uploadedBy: string; verification: "pending" | "verified" | "rejected"; verifiedAt: string | null; verifiedBy: string | null; outcome: string | null };
type ClaimDocument = { id: string; name: string; required: boolean; currentVersion: number; versions: Version[] };
type DocumentSet = { claimId: string; documents: ClaimDocument[]; claim: QueueClaim };
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Document request failed.");
  return data;
}
export function DocumentVerification() {
  const [claims, setClaims] = useState<QueueClaim[]>([]);
  const [claimId, setClaimId] = useState("");
  const [set, setSet] = useState<DocumentSet>();
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  async function loadClaims() {
    const rows = await api<QueueClaim[]>("/api/claims");
    setClaims(rows);
    if (!claimId && rows.length) setClaimId(rows[0].id);
  }
  async function loadDocuments(id: string) {
    if (!id) { setSet(undefined); return; }
    setSet(await api<DocumentSet>(`/api/documents/${encodeURIComponent(id)}`));
  }
  useEffect(() => { void loadClaims().catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => { void loadDocuments(claimId).catch((e: Error) => setError(e.message)); }, [claimId]);
  async function upload(doc: ClaimDocument) {
    setBusy(doc.id); setError(""); setNotice("");
    try {
      const fileName = fileNames[doc.id]?.trim();
      const data = await api<DocumentSet>(`/api/documents/${claimId}/${doc.id}/uploads`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName }),
      });
      setSet(data); setFileNames(old => ({ ...old, [doc.id]: "" }));
      setNotice(`Synthetic upload saved as version ${doc.currentVersion + 1}. Verification is now pending.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(""); }
  }
  async function verify(doc: ClaimDocument, outcome: "verified" | "rejected") {
    setBusy(doc.id); setError(""); setNotice("");
    try {
      const data = await api<DocumentSet>(`/api/documents/${claimId}/${doc.id}/verification`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note: notes[doc.id] }),
      });
      setSet(data); setNotice(`${doc.name} version ${doc.currentVersion} marked ${outcome}.`);
      await loadClaims();
    } catch (e) { setError(e instanceof Error ? e.message : "Verification failed."); }
    finally { setBusy(""); }
  }
  const complete = !!set && set.documents.filter(d => d.required).every(d => d.versions.find(v => v.version === d.currentVersion)?.verification === "verified");
  return <>
    <p className="preview-note"><strong>Document verification</strong> · Synthetic uploads only; no real files are stored.</p>
    <Panel title="Select claim"><label>Claim<select value={claimId} onChange={e => setClaimId(e.target.value)}><option value="">Choose a claim</option>{claims.map(c => <option key={c.id} value={c.id}>{c.claimNumber} · {c.policyReference}</option>)}</select></label>
      {set && <Facts rows={[["Claim", set.claim.claimNumber], ["Current stage", set.claim.stage.replaceAll("_", " ")], ["Required documents", `${set.documents.filter(d => d.required && d.versions.find(v => v.version === d.currentVersion)?.verification === "verified").length} / ${set.documents.filter(d => d.required).length} verified"]]}/>}
    </Panel>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="notice">{notice}</p>}
    {set && <Panel title="Required document checklist">
      <Table columns={["Document", "Current file / version", "Verification", "Actions"]}>
        {set.documents.map(doc => {
          const current = doc.versions.find(v => v.version === doc.currentVersion)!;
          return <tr key={doc.id}>
            <td>{doc.name}{doc.required && <small> · Required</small>}</td>
            <td>{current.fileName}<br/>v{current.version} · {new Date(current.uploadedAt).toLocaleString()}</td>
            <td><span className={`badge ${current.verification === "verified" ? "decision_recorded" : current.verification === "rejected" ? "under_review" : "awaiting_documents"}`}>{current.verification}</span>{current.outcome && <p>{current.outcome}</p>}</td>
            <td><div className="stack">
              <label>New synthetic file name<input value={fileNames[doc.id] ?? ""} onChange={e => setFileNames(old => ({ ...old, [doc.id]: e.target.value }))} placeholder="document-v2.pdf"/></label>
              <button className="secondary" disabled={!!busy || !fileNames[doc.id]?.trim()} onClick={() => void upload(doc)}>Save new version</button>
              <label>Verification note<textarea value={notes[doc.id] ?? ""} onChange={e => setNotes(old => ({ ...old, [doc.id]: e.target.value }))} maxLength={500} placeholder="Record the review outcome"/></label>
              <div className="actions"><button disabled={!!busy || !notes[doc.id]?.trim()} onClick={() => void verify(doc, "verified")}>Verify</button><button className="secondary" disabled={!!busy || !notes[doc.id]?.trim()} onClick={() => void verify(doc, "rejected")}>Reject</button></div>
            </div></td>
          </tr>;
        })}
      </Table>
      <p role="status" className={complete ? "notice" : "muted"}>{complete ? "All required current document versions are verified. Claim moved to READY FOR ESTIMATE." : "Claim remains AWAITING DOCUMENTS until every required current version is verified."}</p>
    </Panel>}
    {set && <Panel title="Document version history">
      {set.documents.map(doc => <section key={doc.id}><h3>{doc.name}</h3><ol className="timeline">{[...doc.versions].reverse().map(v => <li key={v.id}><strong>Version {v.version} · {v.fileName} · {v.verification}</strong><span>Uploaded {new Date(v.uploadedAt).toLocaleString()} by {v.uploadedBy}</span>{v.verifiedAt && <span>Reviewed {new Date(v.verifiedAt).toLocaleString()} by {v.verifiedBy}: {v.outcome}</span>}</li>)}</ol></section>)}
    </Panel>}
  </>;
}
