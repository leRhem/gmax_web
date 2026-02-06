// app/(dashboard)/dashboard/studios/studios-dashboard.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconBuilding,
  IconMapPin,
  IconUsers,
  IconCurrencyNaira,
  IconCalendarStats,
  IconTrophy,
  IconRefresh,
  IconEye,
  IconChartBar,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

interface StudioSettings {
  maxSessionsPerDay: number
  defaultSessionDuration: number
}

interface Studio {
  id: string
  name: string
  slug: string
  city: string
  state: string
  country: string
  address: string
  phone: string | null
  email: string | null
  isActive: boolean
  settings: StudioSettings | null
  _count?: {
    staff: number
    bookings: number
  }
}

interface StudioMetrics {
  id: string
  name: string
  city: string
  state: string
  metrics: {
    totalBookings: number
    completedBookings: number
    completionRate: number
    revenue: number
    avgBookingValue: number
    uniqueClients: number
    staffCount: number
  }
}

interface StudiosData {
  year: number
  studios: StudioMetrics[]
  topPerformers: StudioMetrics[]
  overall: {
    totalBookings: number
    totalRevenue: number
    totalClients: number
    studioCount: number
  }
}

const initialFormData = {
  name: "",
  city: "",
  state: "",
  country: "Nigeria",
  address: "",
  phone: "",
  email: "",
  isActive: true,
  maxSessionsPerDay: 15,
  defaultSessionDuration: 45,
}

