"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Client } from "@/types/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconLoader2 } from "@tabler/icons-react"

const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(
      /^(\+234|0)[789]\d{9}$/,
      "Invalid Nigerian phone number (e.g., 08012345678)"
    ),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  type: z.enum(["STANDARD", "VIP", "VVIP", "CORPORATE"]),
  notes: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface EditClientFormProps {
  client: Client
  onSuccess?: () => void // Optional callback for dialog/modal usage
  standalone?: boolean // If true, shows Cancel button and redirects
}

export function EditClientForm({ 
  client, 
  onSuccess,
  standalone = false 
}: EditClientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      address: client.address || "",
      type: client.type,
      notes: client.notes || "",
    },
  })

  const onSubmit = async (data: ClientFormData) => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
        }),
      })

      if (!response.ok) {
        const error = (await response.json()) as any
        throw new Error(error.error || "Failed to update client")
      }

      toast.success("Client updated successfully")
      
      // If used in dialog, call onSuccess callback
      if (onSuccess) {
        onSuccess()
      } else if (standalone) {
        // If standalone page, redirect to detail page
        router.push(`/dashboard/clients/${client.id}`)
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update client")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="John Doe"
          disabled={isLoading}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone"
          placeholder="08012345678"
          disabled={isLoading}
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-sm text-red-500">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (Optional)</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          disabled={isLoading}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">
          Client Type <span className="text-red-500">*</span>
        </Label>
        <Select
          value={watch("type")}
          onValueChange={(value: any) => setValue("type", value)}
          disabled={isLoading}
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STANDARD">Standard</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="VVIP">VVIP</SelectItem>
            <SelectItem value="CORPORATE">Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address (Optional)</Label>
        <Input
          id="address"
          placeholder="123 Main Street, Lagos"
          disabled={isLoading}
          {...register("address")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about the client..."
          disabled={isLoading}
          {...register("notes")}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {standalone && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="min-w-[100px]">
          {isLoading ? (
            <>
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  )
}