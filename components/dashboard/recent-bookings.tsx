"use strict";
import { format } from "date-fns"
import { IconCheck, IconClock, IconCreditCard, IconX } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface RecentBooking {
  id: string
  clientName: string
  clientEmail: string | null
  serviceName: string
  date: Date
  status: string
  amount: number
  isPaid: boolean
}

export function RecentBookings({ bookings }: { bookings: RecentBooking[] }) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
        <CardDescription>
          Latest scheduled sessions across all studios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                   No recent bookings found.
                 </TableCell>
               </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {/* Use fallback as primary visual, or use a hashed seed if strictly necessary. 
                            Here we rely on fallback for privacy, or could hash the name. 
                            Using fallback is safer and cleaner unless visual variety is critical. 
                            If variety needed, assume a hash function exists or just use a static non-PII seed like request ID. 
                            User asked to generate initials locally or hash. I'll use initials in fallback and omit Image src or use non-PII seed. */}
                         <AvatarFallback>{booking.clientName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{booking.clientName}</span>
                         <span className="text-xs text-muted-foreground">{booking.clientEmail || "No email"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{booking.serviceName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">{format(new Date(booking.date), "MMM d, yyyy")}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {format(new Date(booking.date), "h:mm a")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={booking.status === "CONFIRMED" ? "default" : booking.status === "COMPLETED" ? "secondary" : "outline"}>
                        {booking.status}
                      </Badge>
                      {booking.isPaid ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/10">
                           <IconCheck className="w-3 h-3 mr-1" /> Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                           <IconClock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₦{booking.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
