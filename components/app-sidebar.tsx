"use client"

import * as React from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { SidebarModule } from "@/data/sidebar"
import {
  ChevronDown,
  ChevronRight,
  Circle,
  GalleryVerticalEndIcon,
  Landmark,
  MonitorCog,
  MonitorSmartphone,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NavUser } from "./nav-user"

const MODULE_ICONS: Record<string, LucideIcon> = {
  monitorcog: MonitorCog,
  landmark: Landmark,
  monitorsmartphone: MonitorSmartphone,
}

function getModuleIcon(icon: string) {
  const key = icon.toLowerCase().replace(/[^a-z0-9]/g, "")

  return MODULE_ICONS[key] ?? Circle
}

function isActivePath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

function AppSidebarModule({
  module,
  pathname,
}: {
  module: SidebarModule
  pathname: string
}) {
  const moduleIcon = getModuleIcon(module.icon)
  const hasActiveMenu = module.menus.some((menu) =>
    isActivePath(pathname, menu.path)
  )
  const [open, setOpen] = React.useState(hasActiveMenu)

  const [prevHasActiveMenu, setPrevHasActiveMenu] = React.useState(hasActiveMenu)
  if (hasActiveMenu !== prevHasActiveMenu) {
    setPrevHasActiveMenu(hasActiveMenu)
    if (hasActiveMenu) {
      setOpen(true)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton render={<CollapsibleTrigger />}>
          {React.createElement(moduleIcon, { className: "size-4 shrink-0" })}
          <span>{module.name}</span>
          <ChevronRight className="ml-auto group-aria-expanded/menu-button:hidden" />
          <ChevronDown className="ml-auto hidden group-aria-expanded/menu-button:block" />
        </SidebarMenuButton>
        <CollapsibleContent>
          <SidebarMenuSub>
            {module.menus.map((menu) => (
              <SidebarMenuSubItem key={menu.id}>
                <SidebarMenuSubButton
                  isActive={isActivePath(pathname, menu.path)}
                  render={<Link href={menu.path} />}
                >
                  {menu.name}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar({
  user,
  navMain,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar: string
  }
  navMain: SidebarModule[]
}) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Asset Management</span>
                <span className="">Dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {navMain.length ? (
            <SidebarMenu>
              {navMain.map((module) => (
                <AppSidebarModule
                  key={module.id}
                  module={module}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          ) : (
            <p className="px-2 text-sm text-muted-foreground">
              No menu available
            </p>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
