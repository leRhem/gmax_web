// app/(dashboard)/dashboard/equipment/equipment-dashboard.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  IconCamera,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconTool,
  IconAlertTriangle,
  IconBuilding,
  IconFilter,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

const EQUIPMENT_TYPES = [
  { value: "CAMERA", label: "Camera" },
  { value: "LENS", label: "Lens" },
  { value: "LIGHTING", label: "Lighting" },
  { value: "BACKDROP", label: "Backdrop" },
  { value: "TRIPOD", label: "Tripod" },
  { value: "AUDIO", label: "Audio" },
  { value: "COMPUTER", label: "Computer" },
  { value: "STORAGE", label: "Storage" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "OTHER", label: "Other" },
]

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available", color: "bg-green-500" },
  { value: "IN_USE", label: "In Use", color: "bg-blue-500" },
  { value: "MAINTENANCE", label: "Maintenance", color: "bg-yellow-500" },
  { value: "DAMAGED", label: "Damaged", color: "bg-red-500" },
  { value: "RETIRED", label: "Retired", color: "bg-gray-500" },
]

const CONDITION_OPTIONS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
]

interface Studio {
  id: string
  name: string
  city: string
}

interface Equipment {
  id: string
  name: string
  type: string
  brand: string | null
  model: string | null
  serialNo: string | null
  studio: Studio
  status: string
  condition: string
  purchaseDate: string | null
  purchasePrice: number | null
  warrantyExpiry: string | null
  notes: string | null
}

interface EquipmentData {
  equipment: Equipment[]
  stats: {
    total: number
    available: number
    inUse: number
    maintenance: number
    damaged: number
  }
  studios: Studio[]
  canManage: boolean
}

interface EquipmentDashboardProps {
  userRole: string
  userStudioId?: string
}

const initialFormData = {
  name: "",
  type: "CAMERA",
  brand: "",
  model: "",
  serialNo: "",
  studioId: "",
  status: "AVAILABLE",
  condition: "GOOD",
  purchasePrice: "",
  notes: "",
}

