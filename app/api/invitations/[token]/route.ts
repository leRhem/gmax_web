// app/api/invitations/[token]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

interface RouteParams {
    params: Promise<{ token: string }>
}

// GET: Validate invitation token and return details
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { token } = await params

        const invitation = await prisma.staffInvitation.findUnique({
            where: { token },
            include: {
                invitedBy: {
                    select: { name: true },
                },
            },
        })

        if (!invitation) {
            return NextResponse.json(
                { error: "Invitation not found" },
                { status: 404 }
            )
        }

        // Check if already accepted
        if (invitation.status === "ACCEPTED") {
            return NextResponse.json(
                { error: "This invitation has already been accepted" },
                { status: 400 }
            )
        }

        // Check if revoked
        if (invitation.status === "REVOKED") {
            return NextResponse.json(
                { error: "This invitation has been revoked" },
                { status: 400 }
            )
        }

        // Check if expired
        if (new Date() > invitation.expiresAt) {
            // Update status to expired
            await prisma.staffInvitation.update({
                where: { id: invitation.id },
                data: { status: "EXPIRED" },
            })
            return NextResponse.json(
                { error: "This invitation has expired" },
                { status: 400 }
            )
        }

        return NextResponse.json({
            invitation: {
                name: invitation.name,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
                invitedBy: invitation.invitedBy?.name || "Admin",
            },
        })
    } catch (error) {
        console.error("Validate invitation error:", error)
        return NextResponse.json(
            { error: "Failed to validate invitation" },
            { status: 500 }
        )
    }
}

// POST: Accept invitation and create staff account
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { token } = await params
        const body = (await request.json()) as any
        const { password, name } = body

        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            )
        }

        if (name && (typeof name !== 'string' || name.trim().length === 0)) {
             return NextResponse.json(
                { error: "Name must be a non-empty string" },
                { status: 400 }
            )
        }

        // Find and validate invitation
        const invitation = await prisma.staffInvitation.findUnique({
            where: { token },
        })

        if (!invitation) {
            return NextResponse.json(
                { error: "Invitation not found" },
                { status: 404 }
            )
        }

        if (invitation.status !== "PENDING") {
            return NextResponse.json(
                { error: `Invitation is ${invitation.status.toLowerCase()}` },
                { status: 400 }
            )
        }

        if (new Date() > invitation.expiresAt) {
            await prisma.staffInvitation.update({
                where: { id: invitation.id },
                data: { status: "EXPIRED" },
            })
            return NextResponse.json(
                { error: "This invitation has expired" },
                { status: 400 }
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create staff account and update invitation in a transaction
        const [staff] = await prisma.$transaction([
            prisma.staff.create({
                data: {
                    email: invitation.email,
                    name: (name && typeof name === 'string') ? name.trim() : invitation.name,
                    phone: invitation.phone,
                    password: hashedPassword,
                    role: invitation.role,
                    studioId: invitation.studioId,
                    invitedAt: invitation.createdAt,
                    acceptedAt: new Date(),
                    isActive: true,
                },
            }),
            prisma.staffInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: "ACCEPTED",
                    acceptedAt: new Date(),
                },
            }),
        ])

        return NextResponse.json({
            message: "Account created successfully",
            staff: {
                id: staff.id,
                email: staff.email,
                name: staff.name,
                role: staff.role,
            },
        })
    } catch (error: any) {
        console.error("Accept invitation error:", error)

        // Handle duplicate email
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: "Failed to accept invitation" },
            { status: 500 }
        )
    }
}
