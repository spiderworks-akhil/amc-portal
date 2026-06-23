"use client"

import { useState, useRef, useEffect } from "react"
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes"
import {
  Plus,
  Clock,
  MessageSquare,
  Trash2,
  Loader2,
  CheckCheck,
  PenLine,
  Check,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Timeline, TimelineItem, TimelineDot, TimelineContent } from "@/components/ui/vertical-timeline"
import { getInitials, cn } from "@/lib/utils"
import { formatDistanceToNow, isToday, isYesterday, format, differenceInDays, differenceInWeeks } from "date-fns"
import type { Note } from "@/types/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

interface NotesTimelineProps {
  noteableType: string
  noteableId: string
}

// ── Helpers ──

function getNoteDateLabel(date: Date): string {
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"

  const daysAgo = differenceInDays(new Date(), date)
  if (daysAgo <= 7) return "This Week"

  const weeksAgo = differenceInWeeks(new Date(), date)
  if (weeksAgo <= 2) return "Last Week"

  if (daysAgo <= 30) return `${Math.floor(daysAgo / 7)} Weeks Ago`

  return format(date, "MMMM yyyy")
}

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateStr
  }
}

function formatFullDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return format(date, "MMM d, yyyy 'at' h:mm a")
  } catch {
    return dateStr
  }
}

function isEdited(note: Note): boolean {
  if (!note.updated_at) return false
  const created = new Date(note.created_at).getTime()
  const updated = new Date(note.updated_at).getTime()
  // Consider it edited if the update time is more than 5 seconds after creation
  return Math.abs(updated - created) > 5000
}

// ── Group Notes ──

interface DateGroup {
  label: string
  notes: Note[]
}

function groupNotesByDate(notes: Note[]): DateGroup[] {
  const groups: Record<string, Note[]> = {}

  for (const note of notes) {
    const date = new Date(note.created_at)
    const label = getNoteDateLabel(date)

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(note)
  }

  // Sort groups: custom order
  const order = ["Today", "Yesterday", "This Week", "Last Week"]
  const keys = Object.keys(groups)

  const sortedKeys = keys.sort((a, b) => {
    const aIdx = order.indexOf(a)
    const bIdx = order.indexOf(b)

    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1

    // For month/year groups, sort by descending date
    try {
      const dateA = new Date(groups[a][0].created_at)
      const dateB = new Date(groups[b][0].created_at)
      return dateB.getTime() - dateA.getTime()
    } catch {
      return a.localeCompare(b)
    }
  })

  return sortedKeys.map((label) => ({
    label,
    notes: groups[label],
  }))
}

// ── Auto-resize textarea ──

function AutoResizeTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  autoFocus,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  className?: string
  autoFocus?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      autoFocus={autoFocus}
      className={cn(
        "flex-1 min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed resize-none overflow-hidden",
        className,
      )}
    />
  )
}



// ── Component ──

