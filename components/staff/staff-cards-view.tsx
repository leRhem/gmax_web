// components/staff/staff-cards-view.tsx
"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { StaffCard } from "./staff-card"
import { InviteStaffDialog } from "./invite-staff-dialog"
import { StaffPermissionsDialog } from "./staff-permissions-dialog"
import { EditStaffDialog } from "./edit-staff-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    IconPlus,
    IconLoader2,
    IconUsers,
    IconBuilding,
    IconMail,
} from "@tabler/icons-react"

interface Staff {
    id: string
    name: string | null
    email: string
    phone: string | null
    role: string
    image: string | null
    isActive: boolean
    studioId: string | null
    acceptedAt: string | null
}

interface Studio {
    id: string
    name: string
}

interface Invitation {
    id: string
    email: string
    name: string
    role: string
    status: string
    expiresAt: string
}

interface StudioGroup {
    studio: Studio | null
    staff: Staff[]
    hasMore: boolean
    page: number
}

const ITEMS_PER_PAGE = 8

export function StaffCardsView() {
    const [studioGroups, setStudioGroups] = useState<StudioGroup[]>([])
    const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
    const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
    const [loadingMore, setLoadingMore] = useState<string | null>(null)

    useEffect(() => {
        fetchStaff()
        fetchInvitations()
    }, [])

    const fetchStaff = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/staff/all")
            if (!response.ok) throw new Error("Failed to fetch staff")

            const data = (await response.json()) as any

            // Group by studio
            const grouped = groupByStudio(data.staff, data.studios)
            setStudioGroups(grouped)
        } catch (error) {
            console.error("Fetch staff error:", error)
            toast.error("Failed to load staff members")
        } finally {
            setLoading(false)
        }
    }

    const fetchInvitations = async () => {
        try {
            const response = await fetch("/api/staff/invite?status=PENDING")
            if (response.ok) {
                const data = (await response.json()) as any
                setPendingInvitations(data.invitations || [])
            }
        } catch (error) {
            console.error("Fetch invitations error:", error)
        }
    }

    const groupByStudio = (staff: Staff[], studios: Studio[]): StudioGroup[] => {
        const studioMap = new Map<string | null, Staff[]>()

        // Group staff by studioId
        staff.forEach((s) => {
            const existing = studioMap.get(s.studioId) || []
            studioMap.set(s.studioId, [...existing, s])
        })

        // Create groups with pagination info
        const groups: StudioGroup[] = []

        studioMap.forEach((staffList, studioId) => {
            const studio = studioId ? studios.find((s) => s.id === studioId) || null : null
            groups.push({
                studio,
                staff: staffList.slice(0, ITEMS_PER_PAGE),
                hasMore: staffList.length > ITEMS_PER_PAGE,
                page: 1,
            })
        })

        // Sort: studios with more staff first
        return groups.sort((a, b) => b.staff.length - a.staff.length)
    }

    const loadMoreForStudio = async (studioId: string | null) => {
        setLoadingMore(studioId || "unassigned")
        // In a real implementation, this would fetch more from the API
        // For now, we'll just simulate pagination client-side
        setTimeout(() => {
            setLoadingMore(null)
        }, 500)
    }

    const handleEdit = (staffId: string) => {
        // TODO: Open edit dialog
        toast.info("Edit functionality coming soon")
    }

    const handlePermissions = (staffId: string) => {
        setSelectedStaffId(staffId)
        setIsPermissionsDialogOpen(true)
    }

    const handleRemove = async () => {
        if (!removeConfirmId) return

        try {
            const response = await fetch(`/api/staff/${removeConfirmId}`, {
                method: "DELETE",
            })

            if (!response.ok) throw new Error("Failed to remove staff")

            toast.success("Staff member removed")
            fetchStaff()
        } catch (error) {
            toast.error("Failed to remove staff member")
        } finally {
            setRemoveConfirmId(null)
        }
    }

    if (loading) {
        return (
            <div className="space-y-8">
                {[1, 2].map((i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-8 w-48" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((j) => (
                                <Skeleton key={j} className="h-32" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Staff Management</h1>
                    <p className="text-muted-foreground">
                        Manage your team members and their permissions
                    </p>
                </div>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                    <IconPlus className="mr-2 h-4 w-4" />
                    Invite Staff
                </Button>
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <div className="rounded-lg border border-dashed p-4 bg-muted/30">
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                        <IconMail className="h-4 w-4" />
                        Pending Invitations
                        <Badge variant="secondary">{pendingInvitations.length}</Badge>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {pendingInvitations.map((inv) => (
                            <Badge
                                key={inv.id}
                                variant="outline"
                                className="py-2 px-3 text-sm"
                            >
                                {inv.name} ({inv.email}) - {inv.role}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Staff Grouped by Studio */}
            {studioGroups.map((group) => (
                <div key={group.studio?.id || "unassigned"} className="space-y-4">
                    {/* Studio Header */}
                    <div className="flex items-center gap-2">
                        <IconBuilding className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">
                            {group.studio?.name || "Unassigned"}
                        </h2>
                        <Badge variant="secondary" className="ml-2">
                            {group.staff.length} member{group.staff.length !== 1 ? "s" : ""}
                        </Badge>
                    </div>

                    {/* Staff Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.staff.map((staff) => (
                            <StaffCard
                                key={staff.id}
                                staff={staff}
                                onEdit={handleEdit}
                                onPermissions={handlePermissions}
                                onRemove={(id) => setRemoveConfirmId(id)}
                            />
                        ))}
                    </div>

                    {/* Load More */}
                    {group.hasMore && (
                        <div className="flex justify-center">
                            <Button
                                variant="outline"
                                onClick={() => loadMoreForStudio(group.studio?.id || null)}
                                disabled={loadingMore === (group.studio?.id || "unassigned")}
                            >
                                {loadingMore === (group.studio?.id || "unassigned") ? (
                                    <>
                                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    "Load More"
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            ))}

            {/* Empty State */}
            {studioGroups.length === 0 && (
                <div className="text-center py-12">
                    <IconUsers className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Staff Members</h3>
                    <p className="text-muted-foreground">
                        Get started by inviting your first team member
                    </p>
                    <Button
                        className="mt-4"
                        onClick={() => setIsInviteDialogOpen(true)}
                    >
                        <IconPlus className="mr-2 h-4 w-4" />
                        Invite Staff
                    </Button>
                </div>
            )}

            {/* Invite Dialog */}
            <InviteStaffDialog
                open={isInviteDialogOpen}
                onOpenChange={setIsInviteDialogOpen}
                onSuccess={() => {
                    fetchStaff()
                    fetchInvitations()
                }}
            />

            {/* Permissions Dialog */}
            {selectedStaffId && (
                <StaffPermissionsDialog
                    staffId={selectedStaffId}
                    open={isPermissionsDialogOpen}
                    onOpenChange={(open) => {
                        setIsPermissionsDialogOpen(open)
                        if (!open) setSelectedStaffId(null)
                    }}
                />
            )}

            {/* Remove Confirmation */}
            <AlertDialog open={!!removeConfirmId} onOpenChange={() => setRemoveConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will deactivate the staff member&apos;s account. They will no longer
                            be able to access the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemove}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
