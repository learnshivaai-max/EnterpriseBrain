export type Entity = {
  id: string;
  label: string;
  kind: string;
  department: string;
  details: Record<string, string>;
};
export type Edge = { source: string; target: string; kind: string };
export type Graph = {
  nodes: Entity[];
  edges: Edge[];
  total: number;
  departments: Entity[];
  counts: Record<string, number>;
};
export type Evidence = {
  nodes: Entity[];
  edges: Edge[];
  levels?: Record<string, number>;
};
export type Finding = {
  title: string;
  reason: string;
  entity: Entity;
  confidence?: string;
};
export const colors: Record<string, string> = {
  department: "#79a7ff",
  application: "#51ddcd",
  process: "#b69cff",
  metric: "#f8c77d",
  dataset: "#71c2ff",
  agent: "#fa8fc8",
  policy: "#a5aaba",
  role: "#a2d98e",
};

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api" + url, options);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}
