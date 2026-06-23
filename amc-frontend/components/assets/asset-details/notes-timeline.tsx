"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "@/hooks/use-notes";
import {
  Plus,
  Clock,
  MessageSquare,
  Trash2,
  Loader2,
  Check,
  PenLine,
  Quote,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Timeline,
  TimelineItem,
  TimelineDot,
  TimelineContent,
} from "@/components/ui/vertical-timeline";
import { getInitials, cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import type { Note } from "@/types/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NotesTimelineProps {
  noteableType: string;
  noteableId: string;
}

// ── Helpers ──

function formatRelativeDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

function isEdited(note: Note): boolean {
  if (!note.updated_at) return false;
  const created = new Date(note.created_at).getTime();
  const updated = new Date(note.updated_at).getTime();
  return Math.abs(updated - created) > 5000;
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
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [value]);

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
  );
}

// ── Component ──

export function NotesTimeline({
  noteableType,
  noteableId,
}: NotesTimelineProps) {
  const [newNote, setNewNote] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data, isLoading } = useNotes(noteableType, noteableId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const notes = data?.data ?? [];

  // Sort notes: most recent first
  const sortedNotes = [...notes].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const saveEditing = () => {
    if (!editingNoteId || !editContent.trim()) return;
    updateNote.mutate(
      { id: editingNoteId, content: editContent.trim() },
      { onSuccess: cancelEditing },
    );
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEditing();
    }
  };

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    createNote.mutate(
      {
        noteable_type: noteableType,
        noteable_id: noteableId,
        content: newNote.trim(),
      },
      {
        onSuccess: () => {
          setNewNote("");
          setDialogOpen(false);
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-0 border-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-3.5 text-muted-foreground" />
              Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Notes and updates for this {noteableType}
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-3 border-dashed border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-muted-foreground/30 gap-1.5 text-xs"
              >
                <Plus className="size-3" />
                <span className="hidden sm:inline">Add note</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <PenLine className="size-3.5 text-muted-foreground" />
                  Add Note
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Record a note or update for this {noteableType}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <AutoResizeTextarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write your note… (Enter to submit, Shift+Enter for new line)"
                  className="min-h-[140px] w-full bg-background"
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground/40">
                    {newNote.length > 0 && (
                      <>
                        {newNote.length} character
                        {newNote.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNewNote("");
                        setDialogOpen(false);
                      }}
                      className="h-7 text-xs px-3"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSubmit()}
                      disabled={!newNote.trim() || createNote.isPending}
                      className="h-7 text-xs px-3 gap-1"
                    >
                      {createNote.isPending ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Plus className="size-3" />
                      )}
                      Add Note
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex flex-col min-h-0 w-full">

        {/* Timeline */}
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 pl-1">
                <Skeleton className="size-[10px] shrink-0 mt-1.5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-14" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="size-12 rounded-xl bg-muted/40 border border-border/30 flex items-center justify-center mb-3">
              <Quote className="size-5 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-foreground/60">
              No notes yet
            </p>
            <p className="text-xs text-muted-foreground/40 mt-1 text-center max-w-xs">
              Log decisions, track discussions, or record important updates
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 max-h-[60vh] -mx-1 px-1">
            <Timeline>
              {sortedNotes.map((note) => (
                <TimelineItem key={note.id} className="mt-3">
                  <TimelineDot variant="default" />
                  <TimelineContent>
                    <div className="relative rounded-xl border border-border/40 bg-card shadow-sm hover:shadow-md hover:border-primary/20 hover:bg-accent/10 transition-all duration-200 group/card">
                      {/* Left accent bar */}
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary/20 opacity-0 group-hover/card:opacity-100 transition-all duration-200" />
                      {/* Header */}
                      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2 border-b border-border/10">
                        <Avatar className="size-7 ring-2 ring-border/10 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary/70 text-[10px] font-semibold">
                            {getInitials(note.author?.name ?? "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[13px] font-semibold text-foreground/80 truncate max-w-[140px]">
                            {note.author?.name ?? "Unknown"}
                          </span>
                          <span className="text-[9px] text-muted-foreground/25">
                            ·
                          </span>
                          <span
                            className="text-[11px] text-muted-foreground/45 whitespace-nowrap"
                            title={formatFullDate(note.created_at)}
                          >
                            {formatRelativeDate(note.created_at)}
                          </span>
                          {isEdited(note) && (
                            <span
                              className="text-[9px] text-muted-foreground/25 italic"
                              title={`Edited ${formatFullDate(note.updated_at)}`}
                            >
                              (edited)
                            </span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="ml-auto flex items-center gap-1 opacity-40 group-hover/card:opacity-100 transition-all duration-200">
                          <button
                            type="button"
                            onClick={() => startEditing(note)}
                            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-all"
                            aria-label="Edit note"
                          >
                            <PenLine className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNote.mutate(note.id)}
                            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5 transition-all"
                            aria-label="Delete note"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      {editingNoteId === note.id ? (
                        <div className="m-3 rounded-lg border border-primary/20 bg-background shadow-xs overflow-hidden">
                          <AutoResizeTextarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            placeholder="Edit your note…"
                            autoFocus
                            className="min-h-[64px] w-full bg-transparent border-0 focus-visible:ring-0 px-3 py-2 text-sm"
                          />
                          <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 border-t border-border/20 bg-muted/15">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="h-6 px-2.5 text-[11px]"
                              disabled={updateNote.isPending}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={saveEditing}
                              disabled={
                                !editContent.trim() || updateNote.isPending
                              }
                              className="h-6 px-2.5 text-[11px] gap-1"
                            >
                              {updateNote.isPending ? (
                                <Loader2 className="size-2.5 animate-spin" />
                              ) : (
                                <Check className="size-2.5" />
                              )}
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-3">
                          <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                            {note.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </TimelineContent>
                </TimelineItem>
              ))}

              {/* End marker */}
              {notes.length > 0 && (
                <div className="flex items-center gap-4 mt-6 pb-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-border/20 via-border/30 to-border/10" />
                  <div className="flex items-center gap-2">
                    <div className="size-1 rounded-full bg-border/30" />
                    <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/25 uppercase">
                      {notes.length} note{notes.length !== 1 ? "s" : ""}
                    </span>
                    <div className="size-1 rounded-full bg-border/30" />
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-border/10 via-border/30 to-border/20" />
                </div>
              )}
            </Timeline>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
