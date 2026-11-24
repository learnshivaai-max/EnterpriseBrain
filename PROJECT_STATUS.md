# Project status

## Implementation

| Milestone | Status |
| --- | --- |
| 1. Foundations | Next.js, FastAPI, typed graph, seed generator, SQLite scenarios and application shell implemented. |
| 2. Universe | WebGL graph, department grouping, entity search, type and department filters, pagination and relationship inspector implemented. |
| 3. Blast Radius and KPI DNA | Directed traversal, hop levels, contingency summaries, metadata and ownership evidence implemented. |
| 4. Risk, Knowledge Loss and Blind Spots | Graph-derived findings, documented backup ownership and evidence confidence implemented. |
| 5. Snapshots, Agent Universe and Ask | Three generated snapshots, agent access and overlap analysis, deterministic question answering implemented. |
| 6. Executive Mode | Three evidence scenes, auto-advance, camera controls, responsive layout and reduced-motion preference implemented. |
| 7. Engineering | Pytest and Playwright suites, CI checks, Dockerfiles, Compose and an MIT license added. |
| 8. Demo | Local demo script, deployment criteria and launch copy prepared in DEMO.md. |

## Decisions and limitations

- Next.js and React render the interface, with Three.js directly managing WebGL. The styling is custom CSS and the app uses local system fonts. The graph is the main visualization.
- NetworkX holds the seeded graph in memory. SQLite persists scenario records. Historical snapshots are generated from the built-in model.
- The default graph excludes individual employees and shows a bounded page. Departments form visual clusters. The department view aggregates cross-department dependencies and supports drill-down. The inspector provides a keyboard-operable way to browse the same entities when WebGL is unavailable.
- Natural-language parsing uses exact entity names and a limited set of intents. Optional Ollama summaries use the local loopback endpoint and fall back to the deterministic answer. A live model was unavailable here. Neo4j integration is pending.
- The current application has a local trust model and uses synthetic data. Docker and GitHub Actions require verification on their respective environments.
- There is no configured GitHub remote in this checkout. Deployment requires separate authorization.

## Verification

- Nine Pytest tests passed, covering reproducible snapshots, pagination, graph algorithms, analysis endpoints, department aggregation and SQLite persistence and the mocked Ollama contract and fallback.
- Three Playwright tests passed in Chrome, covering 3D WebGL rendering, search and relationship inspection, all ten modules, mobile layout, department aggregation and full-screen controls.
- ESLint and the Next.js production build passed. The browser run used an NTFS QA copy with the same lockfile and a loopback API running from the project checkout.
- The npm advisory audit and pip-audit reported no known vulnerabilities for the checked dependency sets. Installed direct dependency metadata reported MIT, BSD-3-Clause, ISC and Apache-2.0 licenses.
- Docker and GitHub Actions were configured. A Docker engine and an authorized GitHub remote were unavailable for execution here.
