"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { IconPlus, IconSearch, IconFilter, IconEdit, IconTrash, IconUsers } from "@tabler/icons-react"
import { Client, ClientType } from "@/types/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreateClientDialog } from "./create-client-dialog"
import { EditClientDialog } from "./edit-client-dialog"
import { ClientCard } from "./client-card"
import { toast } from "sonner"

interface ClientsTableProps {
  page: number
  search: string
  type: string
}

interface ClientWithCount extends Client {
  _count?: {
    bookings: number
  }
}

export function ClientsTable({ page, search, type }: ClientsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<ClientWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })
  const [searchInput, setSearchInput] = useState(search)

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Fetch clients
  useEffect(() => {
    fetchClients()
  }, [page, search, type])

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchInput !== search) {
        handleSearch(searchInput)
      }
    }, 500) // 500ms delay

    return () => clearTimeout(delayDebounceFn)
  }, [searchInput])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(type && { type }),
      })

      const response = await fetch(`/api/clients?${params}`)
      if (!response.ok) throw new Error("Failed to fetch clients")

      const data = (await response.json()) as any
      setClients(data.clients)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Fetch clients error:", error)
      toast.error("Failed to load clients")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set("search", value)
    } else {
      params.delete("search")
    }
    params.set("page", "1")
    router.push(`/dashboard/clients?${params.toString()}`)
  }

  const handleTypeFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set("type", value)
    } else {
      params.delete("type")
    }
    params.set("page", "1")
    router.push(`/dashboard/clients?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/dashboard/clients?${params.toString()}`)
  }

  const handleEditClick = (client: Client) => {
    setSelectedClient(client)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = (await response.json()) as any
        throw new Error(error.error || "Failed to delete client")
      }

      toast.success("Client deleted successfully")
      fetchClients()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete client")
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={type || "all"} onValueChange={handleTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <IconFilter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="STANDARD">Standard</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="VVIP">VVIP</SelectItem>
              <SelectItem value="CORPORATE">Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <IconPlus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Client Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[200px] rounded-lg border bg-muted/10 animate-pulse"
            />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <IconUsers className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No clients found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Try adjusting your search criteria." : "Add your first client to get started."}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <IconPlus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={handleEditClick}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {clients.length} of {pagination.total} clients
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateClientDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchClients}
      />

      {selectedClient && (
        <EditClientDialog
          client={selectedClient}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={fetchClients}
        />
      )}
    </div>
  )
}