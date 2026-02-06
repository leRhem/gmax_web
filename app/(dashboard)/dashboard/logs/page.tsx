// app/(dashboard)/dashboard/logs/page.tsx
"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
    IconHistory,
    IconLoader2,
    IconArrowBackUp,
    IconDots,
    IconChevronLeft,
    IconChevronRight,
} from "@tabler/icons-react"
import { getActionLabel, getActionColor } from "@/lib/activity-logger-utils"

interface ActivityLog {
    id: string
    action: string
    entity: string
    entityId: string
    previousData: Record<string, any> | null
    newData: Record<string, any> | null
    canRevert: boolean
    revertedAt: string | null
    createdAt: string
    staff: {
        name: string | null
        email: string
        image: string | null
    } | null
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

const ENTITIES = [
    { value: "all", label: "All Entities" },
    { value: "booking", label: "Bookings" },
    { value: "client", label: "Clients" },
    { value: "service", label: "Services" },
    { value: "payment", label: "Payments" },
    { value: "staff", label: "Staff" },
]

export default function ActivityLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [entityFilter, setEntityFilter] = useState("all")
    const [revertingId, setRevertingId] = useState<string | null>(null)
    const [confirmRevert, setConfirmRevert] = useState<ActivityLog | null>(null)

    useEffect(() => {
        fetchLogs(1)
    }, [entityFilter])

    const fetchLogs = async (page: number) => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ page: String(page), limit: "15" })
            if (entityFilter !== "all") params.set("entity", entityFilter)

            const response = await fetch(`/api/activity-logs?${params}`)
            if (!response.ok) throw new Error("Failed to fetch logs")

            const data = (await response.json()) as any
            setLogs(data.logs)
            setPagination(data.pagination)
        } catch (error) {
            toast.error("Failed to load activity logs")
        } finally {
            setLoading(false)
        }
    }

    const handleRevert = async (log: ActivityLog) => {
        try {
            setRevertingId(log.id)
            const response = await fetch(`/api/activity-logs/${log.id}/revert`, {
                method: "POST",
            })

            if (!response.ok) {
                const data = (await response.json()) as any
                throw new Error(data.error || "Failed to revert")
            }

            toast.success("Action reverted successfully")
            fetchLogs(pagination?.page || 1)
        } catch (error: any) {
            const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Failed to revert"
            toast.error(message)
        } finally {
            setRevertingId(null)
            setConfirmRevert(null)
        }
    }

    const getStaffInitials = (staff: ActivityLog["staff"]) => {
        if (!staff) return "?"
        if (staff.name) {
            const segments = staff.name.trim().split(/\s+/).filter(Boolean)
            if (segments.length > 0) {
                return segments
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
            }
        }
        return staff.email[0].toUpperCase()
    }

    return (
        <div className="space-y-6 p-4 lg:gap-6 lg:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconHistory className="h-6 w-6" />
                        Activity Logs
                    </h1>
                    <p className="text-muted-foreground">
                        Track all changes with 3-day revert capability
                    </p>
                </div>

                {/* Filters */}
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        {ENTITIES.map((e) => (
                            <SelectItem key={e.value} value={e.value}>
                                {e.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Logs List */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-4 p-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <IconHistory className="mx-auto h-12 w-12 opacity-50" />
                            <p className="mt-4">No activity logs found</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-4 flex items-center gap-4 hover:bg-muted/50"
                                >
                                    {/* Staff Avatar */}
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={log.staff?.image || undefined} />
                                        <AvatarFallback>{getStaffInitials(log.staff)}</AvatarFallback>
                                    </Avatar>

                                    {/* Action Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Badge className={getActionColor(log.action)}>
                                                {getActionLabel(log.action)}
                                            </Badge>
                                            <span className="font-medium capitalize">{log.entity}</span>
                                            {log.revertedAt && (
                                                <Badge variant="outline" className="text-xs">
                                                    Reverted
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {log.staff?.name || log.staff?.email || "Unknown"} •{" "}
                                            {formatDistanceToNow(new Date(log.createdAt), {
                                                addSuffix: true,
                                            })}
                                        </p>
                                    </div>

                                    {/* Entity ID */}
                                    <code className="text-xs bg-muted px-2 py-1 rounded hidden md:block">
                                        {log.entityId.length > 8 ? `${log.entityId.slice(0, 8)}...` : log.entityId}
                                    </code>

                                    {/* Revert Button */}
                                    {log.canRevert && !log.revertedAt && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setConfirmRevert(log)}
                                            disabled={revertingId === log.id}
                                        >
                                            {revertingId === log.id ? (
                                                <IconLoader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <IconArrowBackUp className="mr-1 h-4 w-4" />
                                                    Revert
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                        {pagination.total}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchLogs(pagination.page - 1)}
                            disabled={pagination.page === 1}
                        >
                            <IconChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchLogs(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                        >
                            <IconChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Revert Confirmation */}
            <AlertDialog open={!!confirmRevert} onOpenChange={() => setConfirmRevert(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revert this action?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will undo the {confirmRevert?.action.toLowerCase()} action on the{" "}
                            {confirmRevert?.entity}. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => confirmRevert && handleRevert(confirmRevert)}>
                            Revert
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
