import { useEffect, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { stageLabels, type Claim, type Policy, type QueueItem } from "../shared/contracts";
import { Preview, previewPages, type PreviewPage } from "./previews";
import { Badge, Facts, Header, Icon, Panel, Table } from "./ui";
import "./style.css";

const mark = new URL("../docs/amana-mark.svg", import.meta.url).href;
const demoEmail = "sara@example.test";
const demoPassword = "MotorDemo2026";
const links = [
  ["home", "Home", "home"], ["queue", "Work Queue", "list"], ["register", "Register Claim", "plus"],
  ["policy", "Policy Lookup", "search"], ["documents", "Document Verification", "file"],
  ["estimate", "Estimate Review", "file"], ["decision", "Claim Decision", "check"],
  ["renewal", "Policy Renewal", "calendar"], ["reports", "Reports & Audit", "chart"],
] as const;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) throw new Error(data?.message ?? "The service is unavailable. Try again.");
  return data;
}

function useApi<T>(path: string, refresh = 0) {
  const [state, setState] = useState<{ path: string; data?: T; error?: string }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState(undefined);
    request<T>(path, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ path, data });
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setState({ path, error: error.message });
    });
    return () => controller.abort();
  }, [path, refresh]);
  return state?.path === path ? state : undefined;
}

function Brand() {
  return <div className="brand"><img src={mark} alt=""/><div><strong>Amana Takaful</strong><small>Motor Claims · Staff Portal</small></div></div>;
}

function Footer({ show }: { show: (name: string) => void }) {
  return <footer><span><strong>Amana Takaful</strong> · Motor Claims Workspace</span><div><button onClick={() => show("Help")}><Icon name="help"/> Help</button><button onClick={() => show("Privacy")}><Icon name="shield"/> Privacy</button></div></footer>;
}

function SignIn({ enter }: { enter: (remember: boolean) => void }) {
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  return <main className="sign-in" id="content" tabIndex={-1}>
    <section className="sign-art"><Brand/><div className="sign-art-copy"><h1>Motor Claims<br/>Workspace</h1><p>A workspace for Amana Takaful motor claims operations.</p></div></section>
    <section className="sign-form"><form className="stack" onSubmit={(event) => {
      event.preventDefault();
      if (email.trim().toLowerCase() === demoEmail && password === demoPassword) enter(remember);
      else setError("Use the demo account shown below.");
    }}>
      <div><span className="eyebrow">Staff sign in</span><h1>Sign In to Motor Claims</h1><p>Access the Amana Takaful Motor Claims staff portal.</p></div>
      <label>Email Address<span className="sign-field"><Icon name="mail"/><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)}/></span></label>
      <div className="sign-input-group"><label htmlFor="staff-password">Password</label><div className="sign-field"><Icon name="lock"/><input id="staff-password" type={visible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}/><button type="button" className="icon-button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)}><Icon name="eye"/></button></div></div>
      <div className="sign-options"><label className="check-label"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/> Remember me</label><button className="text-button" type="button" onClick={() => { setPassword(demoPassword); setEmail(demoEmail); setError(""); }}>Reset demo fields</button></div>
      {error && <p role="alert" className="error">{error}</p>}
      <button className="mint">Sign In</button>
      <p className="muted">Demo access only · {demoEmail} / <code>{demoPassword}</code></p>
    </form></section>
  </main>;
}

function ClaimRows({ items }: { items: QueueItem[] }) {
  return <Table columns={["Claim No.", "Policy No.", "Stage", "Officer", "Pending reason", "Follow-up"]}>
    {items.map((item) => <tr key={item.id}><td><a className="text-button" href={`#claim/${encodeURIComponent(item.id)}`}>{item.claimNumber}</a></td><td>{item.policyReference}</td><td><Badge stage={item.stage}/></td><td>{item.assignedOfficer ?? "Unassigned"}</td><td>{item.pendingReason ?? "—"}</td><td>{item.nextFollowUp ?? "—"}</td></tr>)}
  </Table>;
}

