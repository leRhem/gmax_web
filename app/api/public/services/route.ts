// app/api/public/services/route.ts
// Public API for listing available services
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET: List active services grouped by category
 */
export async function GET(_request: NextRequest) {
  try {
    // Get categories with their services
    const categories = await prisma.serviceCategory.findMany({
      include: {
        services: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })

    // Filter to only categories with active services and format response
    const formattedCategories = categories
      .filter((category: any) => category.services.length > 0)
      .map((category: any) => ({
        id: category.id,
        name: category.name,
        type: category.type,
        services: category.services.map((service: any) => ({
                  id: service.id,
          name: service.name,
          description: service.description,
          price: Number(service.price),
          salePrice: service.salePrice ? Number(service.salePrice) : null,
          displayPrice: service.salePrice ? Number(service.salePrice) : Number(service.price),
          hasDiscount: service.salePrice !== null && Number(service.salePrice) < Number(service.price),
          discountPercent: service.salePrice
            ? Math.round((1 - Number(service.salePrice) / Number(service.price)) * 100)
            : 0,
          sessionDuration: service.sessionDuration,
          includesSessions: service.includesSessions,
          allowExtraOutfits: service.allowExtraOutfits,
          extraOutfitPrice: service.extraOutfitPrice ? Number(service.extraOutfitPrice) : null,
          allowExtraPics: service.allowExtraPics,
          extraPicPrice: service.extraPicPrice ? Number(service.extraPicPrice) : null,
          features: service.features || [],
        })),
      }))

    return NextResponse.json({ categories: formattedCategories })
  } catch (error) {
    console.error("Get public services error:", error)
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    )
  }
}
