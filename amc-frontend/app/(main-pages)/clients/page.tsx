import { Suspense } from "react"
import { ClientsPageContent } from "@/components/clients/clients-page-content"
import Loading from "@/components/common/loader"

export default function ClientsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClientsPageContent />
    </Suspense>
  )
}
