import { Suspense } from "react"
import Loading from "@/components/common/loader"
import { UsersPageContent } from "@/components/users/users-page-content"

export default function UsersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <UsersPageContent />
    </Suspense>
  )
}
