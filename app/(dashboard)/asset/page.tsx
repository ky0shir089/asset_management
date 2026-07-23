import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const assetMenus = [
  { title: "Asset Category", href: "/asset/category" },
  { title: "Asset Code", href: "/asset/code" },
  { title: "Asset Brand", href: "/asset/brand" },
  { title: "Processor", href: "/asset/processor" },
  { title: "RAM", href: "/asset/ram" },
  { title: "Asset Spec", href: "/asset/spec" },
  { title: "Bank", href: "/asset/bank" },
  { title: "Supplier", href: "/asset/supplier" },
]

export default function AssetPage() {
  return (
    <>
      <h2 className="mb-4 text-3xl font-bold">Asset</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assetMenus.map((menu) => (
          <Card key={menu.href}>
            <CardHeader>
              <CardTitle>{menu.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={menu.href}
                className={buttonVariants({ variant: "outline" })}
              >
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
