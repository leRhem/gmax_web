// app/(dashboard)/dashboard/studios/[id]/studio-detail-view.tsx
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
  IconPhone,
  IconMail,
  IconArrowLeft,
  IconEdit,
  IconSettings,
  IconChartBar,
  IconClock,
  IconCalendar,
  IconCheck,
  IconX,
  IconUserCircle,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface StudioSettings {
  maxSessionsPerDay: number
  defaultSessionDuration: number
  requireConfirmation: boolean
  confirmationExpiryHours: number
  allowPartialPayment: boolean
  minimumDepositPercentage: number
}

interface StaffMember {
  id: string
  name: string | null
  role: string
  email: string
  phone: string | null
  image: string | null
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
  staff: StaffMember[]
  _count: {
    bookings: number
    staff: number
  }
}

interface BookingStat {
  status: string
  count: number
}

interface StudioData {
  studio: Studio
  stats: {
    yearlyRevenue: number
    bookingStats: BookingStat[]
  }
}

interface StudioDetailViewProps {
  studioId: string
}

export function StudioDetailView({ studioId }: StudioDetailViewProps) {
  const router = useRouter()
  const [data, setData] = useState<StudioData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
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
    requireConfirmation: true,
    confirmationExpiryHours: 24,
    allowPartialPayment: true,
    minimumDepositPercentage: 50,
  })

  useEffect(() => {
    fetchStudioDetails()
  }, [studioId])

  const fetchStudioDetails = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/studios/${studioId}`)
      if (response.ok) {
        const result = (await response.json()) as any
        setData(result)
      } else if (response.status === 404) {
        toast.error("Studio not found")
        router.push("/dashboard/studios")
      } else {
        throw new Error("Failed to fetch studio")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to load studio details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenEdit = () => {
    if (!data) return
    const { studio } = data
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
      requireConfirmation: studio.settings?.requireConfirmation ?? true,
      confirmationExpiryHours: studio.settings?.confirmationExpiryHours || 24,
      allowPartialPayment: studio.settings?.allowPartialPayment ?? true,
      minimumDepositPercentage: studio.settings?.minimumDepositPercentage || 50,
    })
    setIsEditOpen(true)
  }

  const handleSaveStudio = async () => {
    try {
      setIsSaving(true)
      const response = await fetch(`/api/studios/${studioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success("Studio updated successfully")
        setIsEditOpen(false)
        fetchStudioDetails()
      } else {
        const error = (await response.json()) as any
        toast.error(error.error || "Failed to update studio")
      }
    } catch (error) {
      toast.error("Failed to update studio")
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-red-500",
      MANAGER: "bg-blue-500",
      RECEPTIONIST: "bg-green-500",
      PHOTOGRAPHER: "bg-purple-500",
      VIDEOGRAPHER: "bg-orange-500",
      PHOTO_EDITOR: "bg-pink-500",
      VIDEO_EDITOR: "bg-yellow-500",
      STAFF: "bg-gray-500",
    }
    return colors[role] || "bg-gray-500"
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING_CONFIRMATION: "bg-yellow-500",
      CONFIRMED: "bg-blue-500",
      COMPLETED: "bg-green-500",
      CANCELLED: "bg-red-500",
    }
    return colors[status] || "bg-gray-500"
  }

  const getTotalBookings = () => {
    if (!data) return 0
    return data.stats.bookingStats.reduce((sum, s) => sum + s.count, 0)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
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

  if (!data) {
    return null
  }

  const { studio, stats } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/studios")}>
            <IconArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{studio.name}</h1>
              <Badge variant={studio.isActive ? "default" : "secondary"}>
                {studio.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <IconMapPin className="h-4 w-4" />
              {studio.address}
            </p>
            <p className="text-sm text-muted-foreground">
              {studio.city}, {studio.state}, {studio.country}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenEdit}>
            <IconEdit className="h-4 w-4 mr-2" />
            Edit Studio
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/analytics?studioId=${studioId}`)}>
            <IconChartBar className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yearly Revenue</CardTitle>
            <IconCurrencyNaira className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.yearlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">{new Date().getFullYear()} to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <IconCalendarStats className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalBookings()}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studio.staff.length}</div>
            <p className="text-xs text-muted-foreground">Active staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions/Day</CardTitle>
            <IconClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studio.settings?.maxSessionsPerDay || 15}</div>
            <p className="text-xs text-muted-foreground">Max capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff ({studio.staff.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {studio.phone && (
                  <div className="flex items-center gap-3">
                    <IconPhone className="h-5 w-5 text-muted-foreground" />
                    <span>{studio.phone}</span>
                  </div>
                )}
                {studio.email && (
                  <div className="flex items-center gap-3">
                    <IconMail className="h-5 w-5 text-muted-foreground" />
                    <span>{studio.email}</span>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <IconMapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{studio.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {studio.city}, {studio.state}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Status Distribution</CardTitle>
                <CardDescription>This year's bookings by status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.bookingStats.length > 0 ? (
                  stats.bookingStats.map((stat) => {
                    const total = getTotalBookings()
                    const percentage = total > 0 ? Math.round((stat.count / total) * 100) : 0
                    return (
                      <div key={stat.status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">
                            {stat.status.replace(/_/g, " ").toLowerCase()}
                          </span>
                          <span className="font-medium">{stat.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getStatusColor(stat.status)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-4">No bookings yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>Team members assigned to this studio</CardDescription>
            </CardHeader>
            <CardContent>
              {studio.staff.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studio.staff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.image || undefined} />
                              <AvatarFallback>
                                {(member.name || member.email)?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {member.name || member.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.role.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{member.email}</p>
                            {member.phone && (
                              <p className="text-muted-foreground">{member.phone}</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <IconUserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No staff assigned to this studio</p>
                  <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/staffs")}>
                    Manage Staff
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Studio Settings</CardTitle>
              <CardDescription>Configuration for this studio location</CardDescription>
            </CardHeader>
            <CardContent>
              {studio.settings ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Session Capacity</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Max Sessions Per Day</span>
                        <span className="font-medium">{studio.settings.maxSessionsPerDay}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Session Duration</span>
                        <span className="font-medium">{studio.settings.defaultSessionDuration} mins</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Booking Confirmation</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Require Confirmation</span>
                        <Badge variant={studio.settings.requireConfirmation ? "default" : "secondary"}>
                          {studio.settings.requireConfirmation ? (
                            <><IconCheck className="h-3 w-3 mr-1" /> Yes</>
                          ) : (
                            <><IconX className="h-3 w-3 mr-1" /> No</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confirmation Expiry</span>
                        <span className="font-medium">{studio.settings.confirmationExpiryHours} hours</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Payment Rules</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Allow Partial Payment</span>
                        <Badge variant={studio.settings.allowPartialPayment ? "default" : "secondary"}>
                          {studio.settings.allowPartialPayment ? (
                            <><IconCheck className="h-3 w-3 mr-1" /> Yes</>
                          ) : (
                            <><IconX className="h-3 w-3 mr-1" /> No</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Minimum Deposit</span>
                        <span className="font-medium">{studio.settings.minimumDepositPercentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No custom settings configured
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Studio Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Studio</DialogTitle>
            <DialogDescription>
              Update studio information and settings
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

            <Separator className="my-2" />

            <h4 className="font-medium">Session Settings</h4>
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

            <Separator className="my-2" />

            <h4 className="font-medium">Confirmation Settings</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="requireConfirmation"
                  checked={formData.requireConfirmation}
                  onCheckedChange={(checked) => setFormData({ ...formData, requireConfirmation: checked })}
                />
                <Label htmlFor="requireConfirmation">Require Confirmation</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryHours">Confirmation Expiry (hours)</Label>
                <Input
                  id="expiryHours"
                  type="number"
                  min={1}
                  value={formData.confirmationExpiryHours}
                  onChange={(e) => setFormData({ ...formData, confirmationExpiryHours: parseInt(e.target.value) || 24 })}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <h4 className="font-medium">Payment Settings</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="allowPartialPayment"
                  checked={formData.allowPartialPayment}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowPartialPayment: checked })}
                />
                <Label htmlFor="allowPartialPayment">Allow Partial Payment</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minDeposit">Minimum Deposit (%)</Label>
                <Input
                  id="minDeposit"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.minimumDepositPercentage}
                  onChange={(e) => setFormData({ ...formData, minimumDepositPercentage: parseInt(e.target.value) || 50 })}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Studio is Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStudio} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
