// app/api/photos/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

type RouteParams = { params: Promise<{ id: string }> }

// R2 Client Configuration
const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "gmax-studio"

/**
 * GET: Get presigned URL for downloading a photo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find photo
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            studioId: true,
            photographerId: true,
          },
        },
      },
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Check access - Admin can access all, Manager/Staff can access their studio
    const userRole = session.user.role
    const userStudioId = session.user.studioId

    if (userRole !== "ADMIN") {
      if (photo.booking.studioId !== userStudioId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Generate presigned URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: photo.r2Key,
    })

    const presignedUrl = await getSignedUrl(R2 as any, command, {
      expiresIn: 3600, // 1 hour
    })

    return NextResponse.json({
      url: presignedUrl,
      fileName: photo.fileName,
      mimeType: photo.mimeType,
      fileSize: photo.fileSize,
    })
  } catch (error) {
    console.error("Get download URL error:", error)
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    )
  }
}
