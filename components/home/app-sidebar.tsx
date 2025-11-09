"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const views = [
  { label: "Calls", value: "calls" },
  { label: "Moments", value: "moments" },
  { label: "Entries", value: "entries" },
] as const;

export type ViewValue = (typeof views)[number]["value"];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeView: ViewValue;
  onSelectView: (value: ViewValue) => void;
};

export function AppSidebar({
  activeView,
  onSelectView,
  ...props
}: AppSidebarProps) {
  const router = useRouter();

  return (
    <Sidebar className="text-white" {...props}>
      <SidebarHeader className="border-none">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <Image
            src="/tomo-logo-white.png"
            alt="Tomo logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl"
            priority
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
              Tomo
            </p>
            <p className="text-xs text-white/60">Everyone Has a Story</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-1 flex-col text-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/70">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {views.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeView === item.value}
                    onClick={() => onSelectView(item.value)}
                  >
                    <button type="button" className="w-full text-left">
                      {item.label}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
          >
            Log Out
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
