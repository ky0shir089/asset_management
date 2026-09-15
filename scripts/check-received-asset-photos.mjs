import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import {
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
} from "../lib/upload-constants.ts"

const path = "../app/(dashboard)/asset-transaction/received-asset/action.ts"
const source = readFileSync(new URL(path, import.meta.url), "utf8")
const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
const declarations = file.statements.filter(
  (node) =>
    (ts.isFunctionDeclaration(node) && node.name?.text === "collectPhotoGroups") ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some(
      (declaration) => declaration.name.getText(file) === "ALLOWED_PHOTO_MIME_TYPES"
    ))
)
assert.equal(declarations.length, 2)
const code = ts.transpileModule(
  declarations.map((node) => node.getText(file)).join("\n"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
).outputText
const collectPhotoGroups = runInNewContext(`${code}\ncollectPhotoGroups`, {
  File,
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
})

const empty = collectPhotoGroups(new FormData(), 3)
assert.deepEqual(Array.from(empty, (group) => group.length), [0, 0, 0])

for (const type of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
  const input = new FormData()
  const upload = new File(["test"], "attachment", { type })
  input.append("photos-1", upload)
  const groups = collectPhotoGroups(input, 3)
  assert.deepEqual(Array.from(groups, (group) => group.length), [0, 1, 0])
  assert.equal(groups[1][0], upload)
}

const input = new FormData()
input.append("photos-0", new File(["test"], "text.txt", { type: "text/plain" }))
assert.throws(() => collectPhotoGroups(input, 1), /Invalid file type/)

input.set("photos-0", new File(
  [new Uint8Array(MAX_PHOTO_FILE_SIZE_BYTES)], "limit.png", { type: "image/png" }
))
assert.equal(collectPhotoGroups(input, 1)[0].length, 1)

input.set("photos-0", new File(
  [new Uint8Array(MAX_PHOTO_FILE_SIZE_BYTES + 1)], "large.png", { type: "image/png" }
))
assert.throws(() => collectPhotoGroups(input, 1), /exceeds 1 MB limit/)

console.log("received asset photo checks passed")
