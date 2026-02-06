"use client"

import { useRouter } from "next/navigation"
import {
    IconCalendarEvent,
    IconDotsVertical,
    IconEdit,
    IconExternalLink,
    IconMail,
    IconMapPin,
    IconPhone,
    IconTrash,
    IconUser,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Client, ClientType } from "@/types/client"

interface ClientCardProps {
    client: Client & {
        _count?: {
            bookings: number
        }
    }
    onEdit?: (client: Client) => void
    onDelete?: (clientId: string) => void
}

const typeConfig: Record<ClientType, { label: string; color: string; icon?: string }> = {
    STANDARD: { label: "Standard", color: "bg-gray-100 text-gray-700 border-gray-200" },
    VIP: { label: "VIP", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "⭐" },
    VVIP: { label: "VVIP", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "👑" },
    CORPORATE: { label: "Corporate", color: "bg-green-100 text-green-700 border-green-200", icon: "🏢" },
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
    const router = useRouter()
    const config = typeConfig[client.type] || typeConfig.STANDARD

    const handleCardClick = () => {
        router.push(`/dashboard/clients/${client.id}`)
    }

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onEdit?.(client)
    }

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirm("Are you sure you want to delete this client?")) {
            onDelete?.(client.id)
        }
    }

    // Get initials for avatar
    const initials = client.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    return (
        <Card
            className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30 cursor-pointer"
            onClick={handleCardClick}
        >
            {/* Type color bar */}
            <div className={cn("h-1 w-full", config.color.split(" ")[0])} />

            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12 shrink-0 border-2 border-background shadow-sm">
                        <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    {/* Name and type */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold truncate">{client.name}</h3>
                            {config.icon && <span className="text-sm">{config.icon}</span>}
                        </div>
                        <Badge variant="outline" className={cn("text-xs mt-1", config.color)}>
                            {config.label}
                        </Badge>
                    </div>

                    {/* Actions dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <IconDotsVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleEditClick}>
                                <IconEdit className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={handleDeleteClick}
                                className="text-red-600"
                            >
                                <IconTrash className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="space-y-2 pb-3">
                {/* Phone */}
                <div className="flex items-center gap-2 text-sm">
                    <IconPhone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{client.phone}</span>
                </div>

                {/* Email */}
                {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IconMail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{client.email}</span>
                    </div>
                )}

                {/* Address */}
                {client.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IconMapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{client.address}</span>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-3 border-t flex items-center justify-between">
                {/* Booking count */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconCalendarEvent className="h-4 w-4" />
                    <span>{client._count?.bookings || 0} booking(s)</span>
                </div>

                {/* View link */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick()
                    }}
                >
                    <IconExternalLink className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    )
}
