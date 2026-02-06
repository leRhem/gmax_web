// components/staff/invite-staff-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { IconLoader2, IconMail, IconBrandWhatsapp, IconCopy } from "@tabler/icons-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface InviteStaffDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

interface Studio {
    id: string
    name: string
}

const ROLES = [
    { value: "MANAGER", label: "Manager" },
    { value: "RECEPTIONIST", label: "Receptionist" },
    { value: "PHOTOGRAPHER", label: "Photographer" },
    { value: "VIDEOGRAPHER", label: "Videographer" },
    { value: "PHOTO_EDITOR", label: "Photo Editor" },
    { value: "VIDEO_EDITOR", label: "Video Editor" },
    { value: "STAFF", label: "Staff" },
]

export function InviteStaffDialog({ open, onOpenChange, onSuccess }: InviteStaffDialogProps) {
    const [loading, setLoading] = useState(false)
    const [studios, setStudios] = useState<Studio[]>([])
    const [inviteUrl, setInviteUrl] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        email: "",
        name: "",
        phone: "",
        role: "STAFF",
        studioId: "",
    })

    useEffect(() => {
        if (open) {
            fetchStudios()
            setInviteUrl(null)
            setFormData({
                email: "",
                name: "",
                phone: "",
                role: "STAFF",
                studioId: "",
            })
        }
    }, [open])

    const fetchStudios = async () => {
        try {
            const response = await fetch("/api/studios")
            if (response.ok) {
                const data = (await response.json()) as any
                setStudios(data.studios || [])
            }
        } catch (error) {
            console.error("Fetch studios error:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.email || !formData.name || !formData.role) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            setLoading(true)
            const response = await fetch("/api/staff/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = (await response.json()) as any

            if (!response.ok) {
                throw new Error(data.error || "Failed to send invitation")
            }

            setInviteUrl(data.inviteUrl)
            toast.success("Invitation sent successfully!")
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const copyInviteUrl = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl)
            toast.success("Invitation link copied!")
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        setInviteUrl(null)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite Staff Member</DialogTitle>
                    <DialogDescription>
                        Send an invitation to add a new team member
                    </DialogDescription>
                </DialogHeader>

                {inviteUrl ? (
                    <div className="space-y-4">
                        <Alert>
                            <AlertDescription className="space-y-3">
                                <p>Invitation sent! Share this link with the new staff member:</p>
                                <div className="flex items-center gap-2">
                                    <Input value={inviteUrl} readOnly className="text-xs" />
                                    <Button size="icon" variant="outline" onClick={copyInviteUrl}>
                                        <IconCopy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() =>
                                    window.open(
                                        `mailto:${formData.email}?subject=You're invited to join the team&body=Accept your invitation: ${inviteUrl}`
                                    )
                                }
                            >
                                <IconMail className="mr-2 h-4 w-4" />
                                Send Email
                            </Button>
                            {formData.phone && (
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() =>
                                        window.open(
                                            `https://wa.me/${formData.phone.replace(/\D/g, "")}?text=You're invited to join the team! Accept here: ${inviteUrl}`
                                        )
                                    }
                                >
                                    <IconBrandWhatsapp className="mr-2 h-4 w-4" />
                                    WhatsApp
                                </Button>
                            )}
                        </div>
                        <DialogFooter>
                            <Button onClick={handleClose}>Done</Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone (for WhatsApp)</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+234 800 000 0000"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => setFormData({ ...formData, role: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES.map((role) => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="studio">Studio</Label>
                            <Select
                                value={formData.studioId || "none"}
                                onValueChange={(value) => setFormData({ ...formData, studioId: value === "none" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select studio (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No studio</SelectItem>
                                    {studios.map((studio) => (
                                        <SelectItem key={studio.id} value={studio.id}>
                                            {studio.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Send Invitation"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
