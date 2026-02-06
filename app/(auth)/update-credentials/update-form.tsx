"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconLoader2, IconEye, IconEyeOff, IconCheck } from "@tabler/icons-react"

export function UpdateCredentialsForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const token = searchParams.get("token")
  
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  
  const [isSuccess, setIsSuccess] = useState(false)

  // Handle redirect in effect
  useEffect(() => {
    if (isSuccess) {
        const timerRef = setTimeout(() => {
            router.push("/login")
        }, 1500)
        return () => clearTimeout(timerRef)
    }
  }, [isSuccess, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !token) {
        toast.error("Invalid link. Please request a new one.")
        return
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/auth/update-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error((data as any).error || "Failed to update credentials")
      }

      toast.success("Password updated successfully")
      setIsSuccess(true)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!email || !token) {
    return (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center text-sm">
            Invalid or missing link parameters. Please request a new link from your administrator.
        </div>
    )
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Account</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled
              value={email}
              className="bg-muted text-muted-foreground"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
                <Input
                id="password"
                placeholder="Minimum 8 characters"
                type={showPassword ? "text" : "password"}
                autoCapitalize="none"
                autoComplete="new-password"
                disabled={loading}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                    <IconEyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                    <IconEye className="h-4 w-4 text-muted-foreground" />
                    )}
                </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              placeholder="Confirm new password"
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              disabled={loading}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>
          <Button disabled={loading}>
            {loading ? (
                <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
                </>
            ) : (
                <>
                <IconCheck className="mr-2 h-4 w-4" />
                Update Password
                </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
