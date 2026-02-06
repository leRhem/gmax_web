// app/api/cron/reminders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/lib/notifications"
import { NotificationChannel, Prisma } from "@/lib/generated/prisma"

// This route should be protected typically, but for Cron we might check a secret key header.
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

    // Find bookings for TOMORROW
    // Find bookings for TOMORROW (UTC aligned)
    const now = new Date()
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    const dayAfter = new Date(tomorrow)
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)

    const bookings = await prisma.booking.findMany({
      where: {
        bookingDate: {
          gte: tomorrow,
          lt: dayAfter,
        },
        bookingStatus: "CONFIRMED",
      },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
      },
    }) as Prisma.BookingGetPayload<{
        include: {
            client: true,
            items: { include: { service: true } }
        }
    }>[]

    const results = []

    for (const booking of bookings) {
       try {
           const clientName = booking.client.name
           const clientPhone = booking.client.phone
           const clientEmail = booking.client.email
           const serviceName = booking.items[0]?.service?.name || "Session" // Safe access
           const time = new Intl.DateTimeFormat("en-US", { 
               hour: 'numeric', 
               minute: '2-digit', 
               timeZone: 'Africa/Lagos' 
           }).format(booking.bookingDate)

           const channels: NotificationChannel[] = []
           // Prefer WhatsApp, fallback to SMS
           if (clientPhone) {
              if (process.env.ENABLE_WHATSAPP === "true") {
                  channels.push("WHATSAPP") 
              } else {
                  channels.push("SMS")
              }
           }
           if (clientEmail) channels.push("EMAIL")

           if (channels.length > 0) {
               await sendNotification({
                   clientName,
                   clientPhone,
                   clientEmail,
                   type: "BOOKING_REMINDER", // Using valid enum value for reminders
                   message: `Hello ${clientName}, this is a reminder for your upcoming ${serviceName} at GMAX Studio tomorrow at ${time}. We look forward to seeing you!`,
                   channels,
                   bookingId: booking.id
               })
               results.push({ bookingId: booking.id, status: "sent" })
           }
       } catch (error) {
           console.error(`Failed to send reminder for booking ${booking.id}:`, error)
           results.push({ bookingId: booking.id, status: "failed", error: (error as Error).message })
       }
    }

    return NextResponse.json({ 
        message: "Reminders processed", 
        count: results.length,
        details: results 
    })
  } catch (error) {
    console.error("Cron Reminder Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
