// components/staff/staff-card.tsx
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    IconDotsVertical,
    IconPencil,
    IconLock,
    IconTrash,
    IconMail,
    IconPhone,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface StaffCardProps {
    staff: {
        id: string
        name: string | null
        email: string
        phone?: string | null
        role: string
        image?: string | null
        isActive: boolean
        studioId?: string | null
        acceptedAt?: string | null
    }
    onEdit?: (id: string) => void
    onPermissions?: (id: string) => void
    onRemove?: (id: string) => void
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

export function StaffCard({ staff, onEdit, onPermissions, onRemove }: StaffCardProps) {
    const [isHovered, setIsHovered] = useState(false)

    const initials = staff.name
        ? staff.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : staff.email[0].toUpperCase()

    const roleName = staff.role.replace(/_/g, " ")

    return (
        <Card
            className={cn(
                "relative transition-all duration-200",
                isHovered && "ring-2 ring-primary/50",
                !staff.isActive && "opacity-60"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={staff.image || undefined} alt={staff.name || staff.email} />
                        <AvatarFallback className="bg-primary/10">{initials}</AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">
                                {staff.name || "Unnamed"}
                            </h3>
                            {!staff.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                    Inactive
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{staff.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge
                                variant="outline"
                                className={cn("text-xs", roleColors[staff.role] || roleColors.STAFF)}
                            >
                                {roleName}
                            </Badge>
                        </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <IconDotsVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit?.(staff.id)}>
                                <IconPencil className="mr-2 h-4 w-4" />
                                Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPermissions?.(staff.id)}>
                                <IconLock className="mr-2 h-4 w-4" />
                                Manage Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onRemove?.(staff.id)}
                            >
                                <IconTrash className="mr-2 h-4 w-4" />
                                Remove Staff
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Contact Info (shown on hover) */}
                {isHovered && (staff.phone || staff.email) && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
                        {staff.email && (
                            <div className="flex items-center gap-1">
                                <IconMail className="h-3 w-3" />
                                <span className="truncate">{staff.email}</span>
                            </div>
                        )}
                        {staff.phone && (
                            <div className="flex items-center gap-1">
                                <IconPhone className="h-3 w-3" />
                                <span>{staff.phone}</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
