// app/(public)/delivery/[token]/page.tsx
// Photo delivery portal - clients view and download their photos
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import {
  IconPhoto,
  IconCalendar,
  IconMapPin,
  IconDownload,
  IconPhone,
  IconCheck,
  IconAlertCircle,
  IconClock,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PhotoGallery } from "./photo-gallery"

interface Props {
  params: { token: string }
}

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  
  const deliveryToken = await prisma.deliveryToken.findUnique({
    where: { token },
    include: {
      booking: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          studio: {
            select: {
              id: true,
              name: true,
              city: true,
              phone: true,
            },
          },
          items: {
            include: {
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
          payments: {
            where: { status: "COMPLETED" },
            select: { amount: true },
          },
          photos: {
            where: {
              status: { in: ["READY", "DELIVERED"] },
            },
            orderBy: { uploadedAt: "asc" },
            select: {
              id: true,
              fileName: true,
              thumbnailKey: true,
              previewKey: true,
              r2Key: true,
              editedKey: true,
              status: true,
              downloadCount: true,
              clientDownloaded: true,
            },
          },
        },
      },
    },
  }) as any

  if (!deliveryToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <Link href="/">
                <Image src="/Logo.png" alt="GMax Studioz" width={60} height={60} />
              </Link>
            </div>
            <CardTitle className="text-xl">Link Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This delivery link doesn't exist or has been removed.
            </p>
            <Link
              href="/"
              className="text-primary hover:underline text-sm"
            >
              Return to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if expired
  if (deliveryToken.expiresAt < new Date()) {
    const studioParams = new URLSearchParams({
      studioName: deliveryToken.booking.studio.name,
      studioPhone: deliveryToken.booking.studio.phone || "",
    })
    redirect(`/delivery/expired?${studioParams.toString()}`)
  }

  // Increment view count
  await prisma.deliveryToken.update({
    where: { id: deliveryToken.id },
    data: { downloads: { increment: 1 } },
  })

  const booking = deliveryToken.booking

  // Calculate payment status
  // Calculate payment status
  const totalAmount = booking.items.reduce(
    (sum: number, item: any) => sum + Number(item.priceSnapshot) * item.quantity,
    0
  )
  const paidAmount = booking.payments.reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0
  )
  const isPaidInFull = paidAmount >= totalAmount
  const balance = totalAmount - paidAmount

  // Generate photo URLs
  const baseUrl = process.env.R2_PUBLIC_URL || ""
  const photos = booking.photos.map((photo: any) => ({
    id: photo.id,
    fileName: photo.fileName,
    thumbnailUrl: photo.thumbnailKey ? `${baseUrl}/${photo.thumbnailKey}` : null,
    previewUrl: photo.previewKey ? `${baseUrl}/${photo.previewKey}` : null,
    isDownloaded: photo.clientDownloaded,
  }))

  // Calculate expiry
  const daysUntilExpiry = Math.ceil(
    (deliveryToken.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/Logo.png" alt="GMax Studioz" width={40} height={40} />
            <span className="font-bold text-lg">GMax Studioz</span>
          </Link>
          <Badge variant="outline" className="flex items-center gap-1">
            <IconDownload className="h-3 w-3" />
            Photo Delivery
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Booking Info Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Delivering photos for</p>
                <CardTitle className="text-2xl">{booking.client.name}</CardTitle>
              </div>
              <Badge
                variant={isPaidInFull ? "default" : "destructive"}
                className="w-fit"
              >
                {isPaidInFull ? (
                  <>
                    <IconCheck className="mr-1 h-3 w-3" />
                    Paid in Full
                  </>
                ) : (
                  <>
                    <IconAlertCircle className="mr-1 h-3 w-3" />
                    Balance Due: ₦{balance.toLocaleString()}
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <IconPhoto className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Service</p>
                  <p className="font-medium">{booking.items[0]?.service?.name || "Photo Session"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconCalendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Session Date</p>
                  <p className="font-medium">{format(booking.bookingDate, "PPP")}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconMapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Studio</p>
                  <p className="font-medium">{booking.studio.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconClock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Link expires in</p>
                  <p className="font-medium">{daysUntilExpiry} days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Warning Banner */}
        {!isPaidInFull && (
          <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <IconAlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    Payment Required to Download
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Complete your payment of ₦{balance.toLocaleString()} to download your photos.
                  </p>
                </div>
              </div>
              {booking.studio.phone && (
                <a
                  href={`tel:${booking.studio.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors text-sm font-medium"
                >
                  <IconPhone className="h-4 w-4" />
                  Contact to Pay
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Photo Gallery */}
        {photos.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <IconPhoto className="h-5 w-5" />
                Your Photos ({photos.length})
              </h2>
            </div>
            <PhotoGallery
              photos={photos}
              token={token}
              canDownload={isPaidInFull}
            />
          </>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <IconPhoto className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium mb-2">No Photos Yet</p>
              <p className="text-muted-foreground">
                Your photos are being processed. Please check back later.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <Separator className="my-8" />
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Questions about your photos? Contact{" "}
            <a 
              href={`tel:${booking.studio.phone}`}
              className="text-primary hover:underline"
            >
              {booking.studio.name}
            </a>
          </p>
          <p>
            This link expires on {format(deliveryToken.expiresAt, "PPP")}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          GMax Studioz © {new Date().getFullYear()} • All rights reserved
        </div>
      </footer>
    </div>
  )
}
