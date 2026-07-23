import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { requireUser } from "@/data/require-user"
import { getSidebarNavForCurrentUser } from "@/data/sidebar"
import { ReactNode } from "react"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const [user, navMain] = await Promise.all([
    requireUser(),
    getSidebarNavForCurrentUser(),
  ])

  const userViewModel = {
    name: user.displayUsername || "",
    email: user.email || "",
    avatar: user.image || "/avatars/shadcn.jpg",
  }

  return (
    <SidebarProvider>
      <AppSidebar user={userViewModel} navMain={navMain} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <div className="ml-auto items-center">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
