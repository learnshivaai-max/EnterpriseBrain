import { expect, test } from "@playwright/test";

test("explores the graph, filters entities and inspects relationships", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Enterprise Universe" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Enterprise Universe" }),
  ).toBeVisible();
  await expect(page.getByText("10,000", { exact: true })).toBeVisible();
  await expect(page.locator(".universe canvas")).toBeVisible();
  await page.getByLabel("Search entities").fill("Order Management");
  await page
    .getByRole("button", { name: "Order Management application" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Order Management" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Relationships", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /depends on.*Order Fulfillment/ }),
  ).toBeVisible();
  await page.getByLabel("Search entities").fill("no entity with this name");
  await expect(
    page.getByText("No entities match these filters."),
  ).toBeVisible();
});

test("loads each analytical workspace and answers with evidence", async ({
  page,
}) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation");
  const ready = [
    ["Blast Radius", "What could be affected"],
    ["Time Machine", "16 added · 0 removed"],
    ["Risk Intelligence", /^\d+ findings$/],
    ["KPI DNA", /\d+ connected entities/],
    ["AI Agent Universe", /\d+ overlapping agents/],
    ["Knowledge Loss", /\d+ assets lose all owners/],
    ["Blind Spots", /^\d+ findings$/],
    ["Executive Mode", "Operational continuity"],
  ] as const;
  for (const [name, text] of ready) {
    await navigation.getByRole("button", { name, exact: true }).click();
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Next", exact: true }).first().click();
  await expect(page.getByText("Executive KPI lineage")).toBeVisible();
  await navigation.getByRole("button", { name: "Ask Your Enterprise" }).click();
  await page
    .getByLabel("Question", { exact: true })
    .fill("What happens if Order Management fails?");
  await page.getByRole("button", { name: "Ask question" }).click();
  await expect(
    page.getByText(/Order Management has \d+ downstream dependents/),
  ).toBeVisible();
});

test("supports compact navigation, department aggregation and full-screen graph controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Enterprise Universe" })
    .click();
  await expect(page.getByText("10,000", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enterprise Universe", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Departments", exact: true }).click();
  await expect(page.getByText(/30 visible/)).toBeVisible();
  await page.getByRole("button", { name: "Strategy department" }).click();
  await expect(page.getByRole("heading", { name: "Strategy" })).toBeVisible();
  await page.getByRole("button", { name: "Explore department" }).click();
  await expect(page.getByLabel("Filter by department")).toHaveValue(
    "department-1",
  );
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Exit full screen" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Full screen", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("opens with named outage evidence and lets users switch scenarios", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Blast Radius" })
    .click();
  await expect(
    page.getByRole("heading", { name: "What breaks if this goes down?" }),
  ).toBeVisible();
  const source = page.getByRole("combobox", { name: "Simulate an outage of" });
  await expect(source).toHaveValue("application-1");
  await expect(
    page.getByRole("row", { name: /Order Fulfillment.*Order Management/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recovery plans" }),
  ).toBeVisible();
  await expect(page.locator(".universe canvas")).toHaveCount(0);
  if (process.env.ENTERPRISEBRAIN_SCREENSHOT) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: process.env.ENTERPRISEBRAIN_SCREENSHOT,
      animations: "disabled",
    });
  }
  await page.getByRole("button", { name: "Show dependency map" }).click();
  await expect(page.locator(".universe canvas")).toBeVisible();
  await page.getByRole("button", { name: "Hide dependency map" }).click();
  await source.selectOption("application-2");
  await expect(page.getByRole("table")).toContainText("Identity Directory");
  await expect(page.getByRole("table")).not.toContainText(
    "Order Management → Order Fulfillment",
  );
});

test("plans a table change from sample column lineage", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Before you change a table" }),
  ).toBeVisible();
  await expect(
    page.getByText("demo.supply.inventory_daily", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "3 jobs to update · 3 reports to test · 5 teams to notify",
  );
  if (process.env.THREADATLAS_PLANNER_SCREENSHOT) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: process.env.THREADATLAS_PLANNER_SCREENSHOT });
  }
  const change = page.getByRole("combobox", { name: "Proposed change" });
  await change.selectOption("drop-threshold");
  await expect(page.getByRole("status")).toHaveText(
    "1 job to update · 1 report to test · 2 teams to notify",
  );
  await expect(
    page.getByRole("region", { name: "Jobs to update" }),
  ).toContainText("Build reorder candidates");
  await expect(
    page.getByRole("region", { name: "Reports to test" }),
  ).toContainText("Reorder Watchlist");
  await expect(
    page.getByRole("region", { name: "Owners to notify" }),
  ).toContainText("Inventory Operations");
  await expect(
    page.getByText("Finance Analytics", { exact: true }),
  ).toHaveCount(0);
  await change.selectOption("change-cost-type");
  await expect(
    page.getByRole("region", { name: "Reports to test" }),
  ).toContainText("Inventory Value");
  await change.selectOption("add-note");
  await expect(page.getByRole("status")).toHaveText(
    "No downstream impact found in the sample lineage.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
