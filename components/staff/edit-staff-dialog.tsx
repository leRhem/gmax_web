// components/staff/edit-staff-dialog.tsx
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
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { IconLoader2, IconMail, IconBrandWhatsapp, IconKey } from "@tabler/icons-react"

interface EditStaffDialogProps {
    staffId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

interface StaffData {
    id: string
    name: string | null
    email: string
    phone: string | null
    role: string
    studioId: string | null
    isActive: boolean
}

interface Studio {
    id: string
    name: string
}

const ROLES = [
    { value: "ADMIN", label: "Admin" },
    { value: "MANAGER", label: "Manager" },
    { value: "RECEPTIONIST", label: "Receptionist" },
    { value: "PHOTOGRAPHER", label: "Photographer" },
    { value: "VIDEOGRAPHER", label: "Videographer" },
    { value: "PHOTO_EDITOR", label: "Photo Editor" },
    { value: "VIDEO_EDITOR", label: "Video Editor" },
    { value: "STAFF", label: "Staff" },
]

export function EditStaffDialog({ staffId, open, onOpenChange, onSuccess }: EditStaffDialogProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [studios, setStudios] = useState<Studio[]>([])
    const [staffData, setStaffData] = useState<StaffData | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        role: "STAFF",
        studioId: "",
        isActive: true,
    })

    useEffect(() => {
        if (open && staffId) {
            fetchStaffData()
            fetchStudios()
        }
    }, [open, staffId])

    const fetchStaffData = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/staff/${staffId}`)
            if (!response.ok) throw new Error("Failed to fetch staff")
            
            const data = (await response.json()) as any
            setStaffData(data.staff)
            setFormData({
                name: data.staff.name || "",
                role: data.staff.role,
                studioId: data.staff.studioId || "",
                isActive: data.staff.isActive,
            })
        } catch (error) {
            toast.error("Failed to load staff details")
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

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

        try {
            setSaving(true)
            const response = await fetch(`/api/staff/${staffId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name || null,
                    role: formData.role,
                    studioId: formData.studioId || null,
                    isActive: formData.isActive,
                }),
            })

            if (!response.ok) {
                const data = (await response.json()) as any
                throw new Error(data.error || "Failed to update staff")
            }

            toast.success("Staff member updated successfully")
            onSuccess?.()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const [sendingEmail, setSendingEmail] = useState(false)
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false)

    const sendCredentials = async (channel: "email" | "whatsapp") => {
        try {
            if (channel === "email") setSendingEmail(true)
            else setSendingWhatsapp(true)

            const response = await fetch(`/api/staff/${staffId}/credentials`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                let errorMsg = "Failed to send"
                try {
                    const errorJson = JSON.parse(errorText)
                    errorMsg = errorJson.error || errorMsg
                } catch { /* ignore json parse error */ }
                throw new Error(errorMsg)
            }
            
            // If ok, we can try to parse json, but strictly we don't need data if the success toast is generic
            // const data = await response.json() // optional if body unused

            toast.success(`Credentials link sent via ${channel === "email" ? "Email" : "WhatsApp"}`)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            if (channel === "email") setSendingEmail(false)
            else setSendingWhatsapp(false)
        }
    }

    const sendCredentialsLinkViaEmail = () => sendCredentials("email")
    const sendCredentialsLinkViaWhatsApp = () => sendCredentials("whatsapp")

    const handleClose = () => {
        onOpenChange(false)
        setStaffData(null)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Staff Member</DialogTitle>
                    <DialogDescription>
                        Update staff details and permissions
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : staffData ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Display (Read-only) */}
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={staffData.email} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">
                                Staff can update their email via the credentials link below
                            </p>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Staff name"
                            />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
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

                        {/* Studio */}
                        <div className="space-y-2">
                            <Label htmlFor="studio">Studio</Label>
                            <Select
                                value={formData.studioId || "none"}
                                onValueChange={(value) => setFormData({ ...formData, studioId: value === "none" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select studio" />
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

                        {/* Active Status */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="active">Active Status</Label>
                                <p className="text-xs text-muted-foreground">
                                    Inactive staff cannot access the system
                                </p>
                            </div>
                            <Switch
                                id="active"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                        </div>

                        <Separator />

                        {/* Credentials Update Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <IconKey className="h-4 w-4 text-muted-foreground" />
                                <Label>Update Email/Password</Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Send a secure link for the staff member to update their credentials
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={sendCredentialsLinkViaEmail}
                                    disabled={sendingEmail}
                                >
                                    {sendingEmail ? (
                                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <IconMail className="mr-2 h-4 w-4" />
                                    )}
                                    {sendingEmail ? "Sending..." : "Send via Email"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={sendCredentialsLinkViaWhatsApp}
                                    disabled={!staffData.phone || sendingWhatsapp}
                                >
                                    {sendingWhatsapp ? (
                                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <IconBrandWhatsapp className="mr-2 h-4 w-4" />
                                    )}
                                    {sendingWhatsapp ? "Sending..." : "Send via WhatsApp"}
                                </Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>
                                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
