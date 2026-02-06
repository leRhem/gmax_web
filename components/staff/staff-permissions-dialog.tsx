// components/staff/staff-permissions-dialog.tsx
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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { IconLoader2, IconLock, IconInfoCircle } from "@tabler/icons-react"
import { Separator } from "@/components/ui/separator"

interface StaffPermissionsDialogProps {
    staffId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

interface PagePermission {
    page: string
    label: string
    roleDefault: boolean
    customAllowed: boolean | null
}

interface StaffInfo {
    name: string
    email: string
    role: string
}

const PAGES = [
    { page: "/dashboard", label: "Dashboard" },
    { page: "/dashboard/bookings", label: "Bookings" },
    { page: "/dashboard/clients", label: "Clients" },
    { page: "/dashboard/services", label: "Services" },
    { page: "/dashboard/staffs", label: "Staff" },
    { page: "/dashboard/studios", label: "Studios" },
    { page: "/dashboard/analytics", label: "Analytics" },
    { page: "/dashboard/logs", label: "Activity Logs" },
]

export function StaffPermissionsDialog({
    staffId,
    open,
    onOpenChange,
}: StaffPermissionsDialogProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null)
    const [permissions, setPermissions] = useState<PagePermission[]>([])

    useEffect(() => {
        if (open && staffId) {
            fetchPermissions()
        }
    }, [open, staffId])

    const fetchPermissions = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/staff/${staffId}/permissions`)
            if (!response.ok) throw new Error("Failed to fetch permissions")

            const data = (await response.json()) as any
            setStaffInfo(data.staff)
            setPermissions(data.permissions)
        } catch (error) {
            toast.error("Failed to load permissions")
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = (page: string, value: boolean) => {
        setPermissions((prev) =>
            prev.map((p) =>
                p.page === page
                    ? { ...p, customAllowed: value }
                    : p
            )
        )
    }

    const handleReset = (page: string) => {
        setPermissions((prev) =>
            prev.map((p) =>
                p.page === page
                    ? { ...p, customAllowed: null }
                    : p
            )
        )
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const response = await fetch(`/api/staff/${staffId}/permissions`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    permissions: permissions.map((p) => ({
                        page: p.page,
                        allowed: p.customAllowed,
                    })),
                }),
            })

            if (!response.ok) throw new Error("Failed to save permissions")

            toast.success("Permissions updated")
            onOpenChange(false)
        } catch (error) {
            toast.error("Failed to save permissions")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconLock className="h-5 w-5" />
                        Page Permissions
                    </DialogTitle>
                    {staffInfo && (
                        <DialogDescription>
                            {staffInfo.name} ({staffInfo.role.replace(/_/g, " ")})
                        </DialogDescription>
                    )}
                </DialogHeader>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-12" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            <IconInfoCircle className="h-4 w-4" />
                            <span>
                                Custom permissions override the defaults for this staff&apos;s role.
                                Toggle off to use role default.
                            </span>
                        </div>

                        {permissions.map((perm) => {
                            const isCustom = perm.customAllowed !== null
                            const effectiveValue = isCustom ? perm.customAllowed : perm.roleDefault

                            return (
                                <div
                                    key={perm.page}
                                    className="flex items-center justify-between py-3 border-b last:border-0"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Label className="font-medium">{perm.label}</Label>
                                            {isCustom && (
                                                <Badge variant="outline" className="text-xs">
                                                    Custom
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{perm.page}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isCustom && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => handleReset(perm.page)}
                                            >
                                                Reset
                                            </Button>
                                        )}
                                        <Switch
                                            checked={effectiveValue!}
                                            onCheckedChange={(value) => handleToggle(perm.page, value)}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
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
            </DialogContent>
        </Dialog>
    )
}
