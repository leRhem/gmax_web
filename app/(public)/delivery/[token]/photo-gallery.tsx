// app/(public)/delivery/[token]/photo-gallery.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  IconDownload,
  IconLoader2,
  IconCheck,
  IconX,
  IconPhoto,
  IconLock,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Photo {
  id: string
  fileName: string
  thumbnailUrl: string | null
  previewUrl: string | null
  isDownloaded: boolean
}

interface PhotoGalleryProps {
  photos: Photo[]
  token: string
  canDownload: boolean
}

export function PhotoGallery({ photos, token, canDownload }: PhotoGalleryProps) {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(
    new Set(photos.filter(p => p.isDownloaded).map(p => p.id))
  )
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)

  const handleDownload = async (photo: Photo) => {
    if (!canDownload) {
      toast.error("Payment required to download photos")
      return
    }

    setDownloadingIds(prev => new Set(prev).add(photo.id))

    try {
      const response = await fetch(`/api/public/delivery/${token}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id }),
      })

      const data = (await response.json()) as any

      if (!response.ok) {
        throw new Error(data.error || "Failed to download")
      }

      // Trigger download
      const link = document.createElement("a")
      link.href = data.downloadUrl
      link.download = data.fileName
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setDownloadedIds(prev => new Set(prev).add(photo.id))
      toast.success("Download started!")
    } catch (error: any) {
      toast.error(error.message || "Failed to download photo")
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev)
        next.delete(photo.id)
        return next
      })
    }
  }

  const handleDownloadAll = async () => {
    if (!canDownload) {
      toast.error("Payment required to download photos")
      return
    }

    setIsDownloadingAll(true)
    let successCount = 0
    let failCount = 0

    for (const photo of photos) {
      if (downloadedIds.has(photo.id)) {
        successCount++
        continue
      }

      try {
        const response = await fetch(`/api/public/delivery/${token}/download`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: photo.id }),
        })

        const data = (await response.json()) as any

        if (response.ok) {
          // Trigger download with delay to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 500))
          const link = document.createElement("a")
          link.href = data.downloadUrl
          link.download = data.fileName
          link.target = "_blank"
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          setDownloadedIds(prev => new Set(prev).add(photo.id))
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setIsDownloadingAll(false)

    if (failCount === 0) {
      toast.success(`All ${successCount} photos downloaded!`)
    } else {
      toast.warning(`Downloaded ${successCount} of ${photos.length} photos`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Download All Button */}
      {canDownload && photos.length > 1 && (
        <div className="flex justify-end">
          <Button 
            onClick={handleDownloadAll} 
            disabled={isDownloadingAll}
            size="lg"
          >
            {isDownloadingAll ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <IconDownload className="mr-2 h-4 w-4" />
                Download All ({photos.length})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((photo) => {
          const isDownloading = downloadingIds.has(photo.id)
          const isDownloaded = downloadedIds.has(photo.id)

          return (
            <Card
              key={photo.id}
              className={cn(
                "group relative aspect-square overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
                !canDownload && "opacity-75"
              )}
              onClick={() => setSelectedPhoto(photo)}
            >
              {/* Thumbnail or Placeholder */}
              {photo.thumbnailUrl || photo.previewUrl ? (
                <img
                  src={photo.thumbnailUrl || photo.previewUrl || ""}
                  alt={photo.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <IconPhoto className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {canDownload ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isDownloading}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(photo)
                    }}
                  >
                    {isDownloading ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconDownload className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <div className="p-2 rounded-full bg-black/50">
                    <IconLock className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Downloaded Badge */}
              {isDownloaded && (
                <div className="absolute top-2 right-2">
                  <Badge 
                    className="h-6 w-6 p-0 flex items-center justify-center bg-green-500"
                  >
                    <IconCheck className="h-3 w-3 text-white" />
                  </Badge>
                </div>
              )}

              {/* Locked Overlay */}
              {!canDownload && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="p-3 rounded-full bg-black/50">
                    <IconLock className="h-6 w-6 text-white/80" />
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-normal text-muted-foreground">
                {selectedPhoto?.fileName}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {canDownload && selectedPhoto && (
                  <Button
                    size="sm"
                    onClick={() => handleDownload(selectedPhoto)}
                    disabled={downloadingIds.has(selectedPhoto.id)}
                  >
                    {downloadingIds.has(selectedPhoto.id) ? (
                      <>
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <IconDownload className="mr-2 h-4 w-4" />
                        Download
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="relative aspect-video bg-black flex items-center justify-center">
            {selectedPhoto?.previewUrl || selectedPhoto?.thumbnailUrl ? (
              <img
                src={selectedPhoto.previewUrl || selectedPhoto.thumbnailUrl || ""}
                alt={selectedPhoto.fileName}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <IconPhoto className="h-16 w-16 text-muted-foreground/40" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
