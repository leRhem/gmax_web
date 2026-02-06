import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { EditClientForm } from "@/components/clients/edit-client-form"
import { Client } from "@/types/client"

async function getClient(id: string): Promise<Client | null> {
  const client = await prisma.client.findUnique({
    where: { id },
  })
  if (!client) return null
  
  // Convert Prisma types to match Client interface
  return {
    ...client,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ClientEditPage(props: Props) {
  const params = await props.params;
  const session = await auth()
  if (!session?.user) {
    return null
  }

  // Check role - only ADMIN, MANAGER, RECEPTIONIST can edit
  const allowedRoles = ["ADMIN", "MANAGER", "RECEPTIONIST"]
  if (!allowedRoles.includes(session.user.role)) {
    notFound()
  }

  const client = await getClient(params.id)

  if (!client) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
        <p className="text-muted-foreground text-sm">
          Update client information
        </p>
      </div>

      <EditClientForm client={client} />
    </div>
  )
}