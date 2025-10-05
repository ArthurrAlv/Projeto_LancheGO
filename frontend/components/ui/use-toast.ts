"use client"

import * as React from "react"
import { type ToastProps } from "@radix-ui/react-toast"
import { type VariantProps } from "class-variance-authority"
import { toastVariants } from "@/components/ui/toast"

export type ToastActionElement = React.ReactElement
export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: VariantProps<typeof toastVariants>["variant"] // Esta linha permite o 'variant'

}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 8000

type State = {
  toasts: ToasterToast[]
}

const listeners: ((state: State) => void)[] = []
let memoryState: State = { toasts: [] }

function genId() {
  return Math.random().toString(36).substr(2, 9)
}

function dispatch(action: { type: "ADD_TOAST"; toast: ToasterToast } | { type: "DISMISS_TOAST"; toastId?: string }) {
  switch (action.type) {
    case "ADD_TOAST": {
      memoryState = { ...memoryState, toasts: [...memoryState.toasts, action.toast].slice(-TOAST_LIMIT) }
      break
    }
    case "DISMISS_TOAST": {
      memoryState = { ...memoryState, toasts: memoryState.toasts.filter((t) => t.id !== action.toastId) }
      break
    }
  }
  listeners.forEach((l) => l(memoryState))
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);

  return {
    ...state,
    toast: (props: Omit<ToasterToast, "id">) => {
      const id = genId();
      
      // Cria a notificação
      dispatch({ type: "ADD_TOAST", toast: { ...props, id } });

      // Inicia um timer para fechar automaticamente APENAS se não for um 'aviso' de ação
      if (props.variant !== "default" || !props.title?.toString().toLowerCase().includes("iniciada")) {
          setTimeout(() => dispatch({ type: "DISMISS_TOAST", toastId: id }), TOAST_REMOVE_DELAY);
      }
      
      // Retorna funções para controle manual
      return {
        id: id,
        dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
        update: (props: Omit<ToasterToast, "id">) => dispatch({ type: "ADD_TOAST", toast: { ...props, id } }),
      };
    },
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}
