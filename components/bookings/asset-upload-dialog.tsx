// components/bookings/asset-upload-dialog.tsx
"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  IconUpload,
  IconLoader2,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconPhoto,
  IconTrash,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface AssetUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  onSuccess: () => void
}

interface UploadFile {
  file: File
  id: string
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  errorMessage?: string
}

export function AssetUploadDialog({
  open,
  onOpenChange,
  bookingId,
  onSuccess,
}: AssetUploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: "pending",
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB per file
    disabled: isUploading,
  })

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error("No files to upload")
      return
    }

    setIsUploading(true)
    let successCount = 0
    let errorCount = 0

    try {
      // Create upload batch
      const batchResponse = await fetch("/api/photos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          totalFiles: files.length,
        }),
      })

      if (!batchResponse.ok) {
        throw new Error("Failed to create upload batch")
      }

      const { batchId } = (await batchResponse.json()) as any

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const uploadFile = files[i]

        // Update status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "uploading" } : f
          )
        )

        const formData = new FormData()
        formData.append("file", uploadFile.file)
        formData.append("bookingId", bookingId)
        formData.append("batchId", batchId)

        try {
          const response = await fetch("/api/photos/upload", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            throw new Error("Upload failed")
          }

          // Success
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "success", progress: 100 }
                : f
            )
          )
          successCount++
        } catch (error) {
          // Error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    status: "error",
                    errorMessage: "Upload failed",
                  }
                : f
            )
          )
          errorCount++
        }

        // Update overall progress
        const progress = ((i + 1) / files.length) * 100
        setUploadProgress(progress)
      }

      // Complete batch
      await fetch(`/api/photos/batch/${batchId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedFiles: successCount,
          failedFiles: errorCount,
        }),
      })

      if (successCount > 0) {
        toast.success(`Uploaded ${successCount} file(s) successfully`)
        onSuccess()
        setTimeout(() => {
          onOpenChange(false)
          setFiles([])
          setUploadProgress(0)
        }, 1500)
      }

      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} file(s)`)
      }
    } catch (error: any) {
      toast.error(error.message || "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const pendingCount = files.filter((f) => f.status === "pending").length
  const successCount = files.filter((f) => f.status === "success").length
  const errorCount = files.filter((f) => f.status === "error").length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Client Photos</DialogTitle>
          <DialogDescription>
            Upload edited photos for this booking. Supported formats: JPG, PNG, GIF, WEBP
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <IconUpload className="h-12 w-12 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm font-medium">Drop files here...</p>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    Drag & drop photos here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max 50MB per file • JPG, PNG, GIF, WEBP
                  </p>
                </>
              )}
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconPhoto className="h-4 w-4" />
                  <span className="font-semibold text-sm">
                    {files.length} file(s) • {formatSize(totalSize)}
                  </span>
                </div>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiles([])}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {files.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-md border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {uploadFile.status === "pending" && (
                          <IconPhoto className="h-5 w-5 text-muted-foreground" />
                        )}
                        {uploadFile.status === "uploading" && (
                          <IconLoader2 className="h-5 w-5 animate-spin text-blue-500" />
                        )}
                        {uploadFile.status === "success" && (
                          <IconCheck className="h-5 w-5 text-green-500" />
                        )}
                        {uploadFile.status === "error" && (
                          <IconX className="h-5 w-5 text-red-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(uploadFile.file.size)}
                          {uploadFile.errorMessage && (
                            <span className="text-red-500 ml-2">
                              • {uploadFile.errorMessage}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {!isUploading && uploadFile.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <IconTrash className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-3 space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {successCount} uploaded • {pendingCount} pending
                      {errorCount > 0 && ` • ${errorCount} failed`}
                    </span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Info Alert */}
          <Alert>
            <IconAlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Upload only edited, final photos. Client will
              receive download link after full payment is confirmed.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <IconUpload className="mr-2 h-4 w-4" />
                Upload {files.length} File{files.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}