function Home() {
  const [refresh, setRefresh] = useState(0);
  const queue = useApi<QueueItem[]>("/claims", refresh);
  const items = queue?.data ?? [];
  const metrics = [
    ["Open Claims", items.filter((item) => item.stage !== "decision_recorded").length, "file"],
    ["Awaiting Documents", items.filter((item) => item.stage === "awaiting_documents").length, "clock"],
    ["In Review", items.filter((item) => item.stage === "under_review").length, "search"],
    ["Decisions Recorded", items.filter((item) => item.stage === "decision_recorded").length, "check"],
  ] as const;
  return <>
    <section className="hero"><span className="eyebrow">Motor Claims Workspace</span><h1>Welcome, Sara</h1><p>Manage motor claims, register new claims, and keep cases moving.</p><a className="button mint" href="#register"><Icon name="plus"/> Register claim</a></section>
    <div className="section-heading"><h2>Operational Overview</h2><span className="muted">Prototype claims</span></div>
    <div className="metrics">{metrics.map(([label, count, icon]) => <article key={label}><Icon name={icon}/><div><strong>{queue?.data ? count : "—"}</strong><span>{label}</span></div></article>)}</div>
    <div className="section-heading"><h2>Recent Claims</h2><a className="text-button" href="#queue">View Work Queue <Icon name="arrow"/></a></div>
    <section className="table-card">{queue?.data && items.length ? <ClaimRows items={items.slice(0, 3)}/> : <div className="queue-message"><p className={queue?.error ? "error" : "muted"} role={queue?.error ? "alert" : "status"}>{queue?.error ? "Claims could not load. Make sure the local API is running, then retry." : queue ? "No claims registered yet." : "Loading claims…"}</p>{queue?.error && <button className="secondary" onClick={() => setRefresh(refresh + 1)}>Retry</button>}</div>}</section>
  </>;
}

