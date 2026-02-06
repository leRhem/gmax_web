// app/(public)/delivery/expired/page.tsx
// Expired delivery link page
import Image from "next/image"
import Link from "next/link"
import {
  IconClockOff,
  IconPhone,
  IconBrandWhatsapp,
  IconHome,
  IconMail,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Force dynamic rendering since this page relies on searchParams
export const dynamic = "force-dynamic"

export default async function ExpiredDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ studioName?: string; studioPhone?: string }>
}) {
  const { studioName = "GMax Studioz", studioPhone = "" } = await searchParams
  
  // Format phone for WhatsApp
  const whatsappNumber = studioPhone.replace(/[^0-9]/g, "")
  const whatsappMessage = encodeURIComponent(
    "Hi! My photo delivery link has expired. Can you please send me a new one?"
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <Link href="/">
              <Image src="/Logo.png" alt="GMax Studioz" width={60} height={60} />
            </Link>
          </div>
          <div className="mx-auto mb-4 p-4 rounded-full bg-orange-100 w-fit">
            <IconClockOff className="h-10 w-10 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Link Expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Your photo delivery link has expired. Delivery links are valid for 
            30 days after being generated for security purposes.
          </p>

          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <p className="font-medium text-sm text-center">
              Request a new delivery link:
            </p>
            
            <div className="grid gap-2">
              {studioPhone && (
                <>
                  <Button
                    asChild
                    variant="default"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <IconBrandWhatsapp className="mr-2 h-5 w-5" />
                      WhatsApp {studioName}
                    </a>
                  </Button>
                  
                  <Button asChild variant="outline" className="w-full">
                    <a href={`tel:${studioPhone}`}>
                      <IconPhone className="mr-2 h-5 w-5" />
                      Call {studioPhone}
                    </a>
                  </Button>
                </>
              )}
              
              <Button asChild variant="outline" className="w-full">
                <a href="mailto:info@gmaxstudioz.com?subject=Request%20New%20Delivery%20Link">
                  <IconMail className="mr-2 h-5 w-5" />
                  Send Email
                </a>
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Please have your booking reference or phone number ready when 
            contacting us so we can quickly locate your photos.
          </p>

          <div className="pt-2">
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">
                <IconHome className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