export function EquipmentDashboard({ userRole, userStudioId }: EquipmentDashboardProps) {
  const [data, setData] = useState<EquipmentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [studioFilter, setStudioFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [formData, setFormData] = useState(initialFormData)
  const [isSaving, setIsSaving] = useState(false)

  const fetchEquipment = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (studioFilter !== "all") params.set("studioId", studioFilter)
      if (typeFilter !== "all") params.set("type", typeFilter)

      const response = await fetch(`/api/equipment?${params.toString()}`)
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any
        toast.error(errorData.error || "Failed to fetch equipment")
        return
      }
      const result = (await response.json()) as any
      setData(result)
      if (userStudioId) {
        setFormData(prev => prev.studioId ? prev : { ...prev, studioId: userStudioId })
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to fetch equipment")
    } finally {
      setIsLoading(false)
    }
  }, [studioFilter, typeFilter, userStudioId])

  useEffect(() => {
    fetchEquipment()
  }, [fetchEquipment])

  const handleAdd = () => {
    setFormData({
      ...initialFormData,
      studioId: userStudioId || (data?.studios[0]?.id || ""),
    })
    setIsAddOpen(true)
  }

  const handleEdit = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setFormData({
      name: equipment.name,
      type: equipment.type,
      brand: equipment.brand || "",
      model: equipment.model || "",
      serialNo: equipment.serialNo || "",
      studioId: equipment.studio.id,
      status: equipment.status,
      condition: equipment.condition,
      purchasePrice: equipment.purchasePrice?.toString() || "",
      notes: equipment.notes || "",
    })
    setIsEditOpen(true)
  }

  const handleDelete = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setIsDeleteOpen(true)
  }

  const handleSave = async (isEdit: boolean) => {
    // Validate studioId
    const effectiveStudioId = formData.studioId || userStudioId
    if (!effectiveStudioId) {
      toast.error("Studio is required")
      return
    }

    // Validate selectedEquipment for edit mode
    if (isEdit && !selectedEquipment?.id) {
      toast.error("No equipment selected for editing")
      return
    }

    try {
      setIsSaving(true)
      const url = isEdit ? `/api/equipment/${selectedEquipment!.id}` : "/api/equipment"
      const method = isEdit ? "PUT" : "POST"

      // Validate purchasePrice
      let purchasePrice: number | null = null
      if (formData.purchasePrice && formData.purchasePrice.trim() !== "") {
        const parsed = parseFloat(formData.purchasePrice)
        if (Number.isFinite(parsed) && parsed >= 0) {
          purchasePrice = parsed
        }
      }

      const body = {
        ...formData,
        studioId: effectiveStudioId,
        purchasePrice,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(isEdit ? "Equipment updated" : "Equipment added")
        setIsAddOpen(false)
        setIsEditOpen(false)
        fetchEquipment()
      } else {
        const error = (await response.json()) as any
        toast.error(error.error || "Failed to save")
      }
    } catch (error) {
      toast.error("Failed to save equipment")
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedEquipment) return
    try {
      setIsSaving(true)
      const response = await fetch(`/api/equipment/${selectedEquipment.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Equipment deleted")
        setIsDeleteOpen(false)
        fetchEquipment()
      } else {
        const error = (await response.json()) as any
        toast.error(error.error || "Failed to delete")
      }
    } catch (error) {
      toast.error("Failed to delete equipment")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((s) => s.value === status)
    return <Badge className={option?.color || "bg-gray-500"}>{option?.label || status}</Badge>
  }

  const getTypeIcon = (type: string) => {
    if (type === "CAMERA") return <IconCamera className="h-4 w-4" />
    return <IconTool className="h-4 w-4" />
  }

  const getConditionLabel = (condition: string) => {
    return CONDITION_OPTIONS.find(c => c.value === condition)?.label || condition
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const canManage = data?.canManage || false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <IconCamera className="h-8 w-8" />
            Equipment
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole === "ADMIN" ? "Manage equipment across all studios" : "View studio equipment"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button onClick={handleAdd}>
              <IconPlus className="h-4 w-4 mr-1" />
              Add Equipment
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={fetchEquipment} disabled={isLoading} aria-label="Refresh equipment list">
            <IconRefresh className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <IconCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data?.stats.available || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data?.stats.inUse || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <IconTool className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data?.stats.maintenance || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Damaged</CardTitle>
            <IconAlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data?.stats.damaged || 0}</div>
          </CardContent>
        </Card>
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
            {userRole === "ADMIN" && data?.studios && (
              <div className="w-48">
                <Select value={studioFilter} onValueChange={setStudioFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Studio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Studios</SelectItem>
                    {data.studios.map((studio) => (
                      <SelectItem key={studio.id} value={studio.id}>
                        {studio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EQUIPMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment List</CardTitle>
          <CardDescription>
            {data?.equipment.length || 0} item{(data?.equipment.length || 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.equipment && data.equipment.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Brand/Model</TableHead>
                  {userRole === "ADMIN" && <TableHead>Studio</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {EQUIPMENT_TYPES.find((t) => t.value === item.type)?.label || item.type}
                    </TableCell>
                    <TableCell>
                      {item.brand || item.model ? (
                        <span>
                          {item.brand} {item.model}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {userRole === "ADMIN" && (
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <IconBuilding className="h-3 w-3" />
                          {item.studio.name}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getConditionLabel(item.condition)}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <IconEdit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <IconCamera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No equipment found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false)
          setIsEditOpen(false)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Update equipment details" : "Add new equipment to the inventory"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Canon EOS R5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. Canon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g. EOS R5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNo">Serial Number</Label>
                <Input
                  id="serialNo"
                  value={formData.serialNo}
                  onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                />
              </div>
              {userRole === "ADMIN" && data?.studios && (
                <div className="space-y-2">
                  <Label htmlFor="studio">Studio *</Label>
                  <Select value={formData.studioId} onValueChange={(v) => setFormData({ ...formData, studioId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select studio" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.studios.map((studio) => (
                        <SelectItem key={studio.id} value={studio.id}>
                          {studio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {cond.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false) }}>
              Cancel
            </Button>
            <Button onClick={() => handleSave(isEditOpen)} disabled={isSaving || !formData.name}>
              {isSaving ? "Saving..." : isEditOpen ? "Update" : "Add Equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedEquipment?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isSaving}>
              {isSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