function WorkQueue() {
  const [stage, setStage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [order, setOrder] = useState("newest");
  const [refresh, setRefresh] = useState(0);
  const all = useApi<QueueItem[]>("/claims", refresh);
  const filtered = useApi<QueueItem[]>(stage ? `/claims?stage=${encodeURIComponent(stage)}` : "", refresh);
  const queue = stage ? filtered : all;
  const matches = (queue?.data ?? []).filter((item) => [item.claimNumber, item.policyReference, item.assignedOfficer].some((field) => field?.toLowerCase().includes(search.trim().toLowerCase())));
  if (order === "oldest") matches.reverse();
  const pageCount = Math.max(1, Math.ceil(matches.length / perPage));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * perPage;

  return <>
    <Header title="Claims Work Queue" description="Find, filter, and review motor claims."><a className="button" href="#register"><Icon name="plus"/> Register claim</a></Header>
    <label className="search-box"><Icon name="search"/><input aria-label="Search claims" placeholder="Search by claim number, policy number, or officer" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></label>
    <div className="filters" aria-label="Claim stages">{[["", "All Stages"], ...Object.entries(stageLabels)].map(([value, label]) => {
      const count = all?.data?.filter((item) => !value || item.stage === value).length;
      return <button key={value} className={value === stage ? "selected" : "secondary"} aria-pressed={value === stage} onClick={() => { setStage(value); setPage(1); }}>{label}{count !== undefined && ` (${count})`}</button>;
    })}</div>
    <div className="section-heading"><span className="muted">{matches.length ? `Showing ${start + 1}–${Math.min(start + perPage, matches.length)} of ${matches.length} claims` : "0 claims"}</span><div className="inline-controls"><label>Sort by<select value={order} onChange={(event) => { setOrder(event.target.value); setPage(1); }}><option value="newest">Newest registered</option><option value="oldest">Oldest registered</option></select></label><button className="secondary" onClick={() => setRefresh(refresh + 1)}>Refresh</button></div></div>
    <section className="table-card">{matches.length ? <ClaimRows items={matches.slice(start, start + perPage)}/> : <p role={queue?.error ? "alert" : "status"} className={queue?.error ? "error" : "muted"}>{queue?.error ?? (queue ? "No claims match this view." : "Loading claims…")}</p>}</section>
    <div className="section-heading pagination"><div className="inline-controls"><button className="secondary" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>‹</button><span>Page {current} of {pageCount}</span><button className="secondary" aria-label="Next page" disabled={current === pageCount} onClick={() => setPage(current + 1)}>›</button></div><label>Rows per page<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option></select></label></div>
  </>;
}

function policyFacts(policy: Policy): Array<[string, string]> {
  return [["Policy Number", policy.reference], ["Policy Period ID", policy.policyPeriodId], ["Reference Version", policy.referenceVersionId], ["Effective dates", "Unavailable in prototype"]];
}

function PolicyLookup({ onSelect }: { onSelect: (policy: Policy) => void }) {
  const [reference, setReference] = useState("DEMO-MOTOR-001");
  const [policy, setPolicy] = useState<Policy>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPolicy(undefined);
    setBusy(true);
    try { setPolicy(await request<Policy>(`/policies?reference=${encodeURIComponent(reference)}`)); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <Header title="Policy Lookup" description="Search for a motor policy to view details or register a claim."/>
    <Panel title="Search Policy" icon="search"><form className="form-row" onSubmit={lookup}>
      <label>Search by<select><option>Policy Number</option></select></label>
      <label className="grow">Policy Number<input required value={reference} disabled={busy} onChange={(event) => { setReference(event.target.value); setPolicy(undefined); setError(""); }}/></label>
      <button disabled={busy}><Icon name="search"/>{busy ? "Searching…" : "Search"}</button>
    </form>{error && <p className="error" role="alert">{error}</p>}</Panel>
    {policy && <Panel title={`Policy ${policy.reference}`} icon="shield" tone="tinted"><div className="inline-facts"><Facts rows={policyFacts(policy)}/></div><div className="actions"><button onClick={() => onSelect(policy)}>Continue to Register Claim <Icon name="arrow"/></button></div></Panel>}
  </>;
}

function Register({ policy, onRegistered }: { policy?: Policy; onRegistered: (claim: Claim) => void }) {
  const [incidentDate, setIncidentDate] = useState("");
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function register(event: FormEvent) {
    event.preventDefault();
    if (!policy || busy || !incidentDate || !description.trim()) return;
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify({ policyId: policy.id, policyPeriodId: policy.policyPeriodId,
        referenceVersionId: policy.referenceVersionId, incidentDate, incidentDescription: description.trim() });
      if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() };
      const claim = await request<Claim>("/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key },
        body,
      });
      onRegistered(claim);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <div className="crumb"><a href="#policy">Policy Lookup</a><Icon name="arrow"/>Register Claim</div>
    <Header title="Register Claim" description="Create a new motor claim for a verified policy."/>
    {policy ? <form onSubmit={register}>
      <Panel title="Verified Policy" icon="check" tone="tinted"><div className="inline-facts"><Facts rows={policyFacts(policy)}/></div></Panel>
      <Panel title="Claim Details"><div className="columns incident">
        <label>Incident Date<input required disabled={busy} type="date" value={incidentDate} onChange={(event) => setIncidentDate(event.target.value)}/></label>
        <label>Incident Description<textarea disabled={busy} required maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)}/><small>{description.length}/1000</small></label>
      </div></Panel>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><a className="button secondary" href="#policy">Cancel</a><button disabled={busy || !incidentDate || !description.trim()}>{busy ? "Registering…" : "Register Claim"}</button></div>
    </form> : <Panel title="Select a Policy" icon="shield"><p>Look up a policy number to verify the policy before registering a claim.</p><a className="button" href="#policy"><Icon name="search"/> Find Policy</a></Panel>}
  </>;
}

