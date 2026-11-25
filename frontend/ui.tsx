import type { ReactNode } from "react";
import { stageLabels, type Stage } from "../shared/contracts";

const paths: Record<string, string> = {
  mail: "M3 5h18v14H3z M3 6l9 7 9-7",
  lock: "M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3",
  logout: "M10 4H4v16h6m-2-8h12m-4-4 4 4-4 4",
  home: "m3 10 9-7 9 7v10H3z M9 20v-7h6v7",
  list: "M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1",
  plus: "M4 4h16v16H4z M12 8v8M8 12h8",
  search: "M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  file: "M5 3h10l4 4v14H5z M9 12h6M9 16h6",
  check: "m5 12 4 4L19 6",
  chart: "M4 20h16M7 16v-5m5 5V5m5 11V8",
  calendar: "M4 6h16v14H4z M4 10h16M8 3v5m8-5v5",
  menu: "M4 6h16M4 12h16M4 18h16",
  arrow: "m9 5 7 7-7 7",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2",
  shield: "m12 3 8 3v5c0 5-4 8-8 10-4-2-8-5-8-10V6z",
  bell: "M5 17h14l-2-4V9a5 5 0 0 0-10 0v4z M10 21h4",
  help: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 9a3 3 0 1 1 4 3l-1 1m0 3h.01",
  eye: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
};

export function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.file}/></svg>;
}

export function Header({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}

export function Panel({ title, icon = "file", children, tone = "" }: { title: string; icon?: string; children: ReactNode; tone?: string }) {
  return <section className={`panel ${tone}`}><h2><Icon name={icon}/>{title}</h2>{children}</section>;
}

export function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return <dl className="facts">{rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>;
}

export function Badge({ stage }: { stage: Stage }) {
  return <span className={`badge ${stage}`}>{stageLabels[stage]}</span>;
}

export function Table({ columns, children }: { columns: string[]; children: ReactNode }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

