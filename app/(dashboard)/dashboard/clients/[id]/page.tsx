import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  IconArrowLeft,
  IconEdit,
  IconPhone,
  IconMail,
  IconMapPin,
  IconNotes,
  IconCalendar,
  IconCurrencyNaira,
} from "@tabler/icons-react"
import { ClientType } from "@/types/client"
import { formatDistanceToNow } from "date-fns"
import { ClientPageActions } from "@/components/clients/client-page-actions"

type Props = {
  params: Promise<{ id: string }>
}

async function getClient(id: string) {
  const clientPromise = prisma.client.findUnique({
    where: { id },
  })

  // Fetch only the latest 10 bookings
  const bookingsPromise = prisma.booking.findMany({
    where: { clientId: id },
    select: {
      id: true,
      bookingDate: true,
      bookingStatus: true,
      paymentStatus: true,
      items: {
        include: {
          service: {
            select: {
              name: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: { bookingDate: "desc" },
    take: 10,
  })

  // Count total bookings separately
  const countPromise = prisma.booking.count({
    where: { clientId: id },
  })

  const [client, bookings, count] = await Promise.all([
    clientPromise,
    bookingsPromise,
    countPromise,
  ])

  if (!client) return null

  return {
    ...client,
    bookings,
    _count: {
      bookings: count,
    },
  }
}


export default async function ClientDetailPage(props: Props) {
  const params = await props.params
  
  const session = await auth()
  if (!session?.user) {
    return null
  }

  const client = await getClient(params.id)

  if (!client) {
    notFound()
  }

  // Calculate total spent
  const totalSpent = client.bookings.reduce((sum, booking: any) => {
    const bookingTotal = booking.items.reduce(
      (itemSum: number, item: any) => itemSum + Number(item.priceSnapshot),
      0
    )
    return sum + bookingTotal
  }, 0)

  const getClientTypeBadge = (type: ClientType) => {
    const variants = {
      STANDARD: { label: "Standard", className: "bg-gray-100 text-gray-700" },
      VIP: { label: "VIP", className: "bg-blue-100 text-blue-700" },
      VVIP: { label: "VVIP", className: "bg-purple-100 text-purple-700" },
      CORPORATE: {
        label: "Corporate",
        className: "bg-green-100 text-green-700",
      },
    }
    const variant = variants[type] || variants.STANDARD
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      PENDING: { label: "Pending", className: "bg-orange-100 text-orange-700" },
      PARTIAL: { label: "Partial", className: "bg-blue-100 text-blue-700" },
      COMPLETED: { label: "Paid", className: "bg-green-100 text-green-700" },
    }
    const variant = variants[status as keyof typeof variants] || variants.PENDING
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const getBookingStatusBadge = (status: string) => {
    const variants = {
      CONFIRMED: { label: "Confirmed", className: "bg-blue-100 text-blue-700" },
      COMPLETED: {
        label: "Completed",
        className: "bg-green-100 text-green-700",
      },
      CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
    }
    const variant = variants[status as keyof typeof variants] || variants.CONFIRMED
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  // Convert Prisma Decimal to number and prepare client data for the component
  const clientForComponent = {
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    address: client.address,
    notes: client.notes,
    type: client.type,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/clients">
              <IconArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-muted-foreground text-sm">
              Client since{" "}
              {formatDistanceToNow(new Date(client.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        <ClientPageActions client={clientForComponent} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getClientTypeBadge(client.type)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client._count.bookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-2xl font-bold">
              <IconCurrencyNaira className="h-6 w-6" />
              {totalSpent.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <IconPhone className="text-muted-foreground mt-0.5 h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-muted-foreground text-sm">{client.phone}</p>
              </div>
            </div>

            {client.email && (
              <div className="flex items-start gap-3">
                <IconMail className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-muted-foreground text-sm">
                    {client.email}
                  </p>
                </div>
              </div>
            )}

            {client.address && (
              <div className="flex items-start gap-3">
                <IconMapPin className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-muted-foreground text-sm">
                    {client.address}
                  </p>
                </div>
              </div>
            )}

            {client.notes && (
              <div className="flex items-start gap-3">
                <IconNotes className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-muted-foreground text-sm">
                    {client.notes}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {client.bookings.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm">
                No bookings yet
              </p>
            ) : (
              <div className="space-y-4">
                {client.bookings.slice(0, 5).map((booking: any) => (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 group-hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors pt-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <IconCalendar className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          <p className="text-sm font-medium group-hover:underline decoration-muted-foreground/50 underline-offset-4">
                            {new Date(booking.bookingDate).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {booking.items[0]?.service.name || "No service"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getBookingStatusBadge(booking.bookingStatus)}
                        {getPaymentStatusBadge(booking.paymentStatus)}
                      </div>
                    </div>
                  </Link>
                ))}


                {client._count.bookings > 5 && (
                  <Button variant="link" className="w-full" asChild>
                    <Link href={`/dashboard/bookings?client=${client.id}`}>
                      View all {client._count.bookings} bookings →
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}