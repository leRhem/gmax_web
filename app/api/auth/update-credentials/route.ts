import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { email, token, password } = (await req.json()) as any

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // 1. Verify token
    // 0. Validate password strength
    // Require at least one lowercase, one uppercase, one digit, and one non-alphanumeric character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    if (!passwordRegex.test(password)) {
        return NextResponse.json({ 
            error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" 
        }, { status: 400 })
    }

    // 1. Verify token (Hash first)
    const { createHash } = await import("crypto")
    const hashedToken = createHash("sha256").update(token).digest("hex")

    // 2. Hash password
    const hashedPassword = await hash(password, 12)

    // 3. Verify Token & Update User Atomically
    const result = await prisma.$transaction(async (tx) => {
        // Find token within transaction
        const verificationToken = await tx.verificationToken.findUnique({
             where: {
                identifier_token: {
                  identifier: email,
                  token: hashedToken,
                },
              },
        })

        if (!verificationToken) {
            return { error: "Invalid or expired token", status: 400 }
        }

        if (new Date() > verificationToken.expires) {
            return { error: "Token has expired", status: 400 }
        }

        const staff = await tx.staff.findUnique({ where: { email } })
        
        if (!staff) {
            return { error: "User not found", status: 404 }
        }

        await tx.staff.update({
          where: { email },
          data: {
            password: hashedPassword,
            emailVerified: staff.emailVerified ? undefined : new Date(),
            acceptedAt: staff.invitedAt && !staff.acceptedAt ? new Date() : undefined,
          },
        })
        
        // Delete token
        /* await tx.verificationToken.delete({
             where: { identifier_token: { identifier: email, token: hashedToken } }
        }) */ 
        // Note: Logic to delete token is implied by "consume", usually we delete it. 
        // Assuming we should delete it to prevent reuse.
        await tx.verificationToken.deleteMany({
             where: { 
                 identifier: email, 
                 token: hashedToken 
             }
        })

        return { success: true }
    })

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status })
    }



    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update credentials error:", error)
    return NextResponse.json(
      { error: "Failed to update credentials" },
      { status: 500 }
    )
  }
}
