import { Suspense } from "react"

import Loading from "@/components/common/loader"
import { ServersPageContent } from "@/components/servers/servers-page-content"

export default function ServersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ServersPageContent />
    </Suspense>
  )
}
