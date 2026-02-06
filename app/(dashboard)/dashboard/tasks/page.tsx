// app/(dashboard)/dashboard/tasks/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TasksView } from "./tasks-view"

export default async function TasksPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <TasksView
        userRole={session.user.role as string}
        userId={session.user.id as string}
        userStudioId={session.user.studioId as string | undefined}
      />
    </div>
  )
}
