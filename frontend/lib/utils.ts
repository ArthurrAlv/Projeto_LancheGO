import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mapa de nomes completos das turmas
export const TURMA_NOMES: Record<string, string> = {
  "1E": "1º Ano Eletro",
  "2E": "2º Ano Eletro",
  "3E": "3º Ano Eletro",
  "1I": "1º Ano Info",
  "2I": "2º Ano Info",
  "3I": "3º Ano Info",
}