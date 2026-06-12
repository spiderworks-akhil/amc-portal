import { Suspense } from "react"

import Loading from "@/components/common/loader"
import { SslPageContent } from "@/components/ssl-certificates/ssl-page-content"

export default function SslCertificatesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SslPageContent />
    </Suspense>
  )
}