function ClaimDetails({ id, created }: { id: string; created: string }) {
  const state = useApi<Claim>(`/claims/${encodeURIComponent(id)}`);
  const claim = state?.data;
  return <>
    <div className="crumb"><a href="#queue">Claims</a><Icon name="arrow"/>Claim Details</div>
    <Header title="Claim Details" description="View the incident information, policy reference, and workflow stage."/>
    {state?.error && <p role="alert" className="error">{state.error}</p>}
    {!state && <p role="status">Loading claim…</p>}
    {claim && <>
      {created === id && <p role="status" className="notice">{claim.claimNumber} registered.</p>}
      <Panel title={`Claim ${claim.claimNumber}`} icon="shield" tone="tinted"><Badge stage={claim.stage}/></Panel>
      <div className="columns"><Panel title="Incident Information"><Facts rows={[["Incident date", claim.incidentDate], [ "Description", claim.incidentDescription ], ["Assigned officer", claim.assignedOfficer ?? "Unassigned"], ["Next follow-up", claim.nextFollowUp ?? "—"]]}/></Panel>
        <Panel title="Policy Information" icon="shield"><Facts rows={[[ "Policy Number", claim.policyReference ], ["Effective dates", "Unavailable in prototype"]]}/></Panel></div>
      <Panel title="Claim Timeline" icon="clock"><ol className="timeline"><li><strong>Claim registered</strong></li><li><strong>{stageLabels[claim.stage]}</strong>{claim.pendingReason && <span>{claim.pendingReason}</span>}</li></ol><p className="muted">Current stage from the API. Timestamped history is planned.</p></Panel>
    </>}
  </>;
}

