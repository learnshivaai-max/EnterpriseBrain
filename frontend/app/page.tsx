"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Aperture,
  ArrowDown,
  ArrowUp,
  AudioLines,
  Bot,
  Box,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crosshair,
  Focus,
  GitBranch,
  Globe2,
  Layers3,
  Maximize,
  Minus,
  Network,
  Play,
  Plus,
  Radar,
  Search,
  Table2,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import ChangePlanner from "./change-planner";
import Universe from "./universe";
import {
  api,
  colors,
  type Edge,
  type Entity,
  type Evidence,
  type Finding,
  type Graph,
} from "./model";

const changePlanner = 10;
const modules = [
  {
    name: "Enterprise Universe",
    icon: Globe2,
    text: "See how a fictional company’s teams, software, and data depend on each other.",
  },
  {
    name: "Blast Radius",
    icon: Activity,
    text: "Simulate dependency failures and inspect downstream impact.",
  },
  {
    name: "Time Machine",
    icon: Clock3,
    text: "Compare organizational snapshots and see what changed.",
  },
  {
    name: "Ask Your Enterprise",
    icon: CircleHelp,
    text: "Follow the recorded relationships behind each answer.",
  },
  {
    name: "Risk Intelligence",
    icon: ShieldAlert,
    text: "Inspect concentrated dependencies, unowned assets and fragile processes.",
  },
  {
    name: "KPI DNA",
    icon: GitBranch,
    text: "Trace executive indicators to their source systems.",
  },
  {
    name: "AI Agent Universe",
    icon: Bot,
    text: "Review responsibilities, model use and synthetic data access.",
  },
  {
    name: "Knowledge Loss",
    icon: Users,
    text: "Simulate losing a role and identify gaps in documented ownership.",
  },
  {
    name: "Blind Spots",
    icon: Radar,
    text: "Investigate confirmed gaps and possible capability duplication.",
  },
  {
    name: "Executive Mode",
    icon: Play,
    text: "Walk through three connected findings from the synthetic organization.",
  },
  { name: "Table change planner", icon: Table2, text: "" },
];
const moduleOrder = [
  changePlanner,
  ...Array.from({ length: changePlanner }, (_, index) => index),
];
const defaults: Record<number, string> = {
  1: "application-1",
  5: "metric-1",
  6: "agent-1",
  7: "role-1",
};
const kinds: Record<number, string> = { 5: "metric", 6: "agent", 7: "role" };
const palette = [
  "department",
  "application",
  "process",
  "dataset",
  "agent",
  "metric",
];
const demo = [
  {
    id: "application-1",
    direction: "downstream",
    heading: "Operational continuity",
    detail:
      "Follow the downstream dependencies of the order management system. Review impacted departments and contingency coverage.",
  },
  {
    id: "metric-1",
    direction: "upstream",
    heading: "Executive KPI lineage",
    detail:
      "Trace operating margin to its recorded inputs, pipelines and owners.",
  },
  {
    id: "application-2",
    direction: "downstream",
    heading: "Shared dependencies",
    detail:
      "Inspect how reliance on the identity directory can affect multiple parts of the organization.",
  },
];
const EMPTY: Evidence = { nodes: [], edges: [] };
type Inspection = {
  entity: Entity;
  nodes: Entity[];
  edges: Edge[];
  total: number;
};
type Trace = Evidence & {
  counts: Record<string, number>;
  plans: Entity[];
  departments: string[];
};
type Snapshots = {
  added: Entity[];
  removed: Entity[];
  relationship_count: number;
  risk_before: number;
  risk_after: number;
  changes: { source: string; target: string; kind: string; change: string }[];
};
type Agent = {
  excess: Entity[];
  overlaps: Entity[];
  assumption: string;
  evidence: Inspection;
};
type Knowledge = { entity: Entity; alternatives: Entity[]; mitigation: string };
type Answer = Evidence & {
  summary?: string;
  answer: string;
  assumption: string;
};
const pretty = (text: string) => text.replaceAll("_", " ");

