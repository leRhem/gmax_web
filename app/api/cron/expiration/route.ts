// app/api/cron/expiration/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/lib/notifications"
import { NotificationChannel } from "@/lib/generated/prisma"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    
    if (!process.env.CRON_SECRET) {
        console.error("CRON_SECRET is not set")
        return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Logic: Find photos expiring in 3 days
    // Photos have expiresAt.
    
    const now = new Date()
    const warningDate = new Date()
    warningDate.setDate(now.getDate() + 3) // 3 days from now

    // Find photos that are expiring in 3 days and haven't had a warning sent
    const expiringPhotos = await prisma.photo.findMany({
        where: {
            expiresAt: {
                lte: warningDate,
                gt: now, // Not yet expired
            },
            expirationWarningSent: false
        },
        include: {
            booking: {
                include: { client: true }
            }
        }
    })

    const results = []

    for (const photo of expiringPhotos) {
        try {
            const client = photo.booking.client
            if (!client || !client.email) {
                results.push({ photoId: photo.id, status: "skipped", reason: "No client or client email" })
                continue
            }

            const channels: NotificationChannel[] = []
            if (client.phone) channels.push("SMS", "WHATSAPP")
            if (client.email) channels.push("EMAIL")

            if (channels.length > 0) {
                // Optimistic update (or at least pre-mark to avoid race loop on failure handled by next run)
                // Actually, if we mark it sent BEFORE sending, and sending fails, we might verify later. 
                // But better to avoid double scan.
                await prisma.photo.update({
                    where: { id: photo.id },
                    data: { expirationWarningSent: true }
                })

                try {
                    await sendNotification({
                        clientName: client.name,
                        clientEmail: client.email,
                        clientPhone: client.phone,
                        type: "PHOTOS_EXPIRING",
                        message: `Hello ${client.name}, your photos for booking #${photo.booking.id} at GMAX Studio are set to expire in 3 days. Please login to your dashboard and download them if you haven't already.`,
                        channels,
                        bookingId: photo.booking.id
                    })
                    results.push({ photoId: photo.id, status: "sent" })
                } catch (sendError) {
                    // Log failure, but we have already marked it as sent to prevent loop.
                    // Ideally we should have a retry mechanism or 'expirationWarningFailed' flag.
                    // For now, logging.
                    console.error(`Failed to send expiration note for photo ${photo.id}:`, sendError)
                     results.push({ photoId: photo.id, status: "sent_but_failed_delivery" })
                }
            } else {
                results.push({ photoId: photo.id, status: "skipped", reason: "No notification channels" })
            }
        } catch (error) {
            console.error(`Failed to process photo ${photo.id}:`, error)
             results.push({ photoId: photo.id, status: "failed", error: "Processing failed" })
        }
    }

    return NextResponse.json({ 
        message: "Expiration warnings processed", 
        count: results.length,
        details: results 
    })

  } catch (error) {
    console.error("Cron Expiration Error:", error)
    return NextResponse.json({ error: "Failed to send expiration warnings" }, { status: 500 })
  }
}
