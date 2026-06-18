import { Suspense } from "react"
import { MonitorsPageContent } from "@/components/monitors/monitors-page-content"
import Loading from "@/components/common/loader"

export default function MonitorsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MonitorsPageContent />
    </Suspense>
  )
}
