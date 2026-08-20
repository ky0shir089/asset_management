import { supplierAccountOptions } from "@/data/select"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supplierId = request.nextUrl.searchParams.get("supplierId")

  if (!supplierId) {
    return NextResponse.json([])
  }

  const accounts = await supplierAccountOptions(supplierId)
  return NextResponse.json(accounts)
}
