"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils"
import { Home, Users, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";

const getNavigationItems = (pathname: string) => {
  // Admin pages should only show relevant admin links
  if (pathname.startsWith("/admin")) {
    return [{ name: "Gestão de Servidores", href: "/administrators", icon: Settings }]
  }

  // Regular user navigation (removed "Gestão de Administradores")
  return [
    { name: "Painel Principal", href: "/dashboard", icon: Home },
    { name: "Gestão de Alunos", href: "/students", icon: Users },
  ]
}

export function Navigation() {
  const pathname = usePathname();
  // --- MUDANÇA: Importando o AuthContext e o Router ---
  const { user, logout } = useAuth();
  const router = useRouter();

  console.log("Dados do Usuário na Navegação:", user);

  if (pathname === "/" || pathname === "/admin") return null;

  // --- MUDANÇA: Lógica de navegação agora é baseada nas permissões do usuário ---
  const navigation = [
    { name: "Painel Principal", href: "/dashboard", icon: Home },
    { name: "Gestão de Alunos", href: "/students", icon: Users },
  ];

  if (user?.is_superuser) {
    navigation.push({ name: "Gestão de Servidores", href: "/administrators", icon: Settings });
  }

  const handleLogout = () => {
    logout();
    // Se estiver na página de admin, redireciona para o login de admin. Senão, para o login principal.
    if (pathname.startsWith("/administrators")) {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-primary">
              LancheGO
            </Link>
            <div className="flex space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          {/* --- NOVO: Destaque para Superuser --- */}
          {user?.is_superuser && (
            <Badge variant="destructive" className="bg-yellow-500 text-black hover:bg-yellow-500">Superuser</Badge>
          )}
          {/* --- MUDANÇA: O botão "Sair" agora chama a função handleLogout --- */}
          <Button variant="outline" size="sm" onClick={handleLogout} className="hover:bg-red-500/80 hover:text-white">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </nav>
  );
}