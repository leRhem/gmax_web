import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendTermiiMessage, sendTermiiEmail } from "@/lib/notifications"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { channel } = (await request.json()) as any // "sms", "whatsapp", "email"

    const staff = await prisma.staff.findUnique({
      where: { id },
    })

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }

    // Generate secure token
    const token = crypto.randomUUID()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store hashed token for security (SHA-256)
    const { createHash } = await import("crypto")
    const hashedToken = createHash("sha256").update(token).digest("hex")

    // Check for email if that's the channel before creating token, or move creation later.
    // User asked to: "move the prisma.verificationToken.create call so it runs after all validations" OR "add a cleanup step".
    // I'll add cleanup step as it keeps logic linear.
    const cleanupToken = async () => {
         await prisma.verificationToken.deleteMany({
             where: { 
                 identifier: staff.email, 
                 token: hashedToken 
             }
         })
    }

    await prisma.verificationToken.create({
      data: {
        identifier: staff.email,
        token: hashedToken,
        expires,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const updateUrl = `${baseUrl}/update-credentials?email=${encodeURIComponent(staff.email)}&token=${token}`
    const message = `Hello ${staff.name || "Staff"}. Update your Gmax Studio credentials here: ${updateUrl}`

    // Send via requested channel
    if (channel === "sms") {
        if (!staff.phone) return NextResponse.json({ error: "No phone number" }, { status: 400 })
        await sendTermiiMessage(staff.phone, message, "dnd")
    } else if (channel === "whatsapp") {
        if (!staff.phone) return NextResponse.json({ error: "No phone number" }, { status: 400 })
        await sendTermiiMessage(staff.phone, message, "whatsapp")
    } else if (channel === "email") {
        if (!process.env.TERMII_RESET_TEMPLATE_ID) {
            console.error("Missing TERMII_RESET_TEMPLATE_ID")
            return NextResponse.json({ error: "Configuration error" }, { status: 500 })
        }
        if (!staff.email) {
             await cleanupToken()
             return NextResponse.json({ error: "No email address" }, { status: 400 })
        }
        await sendTermiiEmail(
            staff.email, 
            message, 
            staff.name || "Staff",
            process.env.TERMII_RESET_TEMPLATE_ID
        )
    } else {
        return NextResponse.json({ error: "Invalid channel" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Credentials send error:", error)
    return NextResponse.json(
      { error: "Failed to send credentials" },
      { status: 500 }
    )
  }
}
