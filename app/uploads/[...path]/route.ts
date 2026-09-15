import { readFile } from "node:fs/promises"
import { extname, isAbsolute, join, relative, resolve } from "node:path"
import { notFound } from "next/navigation"

const UPLOAD_BASE = join(process.cwd(), "public", "uploads")
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const filePath = resolve(UPLOAD_BASE, ...path)
  const relativePath = relative(UPLOAD_BASE, filePath)

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) notFound()

  const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()]
  if (!contentType) notFound()

  try {
    return new Response(await readFile(filePath), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    notFound()
  }
}
