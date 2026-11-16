"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Package, Settings, Users } from "lucide-react";

const ITEMS = [
  { href: "/painel", label: "Painel de Controlo", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/cotacoes", label: "Cotações", icon: FileText },
  { href: "/catalogo", label: "Produtos e Serviços", icon: Package },
  { href: "/definicoes", label: "Definições", icon: Settings },
];

export function SidebarNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={compact ? "flex gap-1 overflow-x-auto pb-1" : "flex flex-col gap-1"}>
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active}
            className={compact ? "nav-link shrink-0 !text-[12.5px] !px-3 !py-2" : "nav-link"}
          >
            <Icon size={17} strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
