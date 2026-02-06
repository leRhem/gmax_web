// components/bookings/booking-photos.tsx
"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  IconPhoto,
  IconCheck,
  IconX,
  IconRefresh,
  IconDownload,
  IconEye,
  IconCheckbox,
  IconSquare,
  IconUser,
  IconClock,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UploadedBy {
  id: string
  name: string | null
  email: string
}

interface Photo {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  status: string
  processingStatus: string
  thumbnailKey: string | null
  uploadedAt: string
  uploadedBy: UploadedBy
  batchId: string | null
}

interface Batch {
  id: string
  status: string
  createdAt: string
  uploadedBy: UploadedBy
  _count: { photos: number }
}

interface PhotosData {
  photos: Photo[]
  batches: Batch[]
  stats: {
    total: number
    pending: number
    edited: number
    approved: number
  }
  canApprove: boolean
}

interface BookingPhotosProps {
  bookingId: string
  userRole: string
}

export function BookingPhotos({ bookingId, userRole }: BookingPhotosProps) {
  const [data, setData] = useState<PhotosData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPhotos()
  }, [bookingId])

  const fetchPhotos = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/bookings/${bookingId}/photos`)
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any
        toast.error(errorData.error || "Failed to fetch photos")
        return
      }
      const result = (await response.json()) as any
      setData(result)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to fetch photos")
    } finally {
      setIsLoading(false)
    }
  }

  const loadPhotoUrl = async (photoId: string) => {
    if (photoUrls[photoId]) return photoUrls[photoId]
    try {
      const response = await fetch(`/api/photos/${photoId}/download`)
      if (response.ok) {
        const result = (await response.json()) as any
        setPhotoUrls((prev) => ({ ...prev, [photoId]: result.url }))
        return result.url
      }
    } catch (error) {
      console.error("Failed to load photo URL:", error)
    }
    return null
  }

  const handleViewPhoto = async (photo: Photo) => {
    setPreviewPhoto(photo)
    const url = await loadPhotoUrl(photo.id)
    setPreviewUrl(url)
  }

  const handleDownload = async (photo: Photo) => {
    try {
      const url = await loadPhotoUrl(photo.id)
      if (!url) {
        toast.error(`Failed to download ${photo.fileName}: no download URL available`)
        return
      }
      const link = document.createElement("a")
      link.href = url
      link.download = photo.fileName
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Downloading ${photo.fileName}`)
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download photo")
    }
  }

  const toggleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos)
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId)
    } else {
      newSelected.add(photoId)
    }
    setSelectedPhotos(newSelected)
  }

  const selectAll = () => {
    if (!data) return
    const pending = data.photos.filter((p) => p.processingStatus !== "APPROVED")
    setSelectedPhotos(new Set(pending.map((p) => p.id)))
  }

  const clearSelection = () => {
    setSelectedPhotos(new Set())
  }

  const handleApprove = async (action: "approve" | "reject" | "approve_all", photoIds?: string[]) => {
    try {
      setIsApproving(true)
      const response = await fetch(`/api/bookings/${bookingId}/photos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          photoIds: photoIds || Array.from(selectedPhotos),
        }),
      })

      if (response.ok) {
        const result = (await response.json()) as any
        toast.success(
          action === "approve_all"
            ? `Approved all photos`
            : action === "approve"
            ? `Approved ${result.updatedCount} photo(s)`
            : `Rejected ${result.updatedCount} photo(s)`
        )
        setSelectedPhotos(new Set())
        fetchPhotos()
      } else {
        const error = (await response.json()) as any
        toast.error(error.error || "Failed to update photos")
      }
    } catch (error) {
      toast.error("Failed to update photos")
    } finally {
      setIsApproving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      EDITING: "bg-yellow-500",
      EDITED: "bg-blue-500",
      APPROVED: "bg-green-500",
    }
    return (
      <Badge className={styles[status] || "bg-gray-500"}>
        {status}
      </Badge>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { photos, stats, canApprove } = data
  const pendingPhotos = photos.filter((p) => p.processingStatus !== "APPROVED")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconPhoto className="h-5 w-5" />
              Photos
            </CardTitle>
            <CardDescription>
              {stats.total} total • {stats.approved} approved • {stats.pending + stats.edited} pending
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canApprove && pendingPhotos.length > 0 && (
              <Button
                size="sm"
                onClick={() => handleApprove("approve_all")}
                disabled={isApproving}
              >
                <IconCheck className="h-4 w-4 mr-1" />
                Approve All ({pendingPhotos.length})
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={fetchPhotos}>
              <IconRefresh className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {photos.length > 0 ? (
          <>
            {/* Selection toolbar */}
            {canApprove && selectedPhotos.size > 0 && (
              <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                <span className="text-sm">
                  {selectedPhotos.size} photo(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApprove("reject")}
                    disabled={isApproving}
                  >
                    <IconX className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove("approve")}
                    disabled={isApproving}
                  >
                    <IconCheck className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            )}

            {/* Select all button */}
            {canApprove && pendingPhotos.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectedPhotos.size > 0 ? clearSelection : selectAll}
                >
                  {selectedPhotos.size > 0 ? (
                    <>
                      <IconCheckbox className="h-4 w-4 mr-1" />
                      Clear Selection
                    </>
                  ) : (
                    <>
                      <IconSquare className="h-4 w-4 mr-1" />
                      Select All Pending
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Photo grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative group aspect-square border rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedPhotos.has(photo.id)
                      ? "ring-2 ring-primary"
                      : "hover:ring-1 hover:ring-muted-foreground"
                  }`}
                  onClick={() => canApprove && photo.processingStatus !== "APPROVED" && toggleSelectPhoto(photo.id)}
                >
                  {/* Placeholder - in real app, load from R2 */}
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <IconPhoto className="h-8 w-8 text-muted-foreground" />
                  </div>

                  {/* Selection checkbox */}
                  {canApprove && photo.processingStatus !== "APPROVED" && (
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedPhotos.has(photo.id)}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleSelectPhoto(photo.id)}
                      />
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(photo.processingStatus)}
                  </div>

                  {/* Overlay with info */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate">{photo.fileName}</p>
                    <p className="text-xs text-white/70">{formatFileSize(photo.fileSize)}</p>
                  </div>

                  {/* View button on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewPhoto(photo)
                      }}
                    >
                      <IconEye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(photo)
                      }}
                    >
                      <IconDownload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <IconPhoto className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No photos uploaded yet</p>
          </div>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewPhoto?.fileName}</DialogTitle>
          </DialogHeader>
          {previewPhoto && (
            <div className="space-y-4">
              {/* Image preview - load from R2 */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={previewPhoto.fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <IconPhoto className="h-16 w-16 text-muted-foreground animate-pulse" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(previewPhoto.processingStatus)}
                </div>
                <div>
                  <p className="text-muted-foreground">File Size</p>
                  <p>{formatFileSize(previewPhoto.fileSize)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uploaded By</p>
                  <p className="flex items-center gap-1">
                    <IconUser className="h-3 w-3" />
                    {previewPhoto.uploadedBy.name || previewPhoto.uploadedBy.email}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uploaded At</p>
                  <p className="flex items-center gap-1">
                    <IconClock className="h-3 w-3" />
                    {format(new Date(previewPhoto.uploadedAt), "PPp")}
                  </p>
                </div>
              </div>

              {canApprove && previewPhoto.processingStatus !== "APPROVED" && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(previewPhoto)}
                  >
                    <IconDownload className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleApprove("reject", [previewPhoto.id])
                      setPreviewPhoto(null)
                      setPreviewUrl(null)
                    }}
                  >
                    <IconX className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      handleApprove("approve", [previewPhoto.id])
                      setPreviewPhoto(null)
                      setPreviewUrl(null)
                    }}
                  >
                    <IconCheck className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
              {(!canApprove || previewPhoto.processingStatus === "APPROVED") && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(previewPhoto)}
                  >
                    <IconDownload className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
