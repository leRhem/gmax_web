// components/staff/staff-table.tsx
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
    IconChevronDown,
    IconChevronRight,
    IconDotsVertical,
    IconLayoutGrid,
    IconMinus,
    IconPlus,
    IconSearch,
    IconUsers,
    IconBuilding,
    IconPencil,
    IconLock,
    IconTrash,
    IconCash,
    IconCalendarEvent,
    IconCheck,
    IconClock,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { InviteStaffDialog } from "./invite-staff-dialog"
import { StaffPermissionsDialog } from "./staff-permissions-dialog"
import { EditStaffDialog } from "./edit-staff-dialog"
import { cn } from "@/lib/utils"

interface StaffStats {
    totalAssignments: number
    completedAssignments: number
    pendingAssignments: number
    totalRevenue: number
}

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
    createdAt: string
    stats: StaffStats
}

interface Studio {
    id: string
    name: string
}

interface StudioGroup {
    studio: Studio | null
    staff: Staff[]
}

const roleColors: Record<string, string> = {
    ADMIN: "bg-red-500/10 text-red-500 border-red-500/20",
    MANAGER: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    RECEPTIONIST: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PHOTOGRAPHER: "bg-green-500/10 text-green-500 border-green-500/20",
    VIDEOGRAPHER: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    PHOTO_EDITOR: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    VIDEO_EDITOR: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    STAFF: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

export function StaffTable() {
    const [staff, setStaff] = useState<Staff[]>([])
    const [studios, setStudios] = useState<Studio[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedStudios, setExpandedStudios] = useState<Set<string>>(new Set())
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
    const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0)

    useEffect(() => {
        fetchStaff()
    }, [])

    const fetchStaff = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/staff/all")
            if (!response.ok) throw new Error("Failed to fetch")
            
            const data = (await response.json()) as any
            setStaff(data.staff)
            setStudios(data.studios)
            setPendingInvitationsCount(data.pendingInvitations || 0)
            
            // Expand all studios by default
            const allStudioIds = new Set<string>(data.studios.map((s: Studio) => s.id))
            allStudioIds.add("unassigned")
            setExpandedStudios(allStudioIds)
        } catch (error) {
            toast.error("Failed to load staff")
        } finally {
            setLoading(false)
        }
    }

    const groupByStudio = (): StudioGroup[] => {
        const studioMap = new Map<string | null, Staff[]>()
        
        staff.forEach((s) => {
            const key = s.studioId || null
            const existing = studioMap.get(key) || []
            studioMap.set(key, [...existing, s])
        })

        const groups: StudioGroup[] = []
        studioMap.forEach((staffList, studioId) => {
            const studio = studioId ? studios.find((s) => s.id === studioId) || null : null
            groups.push({ studio, staff: staffList })
        })

        return groups.sort((a, b) => {
            if (!a.studio) return 1
            if (!b.studio) return -1
            return a.studio.name.localeCompare(b.studio.name)
        })
    }

    const expandAll = () => {
        const allIds = new Set(studios.map((s) => s.id))
        allIds.add("unassigned")
        setExpandedStudios(allIds)
    }

    const collapseAll = () => {
        setExpandedStudios(new Set())
    }

    const toggleStudio = (studioId: string) => {
        setExpandedStudios((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(studioId)) {
                newSet.delete(studioId)
            } else {
                newSet.add(studioId)
            }
            return newSet
        })
    }

    const handleRemove = async () => {
        if (!removeConfirmId) return
        
        try {
            const response = await fetch(`/api/staff/${removeConfirmId}`, {
                method: "DELETE",
            })
            
            if (!response.ok) throw new Error("Failed to remove")
            toast.success("Staff member removed")
            fetchStaff()
        } catch (error) {
            toast.error("Failed to remove staff")
        } finally {
            setRemoveConfirmId(null)
        }
    }

    const filteredGroups = groupByStudio().map((group) => ({
        ...group,
        staff: group.staff.filter(
            (s) =>
                s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.role.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter((g) => g.staff.length > 0 || searchQuery === "")

    const totalStaff = staff.length
    const activeStaff = staff.filter((s) => s.isActive).length
    const totalRevenue = staff.reduce((sum, s) => sum + s.stats.totalRevenue, 0)

    if (loading) {
        return (
            <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="h-full w-full">
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto min-h-full">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
                            <p className="text-muted-foreground">
                                Manage your team members, permissions, and performance.
                            </p>
                        </div>
                        <Button onClick={() => setIsInviteDialogOpen(true)}>
                            <IconPlus className="mr-2 h-4 w-4" />
                            Invite Staff
                        </Button>
                    </div>

                    {/* Search and Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="relative w-full max-w-md">
                            <IconSearch className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search staff by name, email, or role..."
                                className="pl-9 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={expandAll}>
                                <IconLayoutGrid className="mr-2 h-4 w-4" />
                                Expand All
                            </Button>
                            <Button variant="outline" size="sm" onClick={collapseAll}>
                                <IconMinus className="mr-2 h-4 w-4" />
                                Collapse All
                            </Button>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <IconUsers className="h-4 w-4" />
                            {activeStaff} active / {totalStaff} total
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <IconBuilding className="h-4 w-4" />
                            {studios.length} studios
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <IconCash className="h-4 w-4" />
                            ₦{totalRevenue.toLocaleString()} total revenue
                        </span>
                        {pendingInvitationsCount > 0 && (
                            <>
                                <span>•</span>
                                <Badge variant="secondary">
                                    {pendingInvitationsCount} pending invitation{pendingInvitationsCount !== 1 ? "s" : ""}
                                </Badge>
                            </>
                        )}
                    </div>

                    {/* Studios List */}
                    <div className="flex flex-col gap-4 pb-10">
                        {filteredGroups.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                                <IconUsers className="mx-auto h-12 w-12 opacity-50" />
                                <p className="mt-4">No staff members found.</p>
                                <Button
                                    className="mt-4"
                                    onClick={() => setIsInviteDialogOpen(true)}
                                >
                                    <IconPlus className="mr-2 h-4 w-4" />
                                    Invite Staff
                                </Button>
                            </div>
                        ) : (
                            filteredGroups.map((group) => (
                                <StudioCard
                                    key={group.studio?.id || "unassigned"}
                                    studio={group.studio}
                                    staff={group.staff}
                                    isExpanded={expandedStudios.has(group.studio?.id || "unassigned")}
                                    onToggle={() => toggleStudio(group.studio?.id || "unassigned")}
                                    onEdit={(id) => {
                                        setSelectedStaffId(id)
                                        setIsEditDialogOpen(true)
                                    }}
                                    onPermissions={(id) => {
                                        setSelectedStaffId(id)
                                        setIsPermissionsDialogOpen(true)
                                    }}
                                    onRemove={(id) => setRemoveConfirmId(id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Invite Dialog */}
            <InviteStaffDialog
                open={isInviteDialogOpen}
                onOpenChange={setIsInviteDialogOpen}
                onSuccess={fetchStaff}
            />

            {/* Edit Dialog */}
            {selectedStaffId && (
                <EditStaffDialog
                    staffId={selectedStaffId}
                    open={isEditDialogOpen}
                    onOpenChange={(open) => {
                        setIsEditDialogOpen(open)
                        if (!open) setSelectedStaffId(null)
                    }}
                    onSuccess={fetchStaff}
                />
            )}

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
                            This will deactivate the staff member. They will no longer be able to access the system.
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

// Studio Card Component (like ServiceCategoryCard)
function StudioCard({
    studio,
    staff,
    isExpanded,
    onToggle,
    onEdit,
    onPermissions,
    onRemove,
}: {
    studio: Studio | null
    staff: Staff[]
    isExpanded: boolean
    onToggle: () => void
    onEdit: (id: string) => void
    onPermissions: (id: string) => void
    onRemove: (id: string) => void
}) {
    const studioRevenue = staff.reduce((sum, s) => sum + s.stats.totalRevenue, 0)
    const totalAssignments = staff.reduce((sum, s) => sum + s.stats.totalAssignments, 0)

    return (
        <Card className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={onToggle}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {isExpanded ? (
                                    <IconChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                                <IconBuilding className="h-5 w-5" />
                                <span className="font-semibold">{studio?.name || "Unassigned"}</span>
                                <Badge variant="secondary">{staff.length} member{staff.length !== 1 ? "s" : ""}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <IconCalendarEvent className="h-4 w-4" />
                                    {totalAssignments} tasks
                                </span>
                                <span className="flex items-center gap-1">
                                    <IconCash className="h-4 w-4" />
                                    ₦{studioRevenue.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="p-0">
                        {/* Table Header */}
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-t">
                            <div>Staff</div>
                            <div>Role</div>
                            <div>Assignments</div>
                            <div>Revenue</div>
                            <div>Status</div>
                            <div className="w-8"></div>
                        </div>

                        {/* Staff Rows */}
                        {staff.map((member) => (
                            <StaffRow
                                key={member.id}
                                staff={member}
                                onEdit={() => onEdit(member.id)}
                                onPermissions={() => onPermissions(member.id)}
                                onRemove={() => onRemove(member.id)}
                            />
                        ))}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    )
}

// Staff Row Component with expandable details
function StaffRow({
    staff,
    onEdit,
    onPermissions,
    onRemove,
}: {
    staff: Staff
    onEdit: () => void
    onPermissions: () => void
    onRemove: () => void
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [bookings, setBookings] = useState<any[]>([])
    const [loadingBookings, setLoadingBookings] = useState(false)

    const initials = staff.name
        ? staff.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : staff.email[0].toUpperCase()

    const handleToggleExpand = async () => {
        const newExpanded = !isExpanded
        setIsExpanded(newExpanded)

        // Fetch bookings when expanding for the first time
        if (newExpanded && bookings.length === 0) {
            try {
                setLoadingBookings(true)
                const response = await fetch(`/api/staff/${staff.id}/bookings?limit=10`)
                if (response.ok) {
                    const data = (await response.json()) as any
                    setBookings(data.bookings || [])
                }
            } catch (error) {
                console.error("Error fetching bookings:", error)
            } finally {
                setLoadingBookings(false)
            }
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString("en-NG", { 
            year: "numeric", 
            month: "short", 
            day: "numeric" 
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "COMPLETED": return "bg-green-500/10 text-green-600 border-green-500/20"
            case "CONFIRMED": return "bg-blue-500/10 text-blue-600 border-blue-500/20"
            case "CANCELLED": return "bg-red-500/10 text-red-600 border-red-500/20"
            default: return "bg-amber-500/10 text-amber-600 border-amber-500/20"
        }
    }

    return (
        <div className={cn(!staff.isActive && "opacity-60")}>
            {/* Main Row (clickable to expand) */}
            <div 
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-t items-center hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={handleToggleExpand}
            >
                {/* Staff Info */}
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <IconChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                        <IconChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={staff.image || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="font-medium truncate">{staff.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground truncate">{staff.email}</p>
                    </div>
                </div>

                {/* Role */}
                <div>
                    <Badge
                        variant="outline"
                        className={cn("text-xs", roleColors[staff.role] || roleColors.STAFF)}
                    >
                        {staff.role.replace(/_/g, " ")}
                    </Badge>
                </div>

                {/* Assignments */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="flex items-center gap-1" title="Total">
                        <IconCalendarEvent className="h-3.5 w-3.5 text-muted-foreground" />
                        {staff.stats.totalAssignments}
                    </span>
                    <span className="flex items-center gap-1 text-green-600" title="Completed">
                        <IconCheck className="h-3.5 w-3.5" />
                        {staff.stats.completedAssignments}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600" title="Pending">
                        <IconClock className="h-3.5 w-3.5" />
                        {staff.stats.pendingAssignments}
                    </span>
                </div>

                {/* Revenue */}
                <div className="text-sm font-medium">
                    ₦{staff.stats.totalRevenue.toLocaleString()}
                </div>

                {/* Status */}
                <div>
                    <Badge variant={staff.isActive ? "default" : "secondary"} className="text-xs">
                        {staff.isActive ? "Active" : "Inactive"}
                    </Badge>
                </div>

                {/* Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <IconDotsVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                            <IconPencil className="mr-2 h-4 w-4" />
                            Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermissions(); }}>
                            <IconLock className="mr-2 h-4 w-4" />
                            Manage Permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        >
                            <IconTrash className="mr-2 h-4 w-4" />
                            Remove Staff
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-6 py-4 bg-muted/20 border-t">
                    <h4 className="text-sm font-medium mb-3">Recent Assignments</h4>
                    {loadingBookings ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Skeleton className="h-4 w-4 animate-pulse" />
                            Loading bookings...
                        </div>
                    ) : bookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No assignments yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {bookings.map((booking) => (
                                <div 
                                    key={booking.id} 
                                    className="flex items-center justify-between p-3 bg-background rounded-lg border text-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="font-medium">{booking.client.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(booking.bookingDate)} • {booking.services}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={cn("text-xs", getStatusColor(booking.bookingStatus))}>
                                            {booking.bookingStatus.replace(/_/g, " ")}
                                        </Badge>
                                        <span className="font-medium">₦{booking.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