function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || "home");
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem("amana-demo") === "active" || sessionStorage.getItem("amana-demo") === "active");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("amana-sidebar") === "collapsed");
  const [mobile, setMobile] = useState(() => matchMedia("(max-width: 760px)").matches);
  const [drawer, setDrawer] = useState(false);
  const [policy, setPolicy] = useState<Policy>();
  const [created, setCreated] = useState("");
  const [info, setInfo] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const [page, id] = route.split("/");
  const title = page === "home" ? "Staff Home" : page === "claim" ? "Claim Details" : links.find(([key]) => key === page)?.[1] ?? "Staff Portal";
  const showSignIn = !signedIn || ["login", "sign-in", "signin"].includes(page);

  useEffect(() => {
    const changeRoute = () => { setRoute(location.hash.slice(1) || "home"); setDrawer(false); };
    const viewport = matchMedia("(max-width: 760px)");
    const resize = () => { setMobile(viewport.matches); setDrawer(false); };
    window.addEventListener("hashchange", changeRoute);
    viewport.addEventListener("change", resize);
    return () => { window.removeEventListener("hashchange", changeRoute); viewport.removeEventListener("change", resize); };
  }, []);
  useEffect(() => { document.title = `${showSignIn ? "Staff Sign In" : title} | Amana Takaful`; }, [showSignIn, title]);
  useEffect(() => {
    if (info && !modal.current?.open) modal.current?.showModal();
  }, [info]);
  useEffect(() => {
    if (!drawer) return;
    navigation.current?.querySelector("a")?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDrawer(false); toggle.current?.focus(); }
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [drawer]);

  function switchSidebar() {
    if (mobile) { setDrawer(!drawer); return; }
    localStorage.setItem("amana-sidebar", collapsed ? "expanded" : "collapsed");
    setCollapsed(!collapsed);
  }

  function enter(remember: boolean) {
    (remember ? localStorage : sessionStorage).setItem("amana-demo", "active");
    setSignedIn(true);
    location.hash = "home";
  }

  function signOut() {
    localStorage.removeItem("amana-demo");
    sessionStorage.removeItem("amana-demo");
    setPolicy(undefined);
    setCreated("");
    setDrawer(false);
    setSignedIn(false);
    location.hash = "sign-in";
  }

  return <div className="app">
    <a className="skip" href="#content" onClick={(event) => { event.preventDefault(); document.getElementById("content")?.focus(); }}>Skip to content</a>
    {showSignIn ? <SignIn enter={enter}/> : <div className={`layout ${collapsed ? "collapsed" : ""} ${drawer ? "drawer-open" : ""}`}>
      {drawer && <button className="backdrop" aria-label="Close navigation" onClick={() => { setDrawer(false); toggle.current?.focus(); }}/>}
      <aside className="sidebar" id="sidebar">
        <Brand/>
        {mobile && drawer && <button className="drawer-close" onClick={() => { setDrawer(false); toggle.current?.focus(); }}>Close menu</button>}
        <nav ref={navigation} aria-label="Staff navigation">
          {links.map(([key, label, icon]) => { const active = page === key || (page === "claim" && key === "queue"); return <a key={key} href={`#${key}`} title={label} aria-label={label} aria-current={active ? "page" : undefined} onClick={() => { if (drawer) toggle.current?.focus(); setDrawer(false); }}><Icon name={icon}/><span>{label}</span></a>; })}
        </nav>
        <button type="button" className="sidebar-user" aria-label="Sign out" title="Sign out" onClick={signOut}><span className="avatar">SA</span><span className="rail-user-icon"><Icon name="logout"/></span><span className="user-label"><strong>Sara Ahmed</strong><small>Claims Staff · Sign out</small></span></button>
      </aside>
      <div className="workspace">
        <header className="topbar"><button ref={toggle} className="icon-button" aria-controls="sidebar" aria-expanded={mobile ? drawer : !collapsed} aria-label={(mobile ? drawer : !collapsed) ? "Close navigation" : "Open navigation"} onClick={switchSidebar}><Icon name={collapsed && !mobile ? "arrow" : "menu"}/></button><strong>{title}</strong><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => setInfo("Notifications")}><Icon name="bell"/></button><button className="avatar" aria-label="Staff account" onClick={() => setInfo("Staff account")}>SA</button></div></header>
        <main id="content" tabIndex={-1} className="content">
          {page === "home" && <Home/>}
          {page === "queue" && <WorkQueue/>}
          {page === "policy" && <PolicyLookup onSelect={(selected) => { setPolicy(selected); location.hash = "register"; }}/>}
          {page === "register" && <Register policy={policy} onRegistered={(claim) => { setCreated(claim.id); location.hash = `claim/${claim.id}`; }}/>}
          {page === "claim" && id && <ClaimDetails key={id} id={id} created={created}/>}
          {Object.hasOwn(previewPages, page) && <><Header title={previewPages[page as PreviewPage][0]} description={previewPages[page as PreviewPage][1]}/><Preview key={page} page={page as PreviewPage}/></>}
          {!links.some(([key]) => key === page) && !(page === "claim" && id) && <Header title="Page unavailable" description="Choose a destination from the sidebar."/>}
        </main>
      </div>
    </div>}
    <Footer show={setInfo}/>
    <dialog ref={modal} onClose={() => setInfo("")} aria-labelledby="dialog-title">
      <h2 id="dialog-title">{info}</h2>
      {info === "Help" && <p>Look up DEMO-MOTOR-001 to register a sample claim, then open it from the Work Queue.</p>}
      {info === "Privacy" && <p>The workspace uses synthetic data for the university prototype. Enter sample information only.</p>}
      {info === "Notifications" && <p>No notifications in the demo workspace.</p>}
      {info === "Staff account" && <p>Sara Ahmed · Demo Claims Staff</p>}
      <div className="actions">{info === "Staff account" && <button className="secondary" onClick={() => { modal.current?.close(); signOut(); }}>Sign out</button>}<form method="dialog"><button>Close</button></form></div>
    </dialog>
  </div>;
}

createRoot(document.getElementById("root")!).render(<App/>);

