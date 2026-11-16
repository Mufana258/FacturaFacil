import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { signOutAction } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = await requireBusiness();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[252px_1fr]">
      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen bg-[var(--navy)] text-white px-4 py-5">
        <Link href="/painel" className="flex items-center px-2">
          <span>
            <span className="block font-heading text-[17px] leading-tight">FacturaFácil</span>
            <span className="block text-[11px] text-white/55 leading-tight">Cotações profissionais</span>
          </span>
        </Link>

        <Link
          href="/cotacoes/nova"
          className="btn btn-accent mt-6 w-full !py-2.5"
        >
          <Plus size={16} /> Nova Cotação
        </Link>

        <div className="mt-5 flex-1">
          <p className="px-3 pb-2 text-[10.5px] uppercase tracking-[0.12em] text-white/40">Gestão</p>
          <SidebarNav />
        </div>

        <div className="mt-6 rounded-xl bg-white/[0.06] p-3">
          <p className="truncate text-[13px] font-semibold">{business.name}</p>
          <p className="truncate text-[11.5px] text-white/55">{user.email}</p>
          <form action={signOutAction} className="mt-2.5">
            <button className="flex items-center gap-1.5 text-[12px] text-white/70 hover:text-white" type="submit">
              <LogOut size={13} /> Terminar sessão
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-[var(--navy)] px-4 py-3 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/painel" className="flex items-center">
              <span className="font-heading text-[18px]">FacturaFácil</span>
            </Link>
            <form action={signOutAction}>
              <button type="submit" aria-label="Terminar sessão" className="p-2 text-white/70">
                <LogOut size={18} />
              </button>
            </form>
          </div>
          <div className="mt-2 -mx-1">
            <SidebarNav compact />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
