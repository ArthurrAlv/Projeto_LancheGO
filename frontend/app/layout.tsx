// app/layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { Inter as FontSans } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Navigation } from "@/components/navigation"
import { Suspense } from "react"
import { cn } from "@/lib/utils"
import { AuthProvider } from "@/context/AuthContext"
import "./globals.css"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "LancheGO - Sistema de Controle de Lanches",
  description:
    "Sistema de gerenciamento de retirada de lanches escolares com autenticação biométrica",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={GeistMono.variable}>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <AuthProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <Navigation />
            {children}
          </Suspense>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
