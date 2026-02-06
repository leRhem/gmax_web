"use client"

import { format } from "date-fns"
import { useRouter } from "next/navigation"
import {
    IconCalendarEvent,
    IconCamera,
    IconCheck,
    IconClock,
    IconCloudUpload,
    IconDownload,
    IconExternalLink,
    IconEye,
    IconPhoto,
    IconUser,
    IconX,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface BookingCardProps {
    booking: {
        id: string
        client: {
            id: string
            name: string
            phone: string
            email: string | null
        }
        bookingDate: string
        bookingStatus: "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
        paymentStatus: "PENDING" | "PARTIAL" | "COMPLETED" | "FAILED" | "REFUNDED"
        assetsStatus: "NOT_UPLOADED" | "UPLOADING" | "UPLOADED" | "PROCESSING" | "READY_FOR_DOWNLOAD" | "DOWNLOADED"
        assetsDownloaded: boolean
        photographer?: {
            id: string
            name: string | null
            image: string | null
        } | null
        items: Array<{
            id: string
            service: {
                name: string
                price: number
            }
            priceSnapshot: number
            quantity: number
        }>
        totalSessions: number
        _count?: {
            payments: number
            photos: number
        }
    }
    onViewDetails?: () => void
    onUploadAssets?: () => void
    onPreviewAssets?: () => void
    showQuickPreview?: boolean
}

const statusConfig = {
    PENDING_CONFIRMATION: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: IconClock },
    CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-800 border-blue-200", icon: IconCheck },
    COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200", icon: IconCheck },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200", icon: IconX },
}

const paymentConfig = {
    PENDING: { label: "Unpaid", color: "bg-orange-100 text-orange-800 border-orange-200" },
    PARTIAL: { label: "Partial", color: "bg-blue-100 text-blue-800 border-blue-200" },
    COMPLETED: { label: "Paid", color: "bg-green-100 text-green-800 border-green-200" },
    FAILED: { label: "Failed", color: "bg-red-100 text-red-800 border-red-200" },
    REFUNDED: { label: "Refunded", color: "bg-gray-100 text-gray-800 border-gray-200" },
}

const assetConfig = {
    NOT_UPLOADED: { label: "No Assets", color: "text-muted-foreground", icon: IconCloudUpload },
    UPLOADING: { label: "Uploading", color: "text-yellow-600", icon: IconCloudUpload },
    UPLOADED: { label: "Uploaded", color: "text-blue-600", icon: IconPhoto },
    PROCESSING: { label: "Processing", color: "text-purple-600", icon: IconPhoto },
    READY_FOR_DOWNLOAD: { label: "Ready", color: "text-green-600", icon: IconDownload },
    DOWNLOADED: { label: "Downloaded", color: "text-green-700", icon: IconCheck },
}

export function BookingCard({
    booking,
    onViewDetails,
    onUploadAssets,
    onPreviewAssets,
    showQuickPreview = true,
}: BookingCardProps) {
    const router = useRouter()

    const totalAmount = booking.items.reduce(
        (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
        0
    )

    const bookingStatus = statusConfig[booking.bookingStatus] || statusConfig.CONFIRMED
    const paymentStatus = paymentConfig[booking.paymentStatus] || paymentConfig.PENDING
    const assetStatus = assetConfig[booking.assetsStatus] || assetConfig.NOT_UPLOADED

    const StatusIcon = bookingStatus.icon
    const AssetIcon = assetStatus.icon

    const handleCardClick = () => {
        if (onViewDetails) {
            onViewDetails()
        } else {
            router.push(`/dashboard/bookings/${booking.id}`)
        }
    }

    return (
        <Card
            className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30 cursor-pointer"
            onClick={handleCardClick}
        >
            {/* Status bar at top */}
            <div className={cn("h-1 w-full", bookingStatus.color.split(" ")[0])} />

            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold truncate">
                            {booking.client.name}
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                            {booking.client.phone}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("text-xs shrink-0", bookingStatus.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {bookingStatus.label}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pb-3 space-y-3">
                {/* Services */}
                <div className="space-y-1">
                    {booking.items.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground truncate flex-1 mr-2">
                                {item.service.name}
                            </span>
                            <span className="font-medium text-xs shrink-0">
                                ₦{Number(item.priceSnapshot).toLocaleString()}
                            </span>
                        </div>
                    ))}
                    {booking.items.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                            +{booking.items.length - 2} more service(s)
                        </span>
                    )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs">
                    {/* Sessions */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <IconCamera className="h-3.5 w-3.5" />
                                    <span>{booking.totalSessions} session(s)</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Total sessions booked</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Photos count */}
                    {booking._count?.photos !== undefined && booking._count.photos > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <IconPhoto className="h-3.5 w-3.5" />
                                        <span>{booking._count.photos}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{booking._count.photos} photo(s) uploaded</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {/* Photographer */}
                    {booking.photographer && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                        <Avatar className="h-4 w-4">
                                            <AvatarImage src={booking.photographer.image || undefined} />
                                            <AvatarFallback className="text-[8px]">
                                                {booking.photographer.name?.slice(0, 2).toUpperCase() || "??"}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{booking.photographer.name || "Assigned photographer"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                {/* Asset & Payment Status */}
                <div className="flex items-center justify-between pt-2 border-t">
                    {/* Asset Status */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn("flex items-center gap-1 text-xs", assetStatus.color)}>
                                    <AssetIcon className="h-3.5 w-3.5" />
                                    <span>{assetStatus.label}</span>
                                    {booking.assetsDownloaded && (
                                        <IconCheck className="h-3 w-3 text-green-600" />
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {booking.assetsDownloaded
                                        ? "Client has downloaded assets"
                                        : assetStatus.label}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Payment Status */}
                    <Badge variant="outline" className={cn("text-xs", paymentStatus.color)}>
                        {paymentStatus.label}
                    </Badge>
                </div>
            </CardContent>

            <CardFooter className="pt-0 flex items-center justify-between">
                {/* Total */}
                <div className="text-sm font-bold">
                    ₦{totalAmount.toLocaleString()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Asset Preview */}
                    {booking._count?.photos !== undefined && booking._count.photos > 0 && onPreviewAssets && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                                e.stopPropagation()
                                onPreviewAssets()
                            }}
                        >
                            <IconEye className="h-4 w-4" />
                        </Button>
                    )}
                    {/* Upload Assets */}
                    {booking.assetsStatus === "NOT_UPLOADED" && onUploadAssets && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                                e.stopPropagation()
                                onUploadAssets()
                            }}
                        >
                            <IconCloudUpload className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleCardClick()
                        }}
                    >
                        <IconExternalLink className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}
