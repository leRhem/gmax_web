"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { IconEdit } from "@tabler/icons-react"
import { EditClientDialog } from "@/components/clients/edit-client-dialog"
import { Client } from "@/types/client"

interface ClientPageActionsProps {
  client: Client
}

export function ClientPageActions({ client }: ClientPageActionsProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setOpen(false) // Close the modal
    router.refresh() // Refresh the server page data to show new edits immediately
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <IconEdit className="mr-2 h-4 w-4" />
        Edit Client
      </Button>

      <EditClientDialog
        client={client}
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
      />
    </>
  )
}