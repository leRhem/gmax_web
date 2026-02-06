"use client"

import { useState } from "react"
import Image from "next/image"
import { format } from "date-fns"
import {
    IconCheck,
    IconCloudUpload,
    IconDownload,
    IconEye,
    IconPhoto,
    IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Photo {
    id: string
    fileName: string
    thumbnailKey: string | null
    r2Key: string
    status: "UPLOADED" | "PROCESSING" | "READY" | "DELIVERED" | "EXPIRED"
    processingStatus: "EDITING" | "EDITED" | "APPROVED"
    clientDownloaded: boolean
    downloadCount: number
    uploadedAt: string
}

interface AssetPreviewSheetProps {
    bookingId: string
    clientName: string
    photos: Photo[]
    assetsStatus: "NOT_UPLOADED" | "UPLOADING" | "UPLOADED" | "PROCESSING" | "READY_FOR_DOWNLOAD" | "DOWNLOADED"
    onUploadClick?: () => void
    trigger?: React.ReactNode
}

const statusConfig = {
    UPLOADED: { label: "Uploaded", color: "bg-blue-100 text-blue-700" },
    PROCESSING: { label: "Processing", color: "bg-yellow-100 text-yellow-700" },
    READY: { label: "Ready", color: "bg-green-100 text-green-700" },
    DELIVERED: { label: "Delivered", color: "bg-purple-100 text-purple-700" },
    EXPIRED: { label: "Expired", color: "bg-gray-100 text-gray-700" },
}

export function AssetPreviewSheet({
    bookingId,
    clientName,
    photos,
    assetsStatus,
    onUploadClick,
    trigger,
}: AssetPreviewSheetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

    const downloadedCount = photos.filter((p) => p.clientDownloaded).length
    const readyCount = photos.filter((p) => p.status === "READY" || p.status === "DELIVERED").length

    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo)
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm">
                        <IconEye className="h-4 w-4 mr-1" />
                        Preview
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <IconPhoto className="h-5 w-5" />
                        Assets for {clientName}
                    </SheetTitle>
                    <SheetDescription>
                        {photos.length > 0 ? (
                            <span>
                                {photos.length} photo(s) • {readyCount} ready • {downloadedCount} downloaded
                            </span>
                        ) : (
                            "No assets uploaded yet"
                        )}
                    </SheetDescription>
                </SheetHeader>

                {/* No assets state */}
                {photos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <IconCloudUpload className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Upload photos for this booking to make them available for the client.
                        </p>
                        {onUploadClick && (
                            <Button onClick={onUploadClick}>
                                <IconCloudUpload className="h-4 w-4 mr-2" />
                                Upload Assets
                            </Button>
                        )}
                    </div>
                )}

                {/* Photo grid */}
                {photos.length > 0 && (
                    <ScrollArea className="h-[calc(100vh-200px)] mt-4">
                        <div className="grid grid-cols-3 gap-2">
                            {photos.map((photo) => {
                                const status = statusConfig[photo.status]
                                return (
                                    <div
                                        key={photo.id}
                                        className={cn(
                                            "group relative aspect-square rounded-lg border overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                                            selectedPhoto?.id === photo.id && "ring-2 ring-primary"
                                        )}
                                        onClick={() => handlePhotoClick(photo)}
                                    >
                                        {/* Thumbnail or placeholder */}
                                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                                            {photo.thumbnailKey ? (
                                                <Image
                                                    src={`/api/assets/${photo.thumbnailKey}`}
                                                    alt={photo.fileName}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <IconPhoto className="h-8 w-8 text-muted-foreground/30" />
                                            )}
                                        </div>

                                        {/* Status badge */}
                                        <div className="absolute top-1 left-1">
                                            <Badge variant="outline" className={cn("text-[10px] px-1 py-0", status.color)}>
                                                {status.label}
                                            </Badge>
                                        </div>

                                        {/* Download indicator */}
                                        {photo.clientDownloaded && (
                                            <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                                                <IconCheck className="h-2.5 w-2.5 text-white" />
                                            </div>
                                        )}

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white">
                                                <IconEye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Selected photo details */}
                        {selectedPhoto && (
                            <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-medium text-sm">{selectedPhoto.fileName}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Uploaded {format(new Date(selectedPhoto.uploadedAt), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className={statusConfig[selectedPhoto.status].color}>
                                        {statusConfig[selectedPhoto.status].label}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <IconDownload className="h-3 w-3" />
                                        {selectedPhoto.downloadCount} downloads
                                    </span>
                                    {selectedPhoto.clientDownloaded && (
                                        <span className="flex items-center gap-1 text-green-600">
                                            <IconCheck className="h-3 w-3" />
                                            Client downloaded
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>
    )
}
