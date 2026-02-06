"use client"

import * as React from "react"
import {
    IconChevronDown,
    IconChevronRight,
    IconEdit,
    IconFolderPlus,
    IconLayoutGrid,
    IconMinus,
    IconPlus,
    IconSearch,
    IconTrash,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface ServicePackage {
    id: string
    name: string
    slug: string
    price: number
    salePrice: number | null
    duration: string | null
    serviceType: "STUDIO" | "OUTDOOR" | "ON_LOCATION"
    features: string[]
    sessionDuration: number
    includesSessions: number
    allowExtraOutfits: boolean
    extraOutfitPrice: number | null
    allowExtraPics: boolean
    extraPicPrice: number | null
    isActive: boolean
}

interface ServiceCategory {
    id: string
    name: string
    slug: string
    description: string | null
    type: "INDOOR" | "OUTDOOR" | "ADDON"
    services: ServicePackage[]
}

export function ServicesTable() {
    const [categories, setCategories] = React.useState<ServiceCategory[]>([])
    const [allCategories, setAllCategories] = React.useState<{ id: string; name: string }[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Expanded categories state
    const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set())

    // Package Dialog states
    const [isPackageDialogOpen, setIsPackageDialogOpen] = React.useState(false)
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null)
    const [editingPackage, setEditingPackage] = React.useState<ServicePackage | null>(null)
    const [isCreating, setIsCreating] = React.useState(false)

    // Category Dialog states
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false)
    const [editingCategory, setEditingCategory] = React.useState<ServiceCategory | null>(null)
    const [categoryFormData, setCategoryFormData] = React.useState({
        name: "",
        description: "",
        type: "SERVICE" as "SERVICE" | "ADDON",
    })

    // Package Form state
    const [formData, setFormData] = React.useState({
        name: "",
        categoryId: "",
        price: "",
        salePrice: "",
        duration: "",
        serviceType: "STUDIO" as "STUDIO" | "OUTDOOR" | "ON_LOCATION",
        sessionDuration: "45",
        includesSessions: "1",
        isActive: true,
    })
    const [features, setFeatures] = React.useState<string[]>([])
    const [newFeature, setNewFeature] = React.useState("")

    React.useEffect(() => {
        fetchServices()
        fetchCategories()
    }, [])

    // Auto-expand all categories on first load
    React.useEffect(() => {
        if (categories.length > 0 && expandedCategories.size === 0) {
            setExpandedCategories(new Set(categories.map(c => c.id)))
        }
    }, [categories])

    const expandAll = () => {
        setExpandedCategories(new Set(categories.map(c => c.id)))
    }

    const collapseAll = () => {
        setExpandedCategories(new Set())
    }

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev)
            if (next.has(categoryId)) {
                next.delete(categoryId)
            } else {
                next.add(categoryId)
            }
            return next
        })
    }

    const handleToggleActive = async (pkg: ServicePackage) => {
        try {
            const res = await fetch(`/api/services/${pkg.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !pkg.isActive }),
            })
            if (!res.ok) throw new Error("Failed to update package")
            fetchServices()
        } catch (error) {
            toast.error("Failed to update package")
        }
    }

    const handleCreateCategory = async () => {
        try {
            const res = await fetch("/api/services/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(categoryFormData),
            })

            if (!res.ok) {
                const data = (await res.json()) as any
                throw new Error(data.error || "Failed to create category")
            }

            toast.success("Category created")
            setIsCategoryDialogOpen(false)
            setCategoryFormData({ name: "", description: "", type: "SERVICE" })
            setEditingCategory(null)
            fetchServices()
            fetchCategories()
        } catch (error: any) {
            toast.error(error.message || "Failed to create category")
        }
    }

    const openEditCategory = (category: ServiceCategory) => {
        setEditingCategory(category)
        setCategoryFormData({
            name: category.name,
            description: category.description || "",
            type: (category.type === "ADDON" ? "ADDON" : "SERVICE") as "SERVICE" | "ADDON",
        })
        setIsCategoryDialogOpen(true)
    }

    const handleUpdateCategory = async () => {
        if (!editingCategory) return

        try {
            const res = await fetch(`/api/services/categories/${editingCategory.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(categoryFormData),
            })

            if (!res.ok) {
                const data = (await res.json()) as any
                throw new Error(data.error || "Failed to update category")
            }

            toast.success("Category updated")
            setIsCategoryDialogOpen(false)
            setCategoryFormData({ name: "", description: "", type: "SERVICE" })
            setEditingCategory(null)
            fetchServices()
            fetchCategories()
        } catch (error: any) {
            toast.error(error.message || "Failed to update category")
        }
    }

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm("Are you sure you want to delete this category? It must have no services.")) return

        try {
            const res = await fetch(`/api/services/categories/${categoryId}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                const data = (await res.json()) as any
                throw new Error(data.error || "Failed to delete category")
            }

            toast.success("Category deleted")
            fetchServices()
            fetchCategories()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete category")
        }
    }

    const fetchServices = async () => {
        try {
            setIsLoading(true)
            const res = await fetch("/api/services?includeInactive=true")
            if (!res.ok) throw new Error("Failed to fetch services")
            const data = (await res.json()) as any

            if (data.categories && Array.isArray(data.categories)) {
                setCategories(data.categories)
            } else {
                setCategories([])
            }
        } catch (error) {
            toast.error("Failed to load services")
            setCategories([])
        } finally {
            setIsLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/services/categories")
            if (!res.ok) throw new Error("Failed to fetch categories")
            const data = (await res.json()) as any
            setAllCategories(data.categories || [])
        } catch (error) {
            console.error("Failed to load categories")
        }
    }

    const openAddPackage = (categoryId: string) => {
        setSelectedCategoryId(categoryId)
        setEditingPackage(null)
        setFormData({
            name: "",
            categoryId: categoryId,
            price: "",
            salePrice: "",
            duration: "",
            serviceType: "STUDIO",
            sessionDuration: "45",
            includesSessions: "1",
            isActive: true,
        })
        setFeatures([])
        setNewFeature("")
        setIsCreating(true)
        setIsPackageDialogOpen(true)
    }

    const openEditPackage = (categoryId: string, pkg: ServicePackage) => {
        setSelectedCategoryId(categoryId)
        setEditingPackage(pkg)
        setFormData({
            name: pkg.name,
            categoryId: categoryId,
            price: String(pkg.price),
            salePrice: pkg.salePrice ? String(pkg.salePrice) : "",
            duration: pkg.duration || "",
            serviceType: pkg.serviceType,
            sessionDuration: String(pkg.sessionDuration),
            includesSessions: String(pkg.includesSessions),
            isActive: pkg.isActive,
        })
        setFeatures(pkg.features || [])
        setNewFeature("")
        setIsCreating(false)
        setIsPackageDialogOpen(true)
    }

    const handleSavePackage = async () => {
        try {
            const url = isCreating ? "/api/services" : `/api/services/${editingPackage?.id}`
            const method = isCreating ? "POST" : "PATCH"

            const body = {
                name: formData.name,
                categoryId: formData.categoryId,
                price: parseFloat(formData.price),
                salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
                duration: formData.duration || null,
                serviceType: formData.serviceType,
                sessionDuration: parseInt(formData.sessionDuration),
                includesSessions: parseInt(formData.includesSessions),
                isActive: formData.isActive,
                features: features,
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            if (!res.ok) throw new Error("Failed to save package")

            toast.success(isCreating ? "Package created" : "Package updated")
            setIsPackageDialogOpen(false)
            fetchServices()
        } catch (error) {
            toast.error("Failed to save package")
        }
    }

    const handleDeletePackage = async (packageId: string) => {
        if (!confirm("Are you sure you want to delete this package?")) return

        try {
            const res = await fetch(`/api/services/${packageId}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete package")
            toast.success("Package deleted")
            fetchServices()
        } catch (error) {
            toast.error("Failed to delete package")
        }
    }

    // Calculate max clients based on session duration (8 hour day)
    const calculateMaxClients = (sessionDuration: number) => {
        const workingMinutes = 8 * 60
        return Math.floor(workingMinutes / sessionDuration)
    }

    // Filter categories based on search
    const filteredCategories = categories.map(cat => ({
        ...cat,
        services: cat.services.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.services.length > 0 || searchQuery === "")

    return (
        <div className="h-full w-full">
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto min-h-full">

                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Services & Pricing</h1>
                            <p className="text-muted-foreground">Manage your service categories and pricing packages.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
                                <IconFolderPlus className="mr-2 h-4 w-4" />
                                Add Category
                            </Button>
                            <Button onClick={() => openAddPackage(allCategories[0]?.id || "")}>
                                <IconPlus className="mr-2 h-4 w-4" />
                                Add Service
                            </Button>
                        </div>
                    </div>

                    {/* Search and Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="relative w-full max-w-md">
                            <IconSearch className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search services or packages..."
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

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{categories.length} categories</span>
                        <span>•</span>
                        <span>{categories.reduce((sum, c) => sum + c.services.length, 0)} packages</span>
                    </div>

                    {/* Services List */}
                    {isLoading ? (
                        <div className="text-center py-10">Loading services...</div>
                    ) : (
                        <div className="flex flex-col gap-4 pb-10">
                            {filteredCategories.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                                    No services found. Create one to get started!
                                </div>
                            ) : (
                                filteredCategories.map((category) => (
                                    <ServiceCategoryCard
                                        key={category.id}
                                        category={category}
                                        isExpanded={expandedCategories.has(category.id)}
                                        onToggleExpand={() => toggleCategory(category.id)}
                                        onAddPackage={() => openAddPackage(category.id)}
                                        onEditPackage={(pkg) => openEditPackage(category.id, pkg)}
                                        onDeletePackage={handleDeletePackage}
                                        onToggleActive={handleToggleActive}
                                        onEditCategory={() => openEditCategory(category)}
                                        onDeleteCategory={() => handleDeleteCategory(category.id)}
                                    />
                                ))
                            )}
                        </div>
                    )}

                </div>
            </ScrollArea>

            {/* Package Dialog */}
            <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isCreating ? "Add Package" : "Edit Package"}</DialogTitle>
                        <DialogDescription>
                            Configure package details, pricing, and session settings.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Package Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Simply You Basic"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={formData.categoryId}
                                    onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allCategories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (₦)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="50000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="salePrice">Sale Price (₦)</Label>
                                <Input
                                    id="salePrice"
                                    type="number"
                                    value={formData.salePrice}
                                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="serviceType">Service Type</Label>
                                <Select
                                    value={formData.serviceType}
                                    onValueChange={(v: any) => setFormData({ ...formData, serviceType: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STUDIO">Studio</SelectItem>
                                        <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                                        <SelectItem value="ON_LOCATION">On Location</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Session Configuration */}
                        <div className="p-4 rounded-lg border bg-muted/30">
                            <h4 className="font-medium mb-3">Session Configuration</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sessionDuration">Session Duration (min)</Label>
                                    <Input
                                        id="sessionDuration"
                                        type="number"
                                        value={formData.sessionDuration}
                                        onChange={(e) => setFormData({ ...formData, sessionDuration: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Max {calculateMaxClients(parseInt(formData.sessionDuration) || 45)} clients/day
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="includesSessions">Sessions Included</Label>
                                    <Input
                                        id="includesSessions"
                                        type="number"
                                        value={formData.includesSessions}
                                        onChange={(e) => setFormData({ ...formData, includesSessions: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Duration (for Academy/Courses) */}
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration (e.g., "4 weeks", "2-3 weeks")</Label>
                            <Input
                                id="duration"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                placeholder="e.g., 4 weeks, 2-3 weeks, 1 month"
                            />
                            <p className="text-xs text-muted-foreground">
                                For courses or programs. Leave empty for single sessions.
                            </p>
                        </div>

                        {/* Dynamic Features */}
                        <div className="space-y-2">
                            <Label>Features</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newFeature}
                                    onChange={(e) => setNewFeature(e.target.value)}
                                    placeholder="Add a feature..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newFeature.trim()) {
                                            e.preventDefault()
                                            setFeatures([...features, newFeature.trim()])
                                            setNewFeature("")
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (newFeature.trim()) {
                                            setFeatures([...features, newFeature.trim()])
                                            setNewFeature("")
                                        }
                                    }}
                                >
                                    Add
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {features.map((feat, idx) => (
                                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                                        {feat}
                                        <button
                                            type="button"
                                            onClick={() => setFeatures(features.filter((_, i) => i !== idx))}
                                            className="ml-1 hover:text-destructive"
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                                {features.length === 0 && (
                                    <p className="text-xs text-muted-foreground">No features added yet</p>
                                )}
                            </div>
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Active</Label>
                                <p className="text-xs text-muted-foreground">Show in booking options</p>
                            </div>
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPackageDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSavePackage}>
                            {isCreating ? "Create Package" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Category Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? "Update category details."
                                : "Add a new service category to organize your packages."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="categoryName">Category Name</Label>
                            <Input
                                id="categoryName"
                                value={categoryFormData.name}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                                placeholder="e.g., Photography Sessions"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="categoryDescription">Description (Optional)</Label>
                            <Textarea
                                id="categoryDescription"
                                value={categoryFormData.description}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                                placeholder="Brief description of this category..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="categoryType">Category Type</Label>
                            <Select
                                value={categoryFormData.type}
                                onValueChange={(v: "SERVICE" | "ADDON") => setCategoryFormData({ ...categoryFormData, type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SERVICE">Service Category</SelectItem>
                                    <SelectItem value="ADDON">Add-on Category</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Add-on categories can be selected as extras during booking.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsCategoryDialogOpen(false)
                            setEditingCategory(null)
                            setCategoryFormData({ name: "", description: "", type: "SERVICE" })
                        }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                            disabled={!categoryFormData.name.trim()}
                        >
                            {editingCategory ? "Save Changes" : "Create Category"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Service Category Card Component
function ServiceCategoryCard({
    category,
    isExpanded,
    onToggleExpand,
    onAddPackage,
    onEditPackage,
    onDeletePackage,
    onToggleActive,
    onEditCategory,
    onDeleteCategory,
}: {
    category: ServiceCategory
    isExpanded: boolean
    onToggleExpand: () => void
    onAddPackage: () => void
    onEditPackage: (pkg: ServicePackage) => void
    onDeletePackage: (id: string) => void
    onToggleActive: (pkg: ServicePackage) => void
    onEditCategory: () => void
    onDeleteCategory: () => void
}) {
    return (
        <Collapsible
            open={isExpanded}
            onOpenChange={onToggleExpand}
            className="w-full border rounded-lg bg-card text-card-foreground shadow-sm"
        >
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 size-8 hover:bg-muted">
                            {isExpanded ? <IconChevronDown className="size-4" /> : <IconChevronRight className="size-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{category.name}</h3>
                            {category.type === "ADDON" && (
                                <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                                    Add-on
                                </Badge>
                            )}
                        </div>
                        {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{category.services.length} packages</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditCategory}>
                        <IconEdit className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={onDeleteCategory}
                    >
                        <IconTrash className="size-4" />
                    </Button>
                </div>
            </div>

            <CollapsibleContent>
                <div className="px-4 pb-4 pt-0">
                    <Separator className="mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.services.map((pkg) => (
                            <Card
                                key={pkg.id}
                                className={`relative group overflow-hidden border-dashed hover:border-solid transition-all ${!pkg.isActive ? 'opacity-50' : ''}`}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base font-medium pr-16">{pkg.name}</CardTitle>
                                        <div className="flex items-center gap-1 absolute right-2 top-2">
                                            <Switch
                                                checked={pkg.isActive}
                                                onCheckedChange={() => onToggleActive(pkg)}
                                                className="scale-75"
                                            />
                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => onEditPackage(pkg)}
                                                >
                                                    <IconEdit className="size-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive"
                                                    onClick={() => onDeletePackage(pkg.id)}
                                                >
                                                    <IconTrash className="size-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <CardDescription className="line-clamp-2 min-h-[40px]">
                                        {pkg.duration || `${pkg.sessionDuration}min session • ${pkg.includesSessions} session(s)`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl font-bold text-primary mb-3">
                                        ₦{Number(pkg.price).toLocaleString()}
                                        {pkg.salePrice && (
                                            <span className="text-sm text-muted-foreground line-through ml-2">
                                                ₦{Number(pkg.salePrice).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {pkg.features.slice(0, 3).map((feat, i) => (
                                            <Badge key={i} variant="secondary" className="text-[10px] px-1.5">
                                                {feat}
                                            </Badge>
                                        ))}
                                        {pkg.features.length > 3 && (
                                            <Badge variant="outline" className="text-[10px] px-1.5">
                                                +{pkg.features.length - 3} more
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Add Package Button Card */}
                        <button
                            onClick={onAddPackage}
                            className="flex flex-col items-center justify-center gap-2 h-full min-h-[180px] rounded-lg border border-dashed hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                                <IconPlus className="size-6" />
                            </div>
                            <span className="text-sm font-medium">Add Package</span>
                        </button>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
