"use client";

import { useState } from "react";
import { ClipboardList, Database, FileCheck2, Users } from "lucide-react";

const changes = [
  {
    id: "rename-quantity",
    label: "Rename on_hand_qty to available_qty",
    column: "on_hand_qty",
    action: "Replace on_hand_qty with available_qty in the job SQL.",
  },
  {
    id: "drop-threshold",
    label: "Drop reorder_point",
    column: "reorder_point",
    action: "Replace the reorder_point lookup before dropping the column.",
  },
  {
    id: "change-cost-type",
    label: "Change unit_cost from DECIMAL to STRING",
    column: "unit_cost",
    action: "Parse unit_cost as a decimal before calculating inventory value.",
  },
  {
    id: "add-note",
    label: "Add an optional stock_note column",
    column: "stock_note",
    action: "",
  },
] as const;

const jobs = [
  {
    id: "daily-stock",
    name: "Build daily stock summary",
    owner: "Inventory Data Engineering",
    reads: ["on_hand_qty"],
    output: "stock_daily_summary",
  },
  {
    id: "reorder",
    name: "Build reorder candidates",
    owner: "Inventory Data Engineering",
    reads: ["on_hand_qty", "reorder_point"],
    output: "reorder_candidates",
  },
  {
    id: "valuation",
    name: "Calculate inventory value",
    owner: "Finance Data Engineering",
    reads: ["on_hand_qty", "unit_cost"],
    output: "inventory_valuation",
  },
];

const reports = [
  {
    name: "Stock Availability",
    owner: "Supply Reporting",
    input: "stock_daily_summary",
    check: "Refresh the report and compare stock totals for a known warehouse.",
  },
  {
    name: "Reorder Watchlist",
    owner: "Inventory Operations",
    input: "reorder_candidates",
    check:
      "Refresh the report and verify that a product below its reorder threshold still appears.",
  },
  {
    name: "Inventory Value",
    owner: "Finance Analytics",
    input: "inventory_valuation",
    check:
      "Refresh the report and reconcile total inventory value for a known warehouse.",
  },
];

export default function ChangePlanner() {
  const [changeId, setChangeId] = useState<string>(changes[0].id);
  const change = changes.find((item) => item.id === changeId) ?? changes[0];
  const affectedJobs = jobs.filter((job) => job.reads.includes(change.column));
  const affectedReports = reports.filter((report) =>
    affectedJobs.some((job) => job.output === report.input),
  );
  const owners = new Map<string, string[]>();
  for (const item of [...affectedJobs, ...affectedReports]) {
    owners.set(item.owner, [...(owners.get(item.owner) ?? []), item.name]);
  }

  return (
    <section
      className="page-body change-planner"
      aria-labelledby="planner-heading"
    >
      <div className="intro">
        <div>
          <h1 id="planner-heading">Before you change a table</h1>
          <p>Pick a change to see what to update, test, and who to tell.</p>
        </div>
      </div>

      <div className="planner-inputs">
        <div className="planner-source">
          <span>
            <Database size={16} aria-hidden="true" /> Sample Databricks table
          </span>
          <code>demo.supply.inventory_daily</code>
        </div>
        <label>
          Proposed change
          <select
            value={changeId}
            onChange={(event) => setChangeId(event.target.value)}
          >
            {changes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="planner-summary" role="status">
        {affectedJobs.length
          ? `${affectedJobs.length} job${affectedJobs.length === 1 ? "" : "s"} to update · ${affectedReports.length} report${affectedReports.length === 1 ? "" : "s"} to test · ${owners.size} teams to notify`
          : "No downstream impact found in the sample lineage."}
      </p>

      <div className="planner-results">
        <section aria-labelledby="jobs-heading">
          <h2 id="jobs-heading">
            <ClipboardList size={18} aria-hidden="true" /> Jobs to update
          </h2>
          {affectedJobs.length ? (
            <ul>
              {affectedJobs.map((job) => (
                <li key={job.id}>
                  <strong>{job.name}</strong>
                  <p>{change.action}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No sample jobs read this column.</p>
          )}
        </section>
        <section aria-labelledby="reports-heading">
          <h2 id="reports-heading">
            <FileCheck2 size={18} aria-hidden="true" /> Reports to test
          </h2>
          {affectedReports.length ? (
            <ul>
              {affectedReports.map((report) => (
                <li key={report.name}>
                  <strong>{report.name}</strong>
                  <p>{report.check}</p>
                  <small>
                    Reads <code>{report.input}</code>
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No sample reports depend on the change.</p>
          )}
        </section>
        <section aria-labelledby="owners-heading">
          <h2 id="owners-heading">
            <Users size={18} aria-hidden="true" /> Owners to notify
          </h2>
          {owners.size ? (
            <ul>
              {[...owners].map(([owner, items]) => (
                <li key={owner}>
                  <strong>{owner}</strong>
                  <p>{items.join(" · ")}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No owners are affected in this scenario.</p>
          )}
        </section>
      </div>

      <p className="planner-note">
        Fictional table, jobs, reports, and teams. Results use the sample’s
        recorded dependencies.
      </p>
    </section>
  );
}
