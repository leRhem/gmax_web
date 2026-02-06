// app/(dashboard)/dashboard/payments/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  IconCurrencyNaira,
  IconExternalLink,
  IconAlertTriangle,
  IconCash,
  IconReceipt,
} from "@tabler/icons-react"

interface BookingWithRelations {
  id: string
  bookingDate: Date
  client: { id: string; name: string; phone: string }
  items: { priceSnapshot: unknown; quantity: number }[]
  payments: { amount: unknown }[]
}

async function getPaymentStats(studioId: string | null | undefined, role: string) {
  // Build where clause dynamically
  const whereConditions: Record<string, unknown> = { 
    bookingStatus: { not: "CANCELLED" } 
  }
  
  // Only filter by studio if not an admin
  if (role !== "ADMIN" && studioId) {
    whereConditions.studioId = studioId
  }

  // Get all non-cancelled bookings with their payments
  const bookings = await prisma.booking.findMany({
    where: whereConditions,
    include: {
      client: { select: { id: true, name: true, phone: true } },
      items: { select: { priceSnapshot: true, quantity: true } },
      payments: { 
        where: { status: "COMPLETED" },
        select: { amount: true } 
      },
    },
    orderBy: { bookingDate: "desc" },
  }) as unknown as BookingWithRelations[]

  // Calculate outstanding balances
  const bookingsWithBalance = bookings.map((booking) => {
    const totalAmount = booking.items.reduce(
      (sum: number, item: { priceSnapshot: unknown; quantity: number }) => 
        sum + Number(item.priceSnapshot) * item.quantity,
      0
    )
    const paidAmount = booking.payments.reduce(
      (sum: number, p: { amount: unknown }) => sum + Number(p.amount),
      0
    )
    return {
      id: booking.id,
      bookingDate: booking.bookingDate,
      client: booking.client,
      totalAmount,
      paidAmount,
      balance: totalAmount - paidAmount,
    }
  })

  // Filter to only show bookings with outstanding balance
  const outstandingBookings = bookingsWithBalance
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance) // Sort by balance descending

  // Calculate totals
  const totalOutstanding = outstandingBookings.reduce((sum: number, b) => sum + b.balance, 0)
  const totalRevenue = bookingsWithBalance.reduce((sum: number, b) => sum + b.paidAmount, 0)
  const totalExpected = bookingsWithBalance.reduce((sum: number, b) => sum + b.totalAmount, 0)

  return {
    outstandingBookings,
    stats: {
      totalOutstanding,
      totalRevenue,
      totalExpected,
      outstandingCount: outstandingBookings.length,
      collectionRate: totalExpected > 0 ? Math.round((totalRevenue / totalExpected) * 100) : 0,
    },
  }
}

export default async function PaymentsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const userRole = session.user.role
  if (!userRole) {
    redirect("/login")
  }

  // Only ADMIN, MANAGER, RECEPTIONIST can access payments
  const allowedRoles = ["ADMIN", "MANAGER", "RECEPTIONIST"]
  if (!allowedRoles.includes(userRole)) {
    redirect("/dashboard")
  }

  const { outstandingBookings, stats } = await getPaymentStats(
    session.user.studioId,
    userRole
  )

  const getPaymentStatusColor = (balance: number, total: number) => {
    const paidPercentage = ((total - balance) / total) * 100
    if (paidPercentage === 0) return "bg-red-100 text-red-700"
    if (paidPercentage < 50) return "bg-orange-100 text-orange-700"
    return "bg-yellow-100 text-yellow-700"
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground text-sm">
            Track and manage outstanding payments
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IconAlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-2xl font-bold text-orange-600">
              <IconCurrencyNaira className="h-6 w-6" />
              {stats.totalOutstanding.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.outstandingCount} booking{stats.outstandingCount !== 1 ? "s" : ""} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <IconCash className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-2xl font-bold text-green-600">
              <IconCurrencyNaira className="h-6 w-6" />
              {stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
            <IconReceipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-2xl font-bold">
              <IconCurrencyNaira className="h-6 w-6" />
              {stats.totalExpected.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From all bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collectionRate}%</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${stats.collectionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Payments</CardTitle>
          <CardDescription>
            Bookings with pending balance, sorted by amount owed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outstandingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconCash className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No outstanding payments at the moment.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Booking Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.client.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {booking.client.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.bookingDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <IconCurrencyNaira className="h-4 w-4" />
                        {booking.totalAmount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      <div className="flex items-center justify-end">
                        <IconCurrencyNaira className="h-4 w-4" />
                        {booking.paidAmount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">
                      <div className="flex items-center justify-end">
                        <IconCurrencyNaira className="h-4 w-4" />
                        {booking.balance.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getPaymentStatusColor(
                          booking.balance,
                          booking.totalAmount
                        )}
                      >
                        {Math.round(
                          ((booking.totalAmount - booking.balance) /
                            booking.totalAmount) *
                            100
                        )}
                        % Paid
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/bookings/${booking.id}`}>
                          <IconExternalLink className="mr-1 h-3 w-3" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
