"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

/**
 * Client component that checks for unauthorized access redirects
 * and shows a toast notification when the user lacks permission
 */
export function UnauthorizedHandler() {
    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        const unauthorized = searchParams.get("unauthorized")
        const attemptedPath = searchParams.get("attempted")

        if (unauthorized === "true") {
            // Show toast notification
            toast.error("Access Denied", {
                description: attemptedPath
                    ? `You don't have permission to access ${attemptedPath}`
                    : "You don't have permission to access that page",
                duration: 4000,
            })

            // Clean up URL by removing query params
            const url = new URL(window.location.href)
            url.searchParams.delete("unauthorized")
            url.searchParams.delete("attempted")
            router.replace(url.pathname, { scroll: false })
        }
    }, [searchParams, router])

    return null
}
