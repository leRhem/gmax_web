import { Suspense } from "react"
import { ClientsTable } from "@/components/clients/clients-table"
import { ClientsTableSkeleton } from "@/components/clients/clients-table-skeleton"


export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ClientsPage(props: Props) {

  const searchParams = await props.searchParams;

  const page = parseInt(typeof searchParams.page === 'string' ? searchParams.page : "1");
  const search = typeof searchParams.search === 'string' ? searchParams.search : "";
  const type = typeof searchParams.type === 'string' ? searchParams.type : "";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm">
            Manage your studio clients and their information
          </p>
        </div>
      </div>

      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientsTable
          page={page}
          search={search}
          type={type}
        />
      </Suspense>
    </div>
  )
}