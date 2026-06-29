import { Suspense } from "react"
import { ProjectsPageContent } from "@/components/projects/projects-page-content"
import Loading from "@/components/common/loader"

export default function ProjectsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProjectsPageContent />
    </Suspense>
  )
}
