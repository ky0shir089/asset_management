import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { desc, eq, ilike, like, sql } from "drizzle-orm"
import { pgTable, text } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/pg-proxy"

const tables = {
  companies: pgTable("companies", { id: text("id"), code: text("code") }),
  purchaseRequests: pgTable("purchase_requests", {
    id: text("id"), companyId: text("company_id"), prNo: text("pr_no"),
  }),
  purchaseOrders: pgTable("purchase_orders", { poNo: text("po_no") }),
  assetDatas: pgTable("asset_datas", { nomorAssets: text("nomor_assets") }),
  rentAssets: pgTable("rent_assets", { rentNo: text("rent_no") }),
}

function loadGenerator(path, names, received = false) {
  const source = readFileSync(new URL(`../app/(dashboard)/${path}/action.ts`, import.meta.url), "utf8")
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const declarations = file.statements.filter(
    (node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)
  )
  assert.equal(declarations.length, names.length)
  let code = declarations.map((node) => node.getText(file)).join("\n")
  if (received) {
    let allocation
    function visit(node) {
      if (ts.isBlock(node)) {
        const variable = (statement, name) => ts.isVariableStatement(statement) &&
          statement.declarationList.declarations.some((declaration) => declaration.name.getText(file) === name)
        const start = node.statements.findIndex((statement) => variable(statement, "now"))
        const end = node.statements.findIndex((statement) => variable(statement, "assetsToCreate"))
        if (start >= 0 && end >= start) {
          allocation = node.statements.slice(start, end + 1).map((statement) => statement.getText(file)).join("\n")
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
    assert.ok(allocation, "Received asset allocation block must exist")
    code += `\nasync function allocate(tx, { categoryName, codeValue, receivedQuantity }) {\n${allocation}\nreturn assetsToCreate.map(asset => asset.nomorAssets)\n}`
  }
  const output = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return (date) => runInNewContext(`${output}\n${received ? "allocate" : names.at(-1)}`, {
    ...tables, sql, eq, ilike, like, desc, Intl, crypto,
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [date])) }
    },
  })
}

const purchaseRequest = loadGenerator("asset-transaction/purchase-request", ["getPurchaseRequestPeriod", "generatePurchaseRequestNumber"])
const purchaseOrder = loadGenerator("asset-transaction/purchase-order", ["getPurchaseOrderPeriod", "generatePurchaseOrderNumber"])
const receivedAsset = loadGenerator("asset-transaction/received-asset", ["normalizeSlug"], true)
const rent = loadGenerator("distribution/asset-lease", ["generateRentNumber"])

// This proxy checks production SQL and simulates results; it never connects to a database.
async function check(generate, input, existing, expected, lockKey, company = "ABC") {
  let locked = false
  let queried = false
  const tx = drizzle(async (query, params) => {
    if (query.includes("pg_advisory_xact_lock")) {
      assert.deepEqual(params, [lockKey])
      locked = true
      return { rows: [] }
    }
    if (query.startsWith('select "code"') || query.includes('select "companies"."code"')) {
      if (lockKey === null) {
        assert.match(query, /for update$/)
        locked = true
      }
      return { rows: [[company]] }
    }
    assert.ok(locked, "Lock must precede sequence lookup")
    assert.ok(query.includes("coalesce(max(substring("), "Sequence must use numeric maximum, not latest row")
    assert.ok(query.includes("from '/([0-9]+)$')::numeric), 0)"))
    assert.doesNotMatch(query, /order by|limit/)
    assert.equal(params.length, 1)
    const pattern = params[0]
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/%/g, ".*")
      .replace(/_/g, ".")
    const matches = new RegExp(`^${pattern}$`, query.includes(" ilike ") ? "i" : "")
    const sequences = existing.filter((number) => matches.test(number))
      .map((number) => Number(number.split("/").at(-1)))
    queried = true
    return { rows: [[String(Math.max(0, ...sequences))]] }
  })
  if (expected instanceof RegExp) {
    await assert.rejects(() => generate(tx, input), expected)
  } else {
    const result = await generate(tx, input)
    assert.deepEqual(Array.isArray(result) ? Array.from(result) : result, expected)
  }
  assert.ok(queried)
}

for (const [kind, factory, scope] of [
  ["PR", purchaseRequest, { companyId: "company-1" }],
  ["PO", purchaseOrder, { prId: "pr-1" }],
]) {
  const existing = [
    `${kind}/ABC/26/01/999`, `${kind}/ABC/26/02/003`,
    `${kind}/ABC/25/12/9000`, `${kind}/OTHER/26/02/9000`,
  ]
  for (const month of ["02", "03", "01"]) {
    await check(factory(), { ...scope, date: `2026-${month}-15` }, existing,
      `${kind}/ABC/26/${month}/1000`, kind === "PR" ? null : `${kind}/ABC/26/`)
  }
  await check(factory(), { ...scope, date: "2027-01-01" }, existing,
    `${kind}/ABC/27/01/001`, kind === "PR" ? null : `${kind}/ABC/27/`)
  await check(factory(), { ...scope, date: "2026-02-15" }, [],
    `${kind}/ABC/26/02/001`, kind === "PR" ? null : `${kind}/ABC/26/`)
}

const assets = [
  "2026/01/IT-EQUIPMENT/LAPTOP/99999", "2026/02/IT-EQUIPMENT/LAPTOP/00003",
  "2025/12/IT-EQUIPMENT/LAPTOP/999999", "2026/02/OTHER/LAPTOP/999999",
  "2026/02/IT-EQUIPMENT/OTHER/999999",
]
const assetInput = { categoryName: " IT equipment ", codeValue: "Laptop", receivedQuantity: 2 }
for (const month of ["02", "03"]) {
  await check(receivedAsset(`2026-${month}-15T12:00:00`), assetInput, assets,
    [`2026/${month}/IT-EQUIPMENT/LAPTOP/100000`, `2026/${month}/IT-EQUIPMENT/LAPTOP/100001`],
    "2026/__/IT-EQUIPMENT/LAPTOP/")
}
await check(receivedAsset("2027-01-01T12:00:00"), assetInput, assets,
  ["2027/01/IT-EQUIPMENT/LAPTOP/00001", "2027/01/IT-EQUIPMENT/LAPTOP/00002"],
  "2027/__/IT-EQUIPMENT/LAPTOP/")

const leases = ["SWA/2026/01/00100", "SWA/2026/02/00003", "SWA/2025/12/99999"]
for (const month of ["02", "03"]) {
  await check(rent(`2026-${month}-15T12:00:00Z`), undefined, leases,
    `SWA/2026/${month}/00101`, "SWA/2026/")
}
await check(rent("2026-12-31T17:00:00Z"), undefined, leases, "SWA/2027/01/00001", "SWA/2027/")
await check(rent("2026-02-15T12:00:00Z"), undefined, ["SWA/2026/01/99998"], "SWA/2026/02/99999", "SWA/2026/")
await check(rent("2026-02-15T12:00:00Z"), undefined, ["SWA/2026/01/99999"], /Yearly asset lease number capacity reached/, "SWA/2026/")
console.log("annual numbering checks passed")
