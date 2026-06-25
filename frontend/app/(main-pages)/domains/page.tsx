import { Suspense } from "react"

import Loading from "@/components/common/loader"
import { DomainsPageContent } from "@/components/domains/domains-page-content"

export default function DomainsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DomainsPageContent />
    </Suspense>
  )
}
