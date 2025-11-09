"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const sidebarButtonVariants = cva(
  "relative inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
  {
    variants: {
      isActive: {
        true: "bg-white/10 text-white",
        false: "text-white/70 hover:bg-white/5",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  },
);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-zinc-800 text-white">
      {children}
    </div>
  );
}

export function Sidebar({
  className,
  ...props
}: React.ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "bg-zinc-800 text-white flex w-64 flex-col border-r border-white/10",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-4 p-4", className)} {...props} />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-4 p-4", className)}
      {...props}
    />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-wide text-white/60",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return <li className={cn("list-none", className)} {...props} />;
}

type SidebarMenuButtonProps = React.ComponentProps<typeof Slot> &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive?: boolean;
    asChild?: boolean;
  };

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ className, isActive, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-slot="sidebar-menu-button"
      className={cn(sidebarButtonVariants({ isActive, className }))}
      {...props}
    />
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export function SidebarInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "placeholder:text-white/50 bg-white/5 text-sm text-white w-full rounded-xl border border-white/10 px-3 py-2 outline-none transition focus:border-white/30",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 flex-col bg-zinc-800 text-white", className)}
      {...props}
    />
  );
}
