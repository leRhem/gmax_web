// app/api/staff/invite/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { StaffRole, NotificationChannel } from "@/lib/generated/prisma"
import { sendNotification } from "@/lib/notifications"

// POST: Create staff invitation
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can invite staff
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = (await request.json()) as any
        const { email, name, phone, role, studioId } = body

        // Validate required fields
        if (!email || !name || !role) {
            return NextResponse.json(
                { error: "Email, name, and role are required" },
                { status: 400 }
            )
        }

        // Check if staff already exists
        const existingStaff = await prisma.staff.findUnique({
            where: { email },
        })

        if (existingStaff) {
            return NextResponse.json(
                { error: "A staff member with this email already exists" },
                { status: 400 }
            )
        }

        // Check for pending invitation
        const existingInvitation = await prisma.staffInvitation.findFirst({
            where: {
                email,
                status: "PENDING",
            },
        })

        if (existingInvitation) {
            return NextResponse.json(
                { error: "An invitation is already pending for this email" },
                { status: 400 }
            )
        }

        // Create invitation with 7-day expiry
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const invitation = await prisma.staffInvitation.create({
            data: {
                email,
                name,
                phone: phone || null,
                role: role as StaffRole,
                studioId: studioId || session.user.studioId,
                expiresAt,
                invitedById: session.user.id,
            },
        })

        // Build the invitation URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const inviteUrl = `${baseUrl}/auth/accept-invite/${invitation.token}`

        // Send notifications
        const channels: NotificationChannel[] = ["EMAIL"]
        if (phone) {
            channels.push("WHATSAPP")
        }

        // Fire-and-forget notification with error logging
        try {
            await sendNotification({
                clientName: name,
                clientEmail: email,
                clientPhone: phone,
                type: "STAFF_INVITATION",
                message: `You have been invited to join GMAX Studio as ${role}. Accept your invitation here: ${inviteUrl}`,
                channels: channels,
            })
        } catch (notifError) {
            console.error("Failed to send invitation notification:", notifError)
        }

        return NextResponse.json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                name: invitation.name,
                role: invitation.role,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
            },
            inviteUrl, // Include for testing/development
            message: "Invitation created successfully",
        })
    } catch (error) {
        console.error("Create invitation error:", error)
        return NextResponse.json(
            { error: "Failed to create invitation" },
            { status: 500 }
        )
    }
}

// GET: List pending invitations
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can view invitations
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status") || "PENDING"

        const invitations = await prisma.staffInvitation.findMany({
            where: {
                status: status as any,
                ...(session.user.studioId && { studioId: session.user.studioId }),
            },
            include: {
                invitedBy: {
                    select: { name: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ invitations })
    } catch (error) {
        console.error("Get invitations error:", error)
        return NextResponse.json(
            { error: "Failed to fetch invitations" },
            { status: 500 }
        )
    }
}
