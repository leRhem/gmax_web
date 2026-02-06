// components/bookings/record-payment-dialog.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  IconLoader2,
  IconCash,
  IconCreditCard,
  IconBuildingBank,
  IconReceipt,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  totalAmount: number
  paidAmount: number
  clientName: string
  onSuccess: () => void
}

const paymentFormSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "TRANSFER", "POS"]),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

const paymentMethods = [
  { value: "CASH", label: "Cash", icon: IconCash, color: "text-green-600" },
  { value: "TRANSFER", label: "Bank Transfer", icon: IconBuildingBank, color: "text-blue-600" },
  { value: "POS", label: "POS (Card)", icon: IconCreditCard, color: "text-purple-600" },
]

export function RecordPaymentDialog({
  open,
  onOpenChange,
  bookingId,
  totalAmount,
  paidAmount,
  clientName,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const remainingAmount = totalAmount - paidAmount

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: remainingAmount,
      method: "CASH",
      notes: "",
    },
  })

  const onSubmit = async (values: PaymentFormValues) => {
    if (values.amount > remainingAmount) {
      toast.error("Amount exceeds remaining balance")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          ...values,
        }),
      })

      if (!response.ok) {
        const error = (await response.json()) as any
        throw new Error(error.error || "Failed to record payment")
      }

      const result = (await response.json()) as any
      
      toast.success("Payment recorded successfully", {
        description: `Receipt: ${result.payment.receiptNumber}`,
      })
      
      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMethod = form.watch("method")
  const enteredAmount = form.watch("amount")
  const MethodIcon = paymentMethods.find((m) => m.value === selectedMethod)?.icon || IconCash

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconReceipt className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a manual payment for {clientName}
          </DialogDescription>
        </DialogHeader>

        {/* Payment Summary */}
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">₦{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Already Paid</span>
              <span className="font-medium text-green-600">₦{paidAmount.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="font-medium">Remaining Balance</span>
              <Badge variant="outline" className="text-lg font-bold">
                ₦{remainingAmount.toLocaleString()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Payment Method */}
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon
                      const isSelected = field.value === method.value
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => field.onChange(method.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Icon className={cn("h-5 w-5", isSelected ? method.color : "text-muted-foreground")} />
                          <span className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                            {method.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₦)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₦
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        max={remainingAmount}
                        className="pl-8"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => field.onChange(remainingAmount)}
                    >
                      Full Balance
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => field.onChange(Math.round(remainingAmount / 2))}
                    >
                      50%
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this payment..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || enteredAmount <= 0}>
                {isSubmitting ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <MethodIcon className="mr-2 h-4 w-4" />
                    Record ₦{(enteredAmount || 0).toLocaleString()}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
