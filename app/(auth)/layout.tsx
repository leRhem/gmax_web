import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "GMAX Studio - Login",
  description: "Photography Studio Management System",
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
