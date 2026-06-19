import { Suspense } from "react"
import { RemindersPageContent } from "@/components/reminders/reminders-page-content"
import Loading from "@/components/common/loader"

export default function RemindersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RemindersPageContent />
    </Suspense>
  )
}
