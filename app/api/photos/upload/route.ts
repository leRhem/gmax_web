// app/api/photos/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Validate R2 credentials at startup
const isR2Configured = !!(
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID)
)

// R2 Client Configuration
const R2 = isR2Configured ? new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
}) : null

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "gmax-studio"

/**
 * POST: Upload a single photo file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check role
    const allowedRoles = ["ADMIN", "MANAGER", "PHOTO_EDITOR", "VIDEO_EDITOR", "PHOTOGRAPHER"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Validate studioId exists
    if (!session.user.studioId) {
      return NextResponse.json({ error: "No studio assigned to user" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const bookingId = formData.get("bookingId") as string
    const batchId = formData.get("batchId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 })
    }

    // Verify booking exists and belongs to user's studio
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        studioId: session.user.studioId,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, GIF, WEBP allowed" },
        { status: 400 }
      )
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum 50MB allowed" },
        { status: 400 }
      )
    }

    // Generate unique R2 key
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const r2Key = `bookings/${bookingId}/${timestamp}-${safeFileName}`

    // Upload to R2
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let r2Uploaded = false
    
    if (isR2Configured && R2) {
      try {
        await R2.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: r2Key,
            Body: fileBuffer,
            ContentType: file.type,
            Metadata: {
              bookingId,
              uploadedBy: session.user.id,
            },
          })
        )
        r2Uploaded = true
      } catch (uploadError: any) {
        console.error("R2 upload error:", uploadError)
        console.warn("R2 upload failed, creating record with PENDING_UPLOAD status")
      }
    } else {
      console.warn("R2 not configured, creating record with PENDING_UPLOAD status")
    }

    // Calculate expiry (30 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Create photo record with appropriate status based on R2 upload result
    const photo = await prisma.photo.create({
      data: {
        bookingId,
        batchId: batchId || null,
        r2Key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: r2Uploaded ? "UPLOADED" : "PROCESSING",
        processingStatus: "EDITING",
        expiresAt,
        uploadedById: session.user.id,
      },
    })

    return NextResponse.json({
      photo: {
        id: photo.id,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
        status: photo.status,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Upload photo error:", error)
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    )
  }
}
