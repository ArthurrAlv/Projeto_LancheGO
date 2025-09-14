"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Users, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const pathname = usePathname()

  if (pathname === "/" || pathname === "/admin") return null

  const navigation = getNavigationItems(pathname)

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
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <Button variant="outline" size="sm" asChild className="hover:bg-red-500/80">
            <Link href="/">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
