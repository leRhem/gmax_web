import { Suspense } from "react"
import { UpdateCredentialsForm } from "./update-form"
import { IconShieldLock } from "@tabler/icons-react"

export default function UpdateCredentialsPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                <IconShieldLock className="h-10 w-10 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Update Credentials
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your new password below to secure your account.
            </p>
          </div>
          <Suspense fallback={<div>Loading...</div>}>
            <UpdateCredentialsForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
