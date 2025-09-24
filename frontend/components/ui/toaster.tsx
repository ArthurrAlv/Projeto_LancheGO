"use client"

import { Toast, ToastTitle, ToastDescription, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, ...props }) => (
        <Toast key={id} {...props} onOpenChange={(open: boolean) => !open && dismiss(id)}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
