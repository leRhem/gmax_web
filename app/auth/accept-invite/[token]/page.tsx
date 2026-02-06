// app/auth/accept-invite/[token]/page.tsx
"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconLoader2, IconCheck, IconAlertCircle } from "@tabler/icons-react"

interface InvitationData {
    name: string
    email: string
    role: string
    expiresAt: string
    invitedBy: string
}

export default function AcceptInvitePage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = use(params)
    const router = useRouter()
    const [invitation, setInvitation] = useState<InvitationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        password: "",
        confirmPassword: "",
    })

    useEffect(() => {
        validateInvitation()
    }, [token])

    const validateInvitation = async () => {
        try {
            const response = await fetch(`/api/invitations/${token}`)
            const data = (await response.json()) as any

            if (!response.ok) {
                setError(data.error || "Invalid invitation")
                return
            }

            setInvitation(data.invitation)
            setFormData((prev) => ({ ...prev, name: data.invitation.name }))
        } catch (err) {
            setError("Failed to validate invitation")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        if (formData.password.length < 8) {
            toast.error("Password must be at least 8 characters")
            return
        }

        try {
            setSubmitting(true)
            const response = await fetch(`/api/invitations/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    password: formData.password,
                }),
            })

            const data = (await response.json()) as any

            if (!response.ok) {
                throw new Error(data.error || "Failed to create account")
            }

            setSuccess(true)
            toast.success("Account created successfully!")

            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push("/auth/login")
            }, 2000)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex items-center gap-2">
                    <IconLoader2 className="h-6 w-6 animate-spin" />
                    <span>Validating invitation...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <IconAlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <CardTitle>Invalid Invitation</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push("/auth/login")}
                        >
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                            <IconCheck className="h-6 w-6 text-green-500" />
                        </div>
                        <CardTitle>Account Created!</CardTitle>
                        <CardDescription>
                            Your account has been set up successfully. Redirecting to login...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Accept Invitation</CardTitle>
                    <CardDescription>
                        You&apos;ve been invited to join as a team member
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Invitation Details */}
                    <div className="mb-6 p-4 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{invitation?.email}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Role:</span>
                            <Badge variant="outline">{invitation?.role}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Invited by:</span>
                            <span>{invitation?.invitedBy}</span>
                        </div>
                    </div>

                    {/* Setup Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Your Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="Enter your name"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Create Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                placeholder="At least 8 characters"
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                    setFormData({ ...formData, confirmPassword: e.target.value })
                                }
                                placeholder="Confirm your password"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
