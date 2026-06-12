import { Suspense } from "react"

import Loading from "@/components/common/loader"
import { ContractsPageContent } from "@/components/contracts/contracts-page-content"

export default function ContractsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContractsPageContent />
    </Suspense>
  )
}
