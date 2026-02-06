// app/(dashboard)/dashboard/tasks/tasks-view.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  IconCalendarEvent,
  IconRefresh,
  IconUser,
  IconFilter,
  IconUserPlus,
  IconPhone,
  IconMail,
  IconBuilding,
  IconCheck,
  IconChecklist,
  IconPhotoCheck,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewView } from "./review-view"

interface Staff {
  id: string
  name: string | null
  email: string
  role: string
  image: string | null
}

interface Task {
  id: string
  bookingDate: string
  client: { name: string; phone: string | null; email: string | null }
  studio: { id: string; name: string; city: string }
  photographer: Staff | null
  services: string
  totalAmount: number
  status: string
  paymentStatus: string
  deliveryStatus: string
  notes: string | null
}

interface TasksData {
  tasks: Task[]
  availableStaff: Staff[]
  canReassign: boolean
  userRole: string
}

interface TasksViewProps {
  userRole: string
  userId: string
  userStudioId?: string
}

export function TasksView({ userRole, userId, userStudioId }: TasksViewProps) {
  const router = useRouter()
  const [data, setData] = useState<TasksData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState(userRole === "ADMIN" ? "all" : "me")
  
  // Reassign dialog
  const [isReassignOpen, setIsReassignOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newPhotographerId, setNewPhotographerId] = useState<string>("")
  const [isReassigning, setIsReassigning] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [statusFilter, assigneeFilter])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (assigneeFilter !== "all") params.set("assignee", assigneeFilter)
      
      const response = await fetch(`/api/tasks?${params.toString()}`)
      if (response.ok) {
        const result = (await response.json()) as any
        setData(result)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReassign = (task: Task) => {
    setSelectedTask(task)
    setNewPhotographerId(task.photographer?.id || "")
    setIsReassignOpen(true)
  }

  const confirmReassign = async () => {
    if (!selectedTask) return
    try {
      setIsReassigning(true)
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedTask.id,
          photographerId: newPhotographerId || null,
        }),
      })

      if (response.ok) {
        toast.success(newPhotographerId ? "Booking reassigned" : "Assignment removed")
        setIsReassignOpen(false)
        fetchTasks()
      } else {
        const error = (await response.json()) as any
        toast.error(error.error || "Failed to reassign")
      }
    } catch (error) {
      toast.error("Failed to reassign")
    } finally {
      setIsReassigning(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CONFIRMED: "bg-blue-500",
      PENDING_CONFIRMATION: "bg-yellow-500",
      COMPLETED: "bg-green-500",
      CANCELLED: "bg-red-500",
    }
    return (
      <Badge className={styles[status] || "bg-gray-500"}>
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      PAID: "bg-green-500",
      PARTIAL: "bg-yellow-500",
      PENDING: "bg-gray-500",
    }
    return (
      <Badge variant="outline" className={`${styles[status] || ""}`}>
        {status}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const canReassign = data?.canReassign || false

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Tabs defaultValue="bookings" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <TabsList>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
                <IconChecklist className="h-4 w-4" />
                Bookings
            </TabsTrigger>
            {(userRole === "ADMIN" || userRole === "MANAGER") && (
                <TabsTrigger value="reviews" className="flex items-center gap-2">
                    <IconPhotoCheck className="h-4 w-4" />
                    Asset Review
                </TabsTrigger>
            )}
        </TabsList>
      </div>

      {/* Page Header - visible on all tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <IconCalendarEvent className="h-8 w-8" />
            Tasks & Reviews
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage bookings, assignments, and asset reviews
          </p>
        </div>
      </div>

      <TabsContent value="bookings" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold tracking-tight">Booking Tasks</h2>
            <Button variant="outline" size="icon" onClick={fetchTasks} disabled={isLoading}>
                <IconRefresh className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <IconFilter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING_CONFIRMATION">Pending Confirmation</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {canReassign && (
                  <div className="w-48">
                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignments</SelectItem>
                        <SelectItem value="me">Assigned to Me</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card>
            <CardHeader>
              <CardTitle>Bookings List</CardTitle>
              <CardDescription>
                {data?.tasks.length || 0} booking{(data?.tasks.length || 0) !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.tasks && data.tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Services</TableHead>
                      {(userRole === "ADMIN" || userRole === "MANAGER") && (
                        <TableHead>Assigned To</TableHead>
                      )}
                      {userRole === "ADMIN" && <TableHead>Studio</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      {canReassign && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/bookings/${task.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{format(new Date(task.bookingDate), "MMM d, yyyy")}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(task.bookingDate), "h:mm a")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.client.name}</p>
                            {task.client.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <IconPhone className="h-3 w-3" />
                                {task.client.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate">{task.services}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(task.totalAmount)}</p>
                        </TableCell>
                        {(userRole === "ADMIN" || userRole === "MANAGER") && (
                          <TableCell>
                            {task.photographer ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={task.photographer.image || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {(task.photographer.name || task.photographer.email)?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{task.photographer.name || task.photographer.email}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Unassigned
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {userRole === "ADMIN" && (
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <IconBuilding className="h-3 w-3" />
                              {task.studio.name}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>{getPaymentBadge(task.paymentStatus)}</TableCell>
                        {canReassign && (
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReassign(task)}
                            >
                              <IconUserPlus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <IconCalendarEvent className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No bookings found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
      </TabsContent>

      {(userRole === "ADMIN" || userRole === "MANAGER") && (
        <TabsContent value="reviews">
            <ReviewView userRole={userRole} userStudioId={userStudioId} />
        </TabsContent>
      )}

      {/* Reassign Dialog */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Booking</DialogTitle>
            <DialogDescription>
              Assign this booking to a staff member
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Booking:</p>
              <p className="font-medium">{selectedTask?.client.name}</p>
              <p className="text-sm">{selectedTask?.services}</p>
              <p className="text-sm text-muted-foreground">
                {selectedTask && format(new Date(selectedTask.bookingDate), "PPP 'at' p")}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Assign to:</p>
              <Select value={newPhotographerId} onValueChange={setNewPhotographerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {data?.availableStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={staff.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {(staff.name || staff.email)?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{staff.name || staff.email}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {staff.role.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReassign} disabled={isReassigning}>
              {isReassigning ? "Saving..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