export function NotesTimeline({ noteableType, noteableId }: NotesTimelineProps) {
  const [newNote, setNewNote] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditContent("")
  }

  const saveEditing = () => {
    if (!editingNoteId || !editContent.trim()) return
    updateNote.mutate(
      { id: editingNoteId, content: editContent.trim() },
      {
        onSuccess: () => {
          cancelEditing()
        },
      },
    )
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      cancelEditing()
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      saveEditing()
    }
  }
  const { data, isLoading } = useNotes(noteableType, noteableId)
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const timelineRef = useRef<HTMLDivElement>(null)

  const notes = data?.data ?? []

  const handleSubmit = (closeDialog = true) => {
    if (!newNote.trim()) return
    createNote.mutate(
      {
        noteable_type: noteableType,
        noteable_id: noteableId,
        content: newNote.trim(),
      },
      {
        onSuccess: () => {
          setNewNote("")
          if (closeDialog) setDialogOpen(false)
          // Scroll to top after adding a new note
          setTimeout(() => {
            timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }, 100)
        },
      },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Scroll to top when notes change (new note added)
  const prevLengthRef = useRef(notes.length)
  useEffect(() => {
    if (notes.length > prevLengthRef.current) {
      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    prevLengthRef.current = notes.length
  }, [notes.length])

  const groupedNotes = groupNotesByDate(notes)

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              Activity Timeline
            </CardTitle>
            <CardDescription>
              Notes and activity history for this {noteableType}.
            </CardDescription>
          </div>
          {notes.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {notes.length} note{notes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* ── Add Note (Dialog Trigger) ── */}
        <div className="mb-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="h-9 border-dashed border-border/60 text-primary-foreground hover:text-foreground hover:border-border justify-start gap-2"
              >
                <PenLine className="size-3.5" />
                Add a note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PenLine className="size-4 text-primary" />
                  Add Note
                </DialogTitle>
                <DialogDescription>
                  Add a note to the activity timeline for this {noteableType}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <AutoResizeTextarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write your note... (Enter to submit, Shift+Enter for new line)"
                  className="min-h-[160px] w-full bg-background border-border/60 focus-visible:border-primary/50"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground/60">
                    {newNote.length > 0 && (
                      <>{newNote.length} character{newNote.length !== 1 ? "s" : ""}</>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNewNote("")
                        setDialogOpen(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSubmit()}
                      disabled={!newNote.trim() || createNote.isPending}
                    >
                      {createNote.isPending ? (
                        <Loader2 className="size-3.5 animate-spin mr-1" />
                      ) : (
                        <Plus className="size-3.5 mr-1" />
                      )}
                      Add Note
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Timeline ── */}
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-[14px] shrink-0 mt-1 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="size-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No notes yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 text-center max-w-xs">
              Add a note above to start the activity timeline. Notes help you track
              discussions, decisions, and important updates.
            </p>
          </div>
        ) : (
          <Timeline >
            {groupedNotes.map((group) => (
              <div key={group.label} className="mb-6 last:mb-0">
                {/* Date Header */}
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-card z-20 pb-1">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>

                {/* Notes */}
                <div className="relative space-y-4">
                  {group.notes.map((note, index) => {
                    const isLast = index === group.notes.length - 1 && group === groupedNotes[groupedNotes.length - 1]

                    return (
                      <TimelineItem
                        isLast={index === group.notes.length - 1 && group === groupedNotes[groupedNotes.length - 1]}
                      >
                        {/* Dot */}
                        <TimelineDot variant="muted" />

                        {/* Content Card */}
                        <TimelineContent>
                          {/* Header: Avatar + Name + Timestamp */}
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar size="sm" className="ring-1 ring-border/30">
                              <AvatarFallback className="bg-primary/5 text-primary font-semibold">
                                {getInitials(note.author?.name ?? "U")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {note.author?.name ?? "Unknown User"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">·</span>
                            <span
                              className="text-xs text-muted-foreground/60"
                              title={formatFullDate(note.created_at)}
                            >
                              {formatRelativeDate(note.created_at)}
                            </span>
                            {isEdited(note) && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/40"
                                title={`Edited ${formatFullDate(note.updated_at)}`}
                              >
                                <CheckCheck className="size-2.5" />
                                edited
                              </span>
                            )}
                          </div>

                          {/* Note Content */}
                          <div className="ml-8 relative">
                            {editingNoteId === note.id ? (
                              <div className="rounded-lg border border-primary/40 bg-background shadow-sm transition-colors">
                                <AutoResizeTextarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onKeyDown={handleEditKeyDown}
                                  placeholder="Edit your note..."
                                  autoFocus
                                  className="min-h-[80px] w-full bg-transparent border-0 focus-visible:ring-0 px-3.5 py-2.5"
                                />
                                <div className="flex items-center justify-end gap-1.5 px-3 pb-2.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={cancelEditing}
                                    className="h-7 px-2 text-xs"
                                    disabled={updateNote.isPending}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    type="button"
                                    onClick={saveEditing}
                                    disabled={!editContent.trim() || updateNote.isPending}
                                    className="h-7 px-2.5 text-xs gap-1"
                                  >
                                    {updateNote.isPending ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <Check className="size-3" />
                                    )}
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="rounded-lg border border-border/50 bg-muted/20 px-3.5 py-2.5 group-hover:bg-muted/30 transition-colors">
                                  <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
                                    {note.content}
                                  </p>
                                </div>

                                {/* Action buttons */}
                                <div className="absolute -right-1.5 -top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    type="button"
                                    onClick={() => startEditing(note)}
                                    className="p-1 rounded-md bg-background border border-border/60 text-muted-foreground/40 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all shadow-sm"
                                    aria-label="Edit note"
                                  >
                                    <PenLine className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteNote.mutate(note.id)}
                                    className="p-1 rounded-md bg-background border border-border/60 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all shadow-sm"
                                    aria-label="Delete note"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </TimelineContent>
                      </TimelineItem>
                    )
                  })}
                </div>
              </div>
            ))}
          </Timeline>
        )}

        {/* End marker */}
        {notes.length > 0 && (
          <div className="flex items-center gap-2 mt-6 pt-1">
            <div className="size-[6px] rounded-full bg-border/40 shrink-0" />
            <div className="h-px flex-1 bg-border/20" />
            <span className="text-[10px] text-muted-foreground/30">
              End of timeline
            </span>
            <div className="h-px flex-1 bg-border/20" />
            <div className="size-[6px] rounded-full bg-border/40 shrink-0" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
