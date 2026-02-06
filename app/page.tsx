
export const dynamic = "force-dynamic"

import { ComingSoon } from "@/components/coming-soon"

export default async function HomePage() {
  // Show Coming Soon page for non-authenticated visitors
  return (
    <ComingSoon
      title="Coming Soon"
      description="GMax Studioz is launching soon. Professional photography and videography services are on the way!"
    />
  )
}
