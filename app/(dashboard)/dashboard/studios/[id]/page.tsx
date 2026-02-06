// app/(dashboard)/dashboard/studios/[id]/page.tsx
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { StudioDetailView } from "./studio-detail-view"

type Props = {
  params: Promise<{ id: string }>
}

export default async function StudioDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Only Admin can view studio details
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Check studio exists
  const studio = await prisma.studio.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!studio) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <StudioDetailView studioId={id} />
    </div>
  )
}
