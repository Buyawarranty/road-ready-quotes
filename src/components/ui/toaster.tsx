import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = variant === "destructive" ? AlertTriangle : CheckCircle2
        return (
          <Toast key={id} variant={variant} {...props}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-foreground" aria-hidden="true" />
            <div className="grid min-w-0 flex-1 gap-1 text-left">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
