"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Lock, Fingerprint } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [biometricStatus, setBiometricStatus] = useState("Aguardando leitura...")
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate login validation - replace with real authentication
    if (username === "admin" && password === "123456") {
      router.push("/dashboard")
    } else {
      setError("Usuário ou senha incorretos. Verifique suas credenciais.")
    }

    setIsLoading(false)
  }

  const handleBiometricRead = () => {
    setIsReading(true)
    setBiometricStatus("Lendo digital...")

    // Simulate biometric reading
    setTimeout(() => {
      setBiometricStatus("Digital reconhecida - Redirecionando...")
      setIsReading(false)
      router.push("/dashboard")
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-foreground">LancheGO - Controle de Acesso</CardTitle>
          <CardDescription className="text-muted-foreground">
            Faça login para gerenciar a retirada de lanches.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <Separator />

          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center space-y-3">
              <Fingerprint className="h-12 w-12 text-primary" />
              <p className="text-sm text-muted-foreground">Ou realize o login com a digital do administrador</p>
            </div>

            <div
              className="bg-muted rounded-lg p-4 cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={handleBiometricRead}
            >
              <div className="flex items-center justify-center space-x-2">
                {isReading && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                <span className="text-sm text-muted-foreground">{biometricStatus}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
