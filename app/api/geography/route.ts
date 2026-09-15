import { districtOptions, regencyOptions, villageOptions } from "@/data/select"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const provinceId = request.nextUrl.searchParams.get("provinceId")
  const regencyId = request.nextUrl.searchParams.get("regencyId")
  const districtId = request.nextUrl.searchParams.get("districtId")

  if (!provinceId || (districtId && !regencyId)) {
    return NextResponse.json([])
  }

  if (districtId) {
    return NextResponse.json(
      await villageOptions(provinceId, regencyId!, districtId)
    )
  }

  if (regencyId) {
    return NextResponse.json(await districtOptions(provinceId, regencyId))
  }

  return NextResponse.json(await regencyOptions(provinceId))
}
