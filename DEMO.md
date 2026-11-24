# Demo and launch preparation

## Demo

1. Open Threadatlas to the Order Management outage simulation. Review the named downstream dependencies and expand a recovery plan.
2. Choose Show dependency map to inspect the same scenario visually, or open Enterprise Universe to search the full organization.
3. Open KPI DNA and follow Operating Margin through the pipeline and source system. Switch direction to compare downstream lineage.
4. Compare the 2024 and 2026 snapshots. Open AI Agent Universe and inspect cross-department access flagged by the synthetic baseline.
5. Start Executive Mode to step through the three graph evidence scenes.

## Deployment strategy

The local Docker demo is the reproducible no-cost option. For a future hosted trial, deploy both containers behind one HTTPS origin with a persistent volume for SQLite. Select a free tier only after checking current limits, storage persistence, and terms. The current app is designed for a local synthetic workspace and has no authentication. Before hosting an interactive trial, protect access at the gateway and restrict scenario writes to authorized traffic. A recording or screenshot can demonstrate the app without provisioning infrastructure.

## Launch copy

Threadatlas is an open-source graph intelligence application for tracing the systems, people, and data that support enterprise decisions. Explore a synthetic organization in 3D, simulate a dependency failure, and follow executive metrics back to their source systems. The demo runs locally and provides graph-grounded answers without a hosted AI service.

A future Render trial could run the frontend and API as two free web services. Configure the frontend API origin at build time, expose the API only for the synthetic demo, disable scenario writes at the gateway, and allow for cold starts. Render documents 750 free instance hours per workspace per month, idle spin-down and ephemeral storage. SQLite scenario persistence therefore stays in the local Compose demo. Check billing settings and terms before provisioning. [Render free-tier documentation](https://render.com/docs/free)