export default function Page() {
  const [module, setModule] = useState(changePlanner);
  const [showImpactMap, setShowImpactMap] = useState(false);
  const [year, setYear] = useState(2026);
  const [before, setBefore] = useState(2024);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [department, setDepartment] = useState("");
  const [offset, setOffset] = useState(0);
  const [graph, setGraph] = useState<Graph>();
  const [graphError, setGraphError] = useState("");
  const [graphLoading, setGraphLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [target, setTarget] = useState("");
  const [inspection, setInspection] = useState<Inspection>();
  const [inspectionError, setInspectionError] = useState("");
  const [trace, setTrace] = useState<Trace>();
  const [findings, setFindings] = useState<Finding[]>();
  const [comparison, setComparison] = useState<Snapshots>();
  const [agent, setAgent] = useState<Agent>();
  const [knowledge, setKnowledge] = useState<Knowledge[]>();
  const [answer, setAnswer] = useState<Answer>();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState("upstream");
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [motion, setMotion] = useState(false);
  const [camera, setCamera] = useState({ type: "reset", tick: 0 });
  const [tab, setTab] = useState("overview");
  const [fullscreen, setFullscreen] = useState(false);
  const [clustered, setClustered] = useState(false);
  const [clusters, setClusters] = useState<Evidence>();

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (module === changePlanner) return;
    const controller = new AbortController();
    const id = setTimeout(() => {
      setGraphLoading(true);
      setGraphError("");
      const filters = new URLSearchParams({
        year: String(year),
        q: query,
        department,
        kind: kind || kinds[module] || "",
        offset: String(offset),
        limit: "180",
      });
      api<Graph>(`/graph?${filters}`, { signal: controller.signal })
        .then(setGraph)
        .catch(() => {
          if (!controller.signal.aborted)
            setGraphError(
              "Could not load the graph. Check that the API is running.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setGraphLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [year, query, department, kind, offset, module]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    api<Inspection>(`/entities/${selected}?year=${year}`, {
      signal: controller.signal,
    })
      .then(setInspection)
      .catch(() => {
        if (!controller.signal.aborted)
          setInspectionError("Entity details unavailable for this snapshot.");
      });
    return () => controller.abort();
  }, [selected, year]);

  useEffect(() => {
    const controller = new AbortController();
    const suffix = `year=${year}`;
    const options = { signal: controller.signal };
    const requests: Partial<Record<number, () => Promise<unknown>>> = {
      1: () =>
        api<Trace>(
          `/trace/${target}?direction=downstream&${suffix}`,
          options,
        ).then(setTrace),
      2: () =>
        api<Snapshots>(
          `/snapshots?before=${before}&after=${year}`,
          options,
        ).then(setComparison),
      4: () => api<Finding[]>(`/risk?${suffix}`, options).then(setFindings),
      5: () =>
        api<Trace>(
          `/trace/${target}?direction=${direction}&${suffix}`,
          options,
        ).then(setTrace),
      6: () =>
        api<Agent>(`/agents/${target}?${suffix}`, options).then(setAgent),
      7: () =>
        api<Knowledge[]>(`/knowledge/${target}?${suffix}`, options).then(
          setKnowledge,
        ),
      8: () =>
        api<Finding[]>(`/blind-spots?${suffix}`, options).then(setFindings),
      9: () =>
        api<Trace>(
          `/trace/${demo[scene].id}?direction=${demo[scene].direction}&${suffix}`,
          options,
        ).then(setTrace),
    };
    const request = requests[module];
    if (!request || (defaults[module] && !target)) return;
    const id = setTimeout(() => {
      setBusy(true);
      setError("");
      request()
        .catch(() => {
          if (!controller.signal.aborted)
            setError("This analysis could not be loaded.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 0);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [module, target, year, before, direction, scene]);

  useEffect(() => {
    if (!playing || module !== 9) return;
    const id = setTimeout(() => {
      if (scene === demo.length - 1) setPlaying(false);
      else setScene(scene + 1);
    }, 9500);
    return () => clearTimeout(id);
  }, [playing, scene, module]);

  useEffect(() => {
    if (!clustered) return;
    const controller = new AbortController();
    api<Evidence>(`/clusters?year=${year}`, { signal: controller.signal })
      .then(setClusters)
      .catch(() => {
        if (!controller.signal.aborted)
          setGraphError("Department clusters could not be loaded.");
      });
    return () => controller.abort();
  }, [clustered, year]);

  function open(index: number) {
    if (index === module) return;
    setShowImpactMap(false);
    setClustered(false);
    setModule(index);
    setTarget(defaults[index] ?? "");
    setSelected(defaults[index] ?? "");
    setInspection(undefined);
    setInspectionError("");
    setTrace(undefined);
    setFindings(undefined);
    setAgent(undefined);
    setKnowledge(undefined);
    setAnswer(undefined);
    setError("");
    setBusy(false);
    setQuery("");
    setKind("");
    setDepartment("");
    setOffset(0);
    setPlaying(false);
    setScene(0);
    setTab("overview");
  }

  function pick(id: string) {
    if (selected !== id) {
      setSelected(id);
      setInspection(undefined);
      setInspectionError("");
    }
    setTab("overview");
    const item =
      visual.nodes.find((node) => node.id === id) ??
      graph?.nodes.find((node) => node.id === id);
    if (
      item &&
      id !== target &&
      ((kinds[module] && item.kind === kinds[module]) ||
        (module === 1 &&
          ["application", "dataset", "process", "pipeline", "model"].includes(
            item.kind,
          )))
    ) {
      setTrace(undefined);
      setAgent(undefined);
      setKnowledge(undefined);
      setTarget(id);
    }
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setError("");
    setAnswer(undefined);
    try {
      setAnswer(
        await api<Answer>("/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: question.trim(), year }),
        }),
      );
    } catch {
      setError("The question could not be processed.");
    } finally {
      setBusy(false);
    }
  }

  let visual: Evidence = graph ?? EMPTY;
  if (module === 0 && clustered && clusters) visual = clusters;
  else if (module === 3 && answer?.nodes.length) visual = answer;
  else if (module === 6 && agent) visual = agent.evidence;
  else if ([1, 5, 9].includes(module) && trace) visual = trace;

  const focused = module === 9 ? demo[scene].id : selected;
  const labels = new Map(
    inspection?.nodes.map((item) => [item.id, item.label]),
  );
  const showing = visual.nodes.length;
  const previousPage = Math.max(0, offset - 180);
  const total = graph?.total ?? 0;
  const moduleInfo = modules[module];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          aria-label="Threadatlas home"
          onClick={() => open(changePlanner)}
        >
          <span className="brand-icon">
            <Aperture size={22} />
          </span>
          <span>
            Thread<span className="brand-accent">atlas</span>
            <small>Enterprise dependency map</small>
          </span>
        </button>
        <div className="workspace">
          <span className="workspace-icon">
            <Box size={17} />
          </span>
          <div>
            <strong>Nexora Global</strong>
            <small>Fictional company demo</small>
          </div>
        </div>
        <div className="nav-label">Intelligence modules</div>
        <nav aria-label="Intelligence modules">
          {moduleOrder.map((index) => {
            const { name, icon: Icon } = modules[index];
            return (
              <button
                key={name}
                aria-label={name}
                className={module === index ? "active" : ""}
                aria-current={module === index ? "page" : undefined}
                onClick={() => open(index)}
              >
                <Icon size={17} />
                <span>{name}</span>
                {module === index && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" /> Local intelligence
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="breadcrumbs">
            <Layers3 size={16} /> Workspace <ChevronRight size={13} />{" "}
            <strong>{moduleInfo.name}</strong>
          </div>
          {module !== changePlanner && (
            <label className="snapshot">
              <Clock3 size={15} />
              <span>Snapshot</span>
              <select
                aria-label="Active snapshot"
                value={year}
                onChange={(event) => {
                  setYear(Number(event.target.value));
                  setOffset(0);
                  setComparison(undefined);
                  setInspection(undefined);
                  setInspectionError("");
                  setAnswer(undefined);
                }}
              >
                <option>2026</option>
                <option>2025</option>
                <option>2024</option>
              </select>
            </label>
          )}
        </header>
        {module === changePlanner && <ChangePlanner />}
        <section className="page-body" hidden={module === changePlanner}>
          <div className="intro">
            <div>
              <h1>
                {module === 1
                  ? "What breaks if this goes down?"
                  : moduleInfo.name}
              </h1>
              <p>
                {module === 1
                  ? "Choose a system to see which parts of the company depend on it."
                  : moduleInfo.text}
              </p>
            </div>
          </div>
          {module === 0 && (
            <div className="metrics">
              {[
                ["employee", "Employees"],
                ["department", "Departments"],
                ["application", "Applications"],
                ["process", "Processes"],
                ["agent", "AI agents"],
              ].map(([key, name]) => (
                <div className="metric" key={key}>
                  <span
                    className="metric-dot"
                    style={{ background: colors[key] ?? "#9084d8" }}
                  />
                  <div>
                    <strong>
                      {graph?.counts[key]?.toLocaleString("en-US") ?? "—"}
                    </strong>
                    <small>{name}</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {module === 1 && (
            <ImpactReport
              trace={trace}
              target={target}
              graph={graph}
              busy={busy}
              error={error}
              showMap={showImpactMap}
              toggleMap={() => setShowImpactMap(!showImpactMap)}
              chooseTarget={(id) => {
                if (id === target) return;
                setTrace(undefined);
                setInspection(undefined);
                setSelected(id);
                setTarget(id);
              }}
            />
          )}

          {module !== changePlanner && (module !== 1 || showImpactMap) && (
            <div className="dashboard">
              <section
                className={
                  fullscreen ? "graph-panel fullscreen" : "graph-panel"
                }
                aria-label="Knowledge graph"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setFullscreen(false);
                }}
              >
                <div className="graph-tools">
                  {module === 0 && (
                    <button
                      className="secondary"
                      aria-pressed={clustered}
                      onClick={() => setClustered(!clustered)}
                    >
                      <Network size={15} /> Departments
                    </button>
                  )}
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search entities"
                      placeholder="Search entities…"
                      value={query}
                      onChange={(event) => {
                        setClustered(false);
                        setQuery(event.target.value);
                        setOffset(0);
                      }}
                    />
                  </label>
                  <select
                    aria-label="Filter by department"
                    value={department}
                    onChange={(event) => {
                      setClustered(false);
                      setDepartment(event.target.value);
                      setOffset(0);
                    }}
                  >
                    <option value="">All departments</option>
                    {graph?.departments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by entity type"
                    value={kind}
                    onChange={(event) => {
                      setClustered(false);
                      setKind(event.target.value);
                      setOffset(0);
                    }}
                  >
                    <option value="">All types</option>
                    {Object.keys(graph?.counts ?? {}).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="viewport">
                  <Universe
                    data={visual}
                    selected={focused}
                    pick={pick}
                    cameraAction={camera}
                    motion={motion}
                  />
                  <div className="canvas-label">
                    <span className="status-dot" />
                    {clustered
                      ? "Department dependencies"
                      : visual === graph
                        ? "Graph explorer"
                        : "Analysis evidence"}
                  </div>
                  <div className="camera">
                    {[
                      [Plus, "in", "Zoom in"],
                      [Minus, "out", "Zoom out"],
                      [Focus, "reset", "Reset camera"],
                    ].map(([Icon, type, label]) => {
                      const CameraIcon = Icon as typeof Plus;
                      return (
                        <button
                          key={String(type)}
                          aria-label={String(label)}
                          title={String(label)}
                          onClick={() =>
                            setCamera({
                              type: String(type),
                              tick: camera.tick + 1,
                            })
                          }
                        >
                          <CameraIcon size={17} />
                        </button>
                      );
                    })}
                    <button
                      aria-label="Toggle animation"
                      aria-pressed={motion}
                      title="Toggle animation"
                      onClick={() => setMotion(!motion)}
                    >
                      <AudioLines size={17} />
                    </button>
                    <button
                      aria-label={
                        fullscreen ? "Exit full screen" : "Full screen"
                      }
                      title="Full screen"
                      onClick={() => setFullscreen(!fullscreen)}
                    >
                      <Maximize size={17} />
                    </button>
                  </div>
                  {graphLoading && !graph && (
                    <div className="graph-notice" role="status">
                      Loading organization…
                    </div>
                  )}
                  {graphError && (
                    <div className="graph-notice" role="alert">
                      {graphError}
                    </div>
                  )}
                  {!graphLoading && graph && !showing && (
                    <div className="graph-notice">
                      No entities match these filters.
                    </div>
                  )}
                  <div className="legend">
                    {palette.map((item) => (
                      <span key={item}>
                        <i style={{ background: colors[item] }} />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <footer className="graph-footer">
                  <span>
                    <Crosshair size={14} /> {showing} visible ·{" "}
                    {visual.edges.length} relationships
                  </span>
                  <span>Drag to rotate · Scroll to zoom</span>
                </footer>
              </section>

              <aside
                className="inspector"
                aria-label="Entity and analysis inspector"
              >
                <div className="inspector-title">
                  <span>
                    <Layers3 size={17} />{" "}
                    {module === 0 ? "Entity explorer" : moduleInfo.name}
                  </span>
                  {selected && (
                    <button
                      title="Clear selection"
                      aria-label="Clear selection"
                      onClick={() => {
                        setSelected("");
                        setInspection(undefined);
                        setInspectionError("");
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="inspector-body">
                  {module === 2 && (
                    <div className="analysis">
                      <label>
                        Compare from{" "}
                        <select
                          aria-label="Compare from snapshot"
                          value={before}
                          onChange={(event) =>
                            setBefore(Number(event.target.value))
                          }
                        >
                          <option>2024</option>
                          <option>2025</option>
                          <option>2026</option>
                        </select>
                      </label>
                      {comparison && (
                        <>
                          <strong>
                            {comparison.added.length} added ·{" "}
                            {comparison.removed.length} removed
                          </strong>
                          <p>
                            {comparison.relationship_count} relationship changes
                            · {comparison.risk_before} → {comparison.risk_after}{" "}
                            risk findings
                          </p>
                          {comparison.added
                            .concat(comparison.removed)
                            .slice(0, 12)
                            .map((item) => (
                              <p key={item.id}>{item.label}</p>
                            ))}
                          <details>
                            <summary>Ownership and dependency changes</summary>
                            {comparison.changes.slice(0, 35).map((item) => (
                              <p key={JSON.stringify(item)}>
                                {item.change} · {item.source}{" "}
                                {pretty(item.kind)} {item.target}
                              </p>
                            ))}
                          </details>
                        </>
                      )}
                    </div>
                  )}
                  {module === 3 && (
                    <form className="analysis" onSubmit={ask}>
                      <label htmlFor="question">Question</label>
                      <textarea
                        id="question"
                        maxLength={400}
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        placeholder="What happens if Order Management fails?"
                      />
                      <button
                        className="primary"
                        disabled={busy || !question.trim()}
                      >
                        Ask question
                      </button>
                      {answer && (
                        <>
                          <strong>{answer.answer}</strong>
                          {answer.summary && (
                            <div>
                              <small>Local model summary</small>
                              <p>{answer.summary}</p>
                            </div>
                          )}
                          <p>{answer.assumption}</p>
                          {answer.edges.slice(0, 15).map((edge) => (
                            <p key={edge.source + edge.target}>
                              {
                                answer.nodes.find(
                                  (item) => item.id === edge.source,
                                )?.label
                              }{" "}
                              · {pretty(edge.kind)} ·{" "}
                              {
                                answer.nodes.find(
                                  (item) => item.id === edge.target,
                                )?.label
                              }
                            </p>
                          ))}
                        </>
                      )}
                    </form>
                  )}
                  {module === 5 && (
                    <div className="direction">
                      <button
                        className={direction === "upstream" ? "chosen" : ""}
                        onClick={() => setDirection("upstream")}
                      >
                        <ArrowUp size={14} /> Upstream
                      </button>
                      <button
                        className={direction === "downstream" ? "chosen" : ""}
                        onClick={() => setDirection("downstream")}
                      >
                        <ArrowDown size={14} /> Downstream
                      </button>
                    </div>
                  )}
                  {module === 9 && (
                    <div className="analysis">
                      <small>
                        Scene {scene + 1} of {demo.length}
                      </small>
                      <strong>{demo[scene].heading}</strong>
                      <p>{demo[scene].detail}</p>
                      <div className="direction">
                        <button
                          disabled={!scene}
                          onClick={() => setScene(scene - 1)}
                        >
                          <ChevronLeft size={16} /> Previous
                        </button>
                        <button
                          disabled={scene === demo.length - 1}
                          onClick={() => setScene(scene + 1)}
                        >
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                      <button
                        className="primary"
                        onClick={() => {
                          if (!playing && scene === demo.length - 1)
                            setScene(0);
                          setPlaying(!playing);
                        }}
                      >
                        {playing ? "Pause presentation" : "Play presentation"}
                      </button>
                    </div>
                  )}
                  {trace && [5, 9].includes(module) && (
                    <div className="analysis">
                      <strong>
                        {Object.values(trace.counts).reduce(
                          (sum, value) => sum + value,
                          0,
                        )}{" "}
                        connected entities
                      </strong>
                      <p>{trace.departments.length} departments</p>
                      <div className="tags">
                        {Object.entries(trace.counts).map(([name, count]) => (
                          <span key={name}>
                            {count} {name}
                          </span>
                        ))}
                      </div>
                      {module !== 5 && (
                        <details>
                          <summary>
                            {trace.plans.length} documented contingency plans
                          </summary>
                          {trace.plans.map((item) => (
                            <p key={item.id}>
                              {item.label} · {item.details.procedure}
                            </p>
                          ))}
                        </details>
                      )}
                    </div>
                  )}
                  {agent && module === 6 && (
                    <div className="analysis">
                      <strong>
                        {agent.overlaps.length} overlapping agents
                      </strong>
                      <p>
                        {agent.overlaps.map((item) => item.label).join(", ") ||
                          "No recorded overlaps."}
                      </p>
                      <strong>
                        {agent.excess.length} access paths to review
                      </strong>
                      <p>
                        {agent.excess.map((item) => item.label).join(", ") ||
                          "No grants outside the baseline."}
                      </p>
                      <small>{agent.assumption}</small>
                    </div>
                  )}
                  {knowledge && module === 7 && (
                    <div className="analysis">
                      <strong>
                        {
                          knowledge.filter((item) => !item.alternatives.length)
                            .length
                        }{" "}
                        assets lose all owners
                      </strong>
                      {knowledge.length ? (
                        knowledge.map((row) => (
                          <div key={row.entity.id}>
                            <b>{row.entity.label}</b>
                            <p>
                              {row.alternatives
                                .map((item) => item.label)
                                .join(", ") || row.mitigation}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p>No documented assets are assigned to this role.</p>
                      )}
                    </div>
                  )}
                  {findings && [4, 8].includes(module) && (
                    <div className="analysis">
                      <strong>{findings.length} findings</strong>
                      {findings.slice(0, 40).map((row) => (
                        <button
                          className="finding"
                          key={row.entity.id + row.title}
                          onClick={() => pick(row.entity.id)}
                        >
                          <b>{row.title}</b>
                          <span>
                            {row.entity.label}
                            {row.confidence ? ` · ${row.confidence}` : ""}
                          </span>
                          <small>{row.reason}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {busy && (
                    <p className="message" role="status">
                      Analyzing relationships…
                    </p>
                  )}
                  {error && (
                    <p className="message" role="alert">
                      {error}
                    </p>
                  )}
                  {inspectionError && (
                    <p className="message" role="alert">
                      {inspectionError}
                    </p>
                  )}
                  {inspection && (
                    <div className="entity-card">
                      <div className="eyebrow">{inspection.entity.kind}</div>
                      <h2>{inspection.entity.label}</h2>
                      <div className="direction">
                        <button
                          className={tab === "overview" ? "chosen" : ""}
                          onClick={() => setTab("overview")}
                        >
                          Overview
                        </button>
                        <button
                          className={tab === "edges" ? "chosen" : ""}
                          onClick={() => setTab("edges")}
                        >
                          Relationships
                        </button>
                      </div>
                      {tab === "overview" ? (
                        <>
                          <p>{inspection.total} recorded relationships</p>
                          {inspection.entity.kind === "department" && (
                            <button
                              className="secondary"
                              onClick={() => {
                                setClustered(false);
                                setDepartment(inspection.entity.id);
                                setOffset(0);
                              }}
                            >
                              Explore department
                            </button>
                          )}
                          {Object.entries(inspection.entity.details).map(
                            ([label, value]) => (
                              <p key={label}>
                                <b>{label}</b> · {value}
                              </p>
                            ),
                          )}
                        </>
                      ) : (
                        inspection.edges.map((edge) => {
                          const other =
                            edge.source === selected
                              ? edge.target
                              : edge.source;
                          return (
                            <button
                              className="edge"
                              key={edge.source + edge.target}
                              onClick={() => pick(other)}
                            >
                              <span>{pretty(edge.kind)}</span>
                              {labels.get(other) ?? other}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                  <div className="entity-list">
                    <div className="list-label">
                      {clustered
                        ? "Browse departments"
                        : visual === graph
                          ? "Browse entities"
                          : "Evidence entities"}
                      <span>
                        {visual === graph
                          ? total.toLocaleString("en-US")
                          : showing}
                      </span>
                    </div>
                    {visual.nodes.map((item) => (
                      <button
                        className={selected === item.id ? "picked" : ""}
                        key={item.id}
                        onClick={() => pick(item.id)}
                      >
                        <i
                          style={{ background: colors[item.kind] ?? "#a7a6bd" }}
                        />
                        <span>
                          {item.label}
                          <small>{item.kind}</small>
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                    {visual !== graph && graph && (
                      <details className="browse">
                        <summary>Choose a different entity</summary>
                        {graph.nodes
                          .filter(
                            (item) =>
                              !kinds[module] || item.kind === kinds[module],
                          )
                          .map((item) => (
                            <button key={item.id} onClick={() => pick(item.id)}>
                              {item.label}
                            </button>
                          ))}
                      </details>
                    )}
                    {!clustered && total > 180 && (
                      <div className="pagination">
                        <button
                          disabled={offset === 0}
                          onClick={() => setOffset(previousPage)}
                        >
                          Previous
                        </button>
                        <span>
                          {offset + 1}–{Math.min(offset + 180, total)}
                        </span>
                        <button
                          disabled={offset + 180 >= total}
                          onClick={() => setOffset(offset + 180)}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ImpactReport({
  trace,
  target,
  graph,
  busy,
  error,
  showMap,
  toggleMap,
  chooseTarget,
}: {
  trace?: Trace;
  target: string;
  graph?: Graph;
  busy: boolean;
  error: string;
  showMap: boolean;
  toggleMap: () => void;
  chooseTarget: (id: string) => void;
}) {
  const source =
    trace?.nodes.find((item) => item.id === target) ??
    graph?.nodes.find((item) => item.id === target);
  const applications =
    graph?.nodes.filter((item) => item.kind === "application") ?? [];
  const affected =
    trace?.nodes.filter(
      (item) => item.id !== target && trace.levels?.[item.id] !== undefined,
    ) ?? [];
  affected.sort(
    (left, right) =>
      (trace?.levels?.[left.id] ?? 0) - (trace?.levels?.[right.id] ?? 0) ||
      left.label.localeCompare(right.label),
  );
  const names = new Map(trace?.nodes.map((item) => [item.id, item.label]));

  return (
    <section className="impact-report" aria-label="Outage simulation">
      <div className="scenario-controls">
        <label>
          Simulate an outage of
          <select
            value={target}
            onChange={(event) => chooseTarget(event.target.value)}
          >
            {!applications.some((item) => item.id === target) && (
              <option value={target}>
                {source?.label ??
                  (target === defaults[1] ? "Order Management" : target)}
              </option>
            )}
            {applications.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          type="button"
          aria-expanded={showMap}
          onClick={toggleMap}
        >
          <Network size={16} />{" "}
          {showMap ? "Hide dependency map" : "Show dependency map"}
        </button>
      </div>
      {showMap ? null : error ? (
        <p role="alert">{error}</p>
      ) : !trace || busy ? (
        <p role="status">Checking dependencies…</p>
      ) : (
        <>
          <div className="impact-totals">
            <div>
              <strong>{affected.length}</strong>
              <span>affected entities</span>
            </div>
            <div>
              <strong>{trace.counts.process ?? 0}</strong>
              <span>business processes</span>
            </div>
            <div>
              <strong>{trace.departments.length}</strong>
              <span>departments</span>
            </div>
          </div>
          <div className="impact-columns">
            <section className="impact-results">
              <h2>What could be affected</h2>
              {affected.length ? (
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Dependency path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affected.map((item) => {
                      const path = [item.label];
                      let current = item.id;
                      let level = trace.levels?.[current] ?? 0;
                      while (level > 0) {
                        const edge = trace.edges.find(
                          (edge) =>
                            edge.source === current &&
                            [
                              "depends_on",
                              "can_read",
                              "uses_model",
                              "uses_tool",
                            ].includes(edge.kind) &&
                            trace.levels?.[edge.target] === level - 1,
                        );
                        if (!edge) break;
                        current = edge.target;
                        path.unshift(names.get(current) ?? current);
                        level--;
                      }
                      return (
                        <tr key={item.id}>
                          <th scope="row">
                            {item.label}
                            <small>{item.kind}</small>
                          </th>
                          <td>{path.join(" → ")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p>No downstream dependencies were recorded.</p>
              )}
            </section>
            <aside className="impact-recovery">
              <h2>Recovery plans</h2>
              <p>
                {trace.plans.length
                  ? "Documented options for responding to this outage."
                  : "No plans are linked to the affected items."}
              </p>
              {trace.plans.map((plan) => (
                <details key={plan.id}>
                  <summary>{plan.label}</summary>
                  <p>{plan.details.procedure}</p>
                </details>
              ))}
              <p className="impact-note">
                Simulation uses the recorded dependencies in the fictional
                Nexora Global dataset.
              </p>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
