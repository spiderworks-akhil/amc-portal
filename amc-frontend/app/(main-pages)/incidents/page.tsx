import { Suspense } from "react"
import { IncidentsPageContent } from "./incidents-page-content"
import Loading from "@/components/common/loader"

export default function IncidentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <IncidentsPageContent />
    </Suspense>
  )
}