export function StudiosDashboard() {
  const router = useRouter()
  const [data, setData] = useState<StudiosData | null>(null)
  const [studios, setStudios] = useState<Studio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isToggleActiveOpen, setIsToggleActiveOpen] = useState(false)
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null)
  const [formData, setFormData] = useState(initialFormData)
  const [isSaving, setIsSaving] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    fetchStudiosData()
    fetchStudios()
  }, [selectedYear])

  const fetchStudiosData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/analytics/studios?year=${selectedYear}`)
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any
        toast.error(errorData.error || "Failed to load studio analytics")
        return
      }
      const result = (await response.json()) as any
      setData(result)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to load studio analytics")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStudios = async () => {
    try {
      const response = await fetch("/api/studios?includeInactive=true")
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any
        toast.error(errorData.error || "Failed to load studios")
        return
      }
      const result = (await response.json()) as any
      setStudios(result.studios || [])
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to load studios")
    }
  }

  const handleCreate = () => {
    setSelectedStudio(null)
    setFormData(initialFormData)
    setIsCreateOpen(true)
  }

  const handleEdit = (studio: Studio) => {
    setSelectedStudio(studio)
    setFormData({
      name: studio.name,
      city: studio.city,
      state: studio.state,
      country: studio.country,
      address: studio.address,
      phone: studio.phone || "",
      email: studio.email || "",
      isActive: studio.isActive,
      maxSessionsPerDay: studio.settings?.maxSessionsPerDay || 15,
      defaultSessionDuration: studio.settings?.defaultSessionDuration || 45,
    })
    setIsEditOpen(true)
  }

  const handleDelete = (studio: Studio) => {
    setSelectedStudio(studio)
    setIsDeleteOpen(true)
  }

  const handleToggleActive = (studio: Studio) => {
    setSelectedStudio(studio)
    setIsToggleActiveOpen(true)
  }

  const saveStudio = async () => {
    try {
      setIsSaving(true)
      const url = selectedStudio ? `/api/studios/${selectedStudio.id}` : "/api/studios"
      const method = selectedStudio ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(selectedStudio ? "Studio updated" : "Studio created")
        setIsCreateOpen(false)
        setIsEditOpen(false)
        fetchStudios()
        fetchStudiosData()
      } else {
        const error = (await response.json().catch(() => ({}))) as any
        toast.error(error.error || "Failed to save studio")
      }
    } catch (error) {
      toast.error("Failed to save studio")
    } finally {
      setIsSaving(false)
    }
  }

  const [isToggling, setIsToggling] = useState(false)

  const confirmToggleActive = async () => {
    if (!selectedStudio || isToggling) return
    try {
      setIsToggling(true)
      const response = await fetch(`/api/studios/${selectedStudio.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !selectedStudio.isActive }),
      })

      if (response.ok) {
        toast.success(selectedStudio.isActive ? "Studio deactivated" : "Studio activated")
        setIsToggleActiveOpen(false)
        fetchStudios()
        fetchStudiosData()
      } else {
        const error = (await response.json().catch(() => ({}))) as any
        toast.error(error.error || "Failed to update studio")
      }
    } catch (error) {
      toast.error("Failed to update studio")
    } finally {
      setIsToggling(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedStudio) return
    try {
      const response = await fetch(`/api/studios/${selectedStudio.id}?permanent=true`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Studio permanently deleted")
        setIsDeleteOpen(false)
        fetchStudios()
        fetchStudiosData()
      } else {
        const error = (await response.json().catch(() => ({}))) as any
        toast.error(error.error || "Failed to delete studio")
      }
    } catch (error) {
      toast.error("Failed to delete studio")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getMaxRevenue = () => {
    if (!data) return 0
    return Math.max(...data.studios.map((s) => s.metrics.revenue), 1)
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <IconBuilding className="h-8 w-8" />
            Studios Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage studio locations and view performance for {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleCreate}>
            <IconPlus className="h-4 w-4 mr-2" />
            Add Studio
          </Button>

          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => { fetchStudiosData(); fetchStudios(); }} disabled={isLoading}>
            <IconRefresh className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Overall KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Studios</CardTitle>
                <IconBuilding className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studios.filter(s => s.isActive).length}</div>
                <p className="text-xs text-muted-foreground">Active locations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <IconCurrencyNaira className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.overall.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">All studios combined</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <IconCalendarStats className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overall.totalBookings}</div>
                <p className="text-xs text-muted-foreground">Across all locations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Clients</CardTitle>
                <IconUsers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overall.totalClients}</div>
                <p className="text-xs text-muted-foreground">Served this year</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          {data.topPerformers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconTrophy className="h-5 w-5 text-yellow-500" />
                  Top Performing Studios
                </CardTitle>
                <CardDescription>Ranked by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {data.topPerformers.map((studio, index) => (
                    <Card
                      key={studio.id}
                      className={`relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                        index === 0 ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" : ""
                      }`}
                      onClick={() => router.push(`/dashboard/studios/${studio.id}`)}
                    >
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={index === 0 ? "default" : "secondary"}
                          className={index === 0 ? "bg-yellow-500" : ""}
                        >
                          #{index + 1}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{studio.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <IconMapPin className="h-3 w-3" />
                          {studio.city}, {studio.state}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Revenue</span>
                          <span className="font-bold">{formatCurrency(studio.metrics.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Bookings</span>
                          <span className="font-medium">{studio.metrics.totalBookings}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Completion</span>
                          <span className="font-medium">{studio.metrics.completionRate}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* All Studios Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconChartBar className="h-5 w-5" />
            All Studios
          </CardTitle>
          <CardDescription>Manage and view studio details</CardDescription>
        </CardHeader>
        <CardContent>
          {studios.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Studio</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Staff</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studios.map((studio) => (
                  <TableRow 
                    key={studio.id} 
                    className={`cursor-pointer hover:bg-muted/50 ${!studio.isActive ? "opacity-50" : ""}`}
                    onClick={() => router.push(`/dashboard/studios/${studio.id}`)}
                  >
                    <TableCell className="font-medium">{studio.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <IconMapPin className="h-3 w-3" />
                        {studio.city}, {studio.state}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {studio.address}
                      </p>
                    </TableCell>
                    <TableCell>
                      {studio.phone && <p className="text-sm">{studio.phone}</p>}
                      {studio.email && <p className="text-xs text-muted-foreground">{studio.email}</p>}
                    </TableCell>
                    <TableCell className="text-right">{studio._count?.staff || 0}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={studio.isActive ? "default" : "secondary"}>
                        {studio.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/studios/${studio.id}`)}
                          title="View details"
                        >
                          <IconEye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(studio)}
                          title="Edit"
                        >
                          <IconEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(studio)}
                          title={studio.isActive ? "Deactivate" : "Activate"}
                        >
                          {studio.isActive ? (
                            <IconPlayerPause className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <IconPlayerPlay className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(studio)}
                          title="Delete permanently"
                        >
                          <IconTrash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No studios found</p>
              <Button onClick={handleCreate}>
                <IconPlus className="h-4 w-4 mr-2" />
                Create First Studio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false)
          setIsEditOpen(false)
          setSelectedStudio(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudio ? "Edit Studio" : "Create New Studio"}
            </DialogTitle>
            <DialogDescription>
              {selectedStudio ? "Update studio information" : "Add a new studio location"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Studio Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. GMAX Lagos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Lagos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Lagos State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Nigeria"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Full Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter the full street address"
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+234 XXX XXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="studio@gmax.com"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-medium mb-3">Studio Settings</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxSessions">Max Sessions Per Day</Label>
                  <Input
                    id="maxSessions"
                    type="number"
                    min={1}
                    value={formData.maxSessionsPerDay}
                    onChange={(e) => setFormData({ ...formData, maxSessionsPerDay: parseInt(e.target.value) || 15 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionDuration">Session Duration (mins)</Label>
                  <Input
                    id="sessionDuration"
                    type="number"
                    min={15}
                    value={formData.defaultSessionDuration}
                    onChange={(e) => setFormData({ ...formData, defaultSessionDuration: parseInt(e.target.value) || 45 })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Studio is Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
                setIsEditOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveStudio} disabled={isSaving}>
              {isSaving ? "Saving..." : selectedStudio ? "Update Studio" : "Create Studio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Studio Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>permanently delete</strong> "{selectedStudio?.name}" and all associated data. 
              This action cannot be undone. If you just want to hide the studio, use the deactivate option instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Active Confirmation */}
      <AlertDialog open={isToggleActiveOpen} onOpenChange={setIsToggleActiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStudio?.isActive ? "Deactivate" : "Activate"} Studio?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStudio?.isActive 
                ? `Deactivating "${selectedStudio?.name}" will hide it from active lists and prevent new bookings. All existing data will be preserved.`
                : `Activating "${selectedStudio?.name}" will make it visible in active lists and allow new bookings.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleActive}>
              {selectedStudio?.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
