// app/api/staff/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: List staff (for photographer selection, etc.)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roles = searchParams.get("roles")?.split(",")

    // Build where clause
    const where: any = {
      studioId: session.user.studioId, // Studio isolation
      isActive: true,
      ...(roles && roles.length > 0 && {
        role: { in: roles },
      }),
    }

    const staff = await prisma.staff.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ staff })
  } catch (error) {
    console.error("Get staff error:", error)
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    )
  }
}