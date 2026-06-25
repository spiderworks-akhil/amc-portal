import { Suspense } from "react"
import { AssetsPageContent } from "@/components/assets/assets-page-content"
import Loading from "@/components/common/loader"

export default function ProjectsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AssetsPageContent />
    </Suspense>
  )
}
