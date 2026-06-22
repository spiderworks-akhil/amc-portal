"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useDomain,
  useUpdateDomain,
  useDeleteDomain,
  useTriggerDomainCheck,
} from "@/hooks/use-domains";
import { useProviders } from "@/hooks/use-providers";
import { formatDate } from "@/lib/format-utils";
import { DomainEditForm } from "@/components/assets/asset-details/domain-edit-form";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailSkeleton } from "@/components/clients/client-details/detail-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/r-alert-dialog";
import { DetailRow, EmptyState } from "@/components/common/detail-row";
import { BackButton } from "@/components/common/back-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  FileText,
  Building2,
  CalendarClock,
  RefreshCw,
  ShieldCheck,
  Clock,
  History,
  Server,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

function getRelativeTime(dateStr: string) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export default function DomainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: domain, isLoading, isError } = useDomain(id);
  const { data: providers } = useProviders();
  const updateMutation = useUpdateDomain();
  const deleteMutation = useDeleteDomain();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !domain) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Globe className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Domain not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The domain you&apos;re looking for doesn&apos;t exist or may have
            been removed.
          </p>
          <BackButton variant="outline" label="Back to Domains" fallbackHref="/domains" />
        </div>
      </div>
    );
  }

  const isExpired =
    domain.days_to_expiry !== null && domain.days_to_expiry <= 0;
  const isExpiringSoon =
    domain.days_to_expiry !== null &&
    domain.days_to_expiry > 0 &&
    domain.days_to_expiry <= 30;
const registrars = providers?.data ?? [];

  const handleEdit = (data: {
    fqdn: string;
    registrar_id?: string;
    registered_date?: string;
    expiry_date?: string;
    auto_renew?: boolean;
    nameservers?: string[];
    notes?: string;
  }) => {
    updateMutation.mutate(
      { id, ...data },
      {
        onSuccess: () => {
          toast.success("Domain updated successfully");
          setEditOpen(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Domain deleted");
        router.push("/domains");
      },
    });
  };

  const handleCopyFqdn = () => {
    navigator.clipboard.writeText(domain.fqdn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <BackButton label="Back to Domains" fallbackHref="/domains" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {domain.fqdn}
              </h1>
              <div className="flex items-center gap-1.5">
                {isExpired && (
                  <Badge variant="dot" size="sm" color="red">
                    Expired
                  </Badge>
                )}
                {isExpiringSoon && !isExpired && (
                  <Badge variant="dot" size="sm" color="amber">
                    {domain.days_to_expiry}d left
                  </Badge>
                )}
                {!isExpired && !isExpiringSoon && domain.expiry_date && (
                  <Badge variant="dot" size="sm" color="emerald">
                    Active
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building2 className="size-4 shrink-0" />
              <button
                type="button"
                onClick={() => router.push(`/assets/${domain.asset_id}`)}
                className="text-primary hover:underline text-left"
              >
                {domain.asset_name}
              </button>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive hover:border-destructive/50"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleCopyFqdn}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          {copied ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Copy className="size-3" />
          )}
          {domain.fqdn}
        </button>
        <a
          href={`https://${domain.fqdn}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          <ExternalLink className="size-3" />
          Visit
        </a>
        {domain.registrar_name && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3" />
            {domain.registrar_name}
          </span>
        )}
        {domain.auto_renew && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <RefreshCw className="size-3" />
            Auto-renew
          </span>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Left: Domain Details */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <DetailRow
                icon={<Globe className="size-4 text-primary" />}
                iconBg="bg-primary/10"
                label="FQDN"
                value={domain.fqdn}
                mono
              />
              {domain.registrar_name && (
                <DetailRow
                  icon={<Building2 className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Registrar"
                  value={domain.registrar_name}
                />
              )}
              <DetailRow
                icon={<Building2 className="size-4 text-primary" />}
                iconBg="bg-primary/10"
                label="Linked Asset"
                value={
                  <button
                    type="button"
                    onClick={() => router.push(`/assets/${domain.asset_id}`)}
                    className="text-primary hover:underline text-left"
                  >
                    {domain.asset_name}
                  </button>
                }
              />
              {domain.registered_date && (
                <DetailRow
                  icon={<CalendarClock className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Registered"
                  value={formatDate(domain.registered_date)}
                />
              )}
              <DetailRow
                icon={<CalendarClock className="size-4 text-primary" />}
                iconBg="bg-primary/10"
                label="Created"
                value={formatDate(domain.created_at)}
              />
            </CardContent>
          </Card>

          {/* Nameservers Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="size-4" />
                Nameservers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {domain.nameservers && domain.nameservers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {domain.nameservers.map((ns, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md border border-border/60 bg-accent/50 px-2.5 py-1 text-xs font-mono"
                    >
                      {ns}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Server className="size-8" />}
                  title="No nameservers"
                  description="Nameservers will appear here once configured."
                />
              )}
            </CardContent>
          </Card>

          {/* Notes Card */}
          {domain.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {domain.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Expiry & Status */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            className={
              isExpired
                ? "border-destructive/30 dark:border-destructive/20"
                : isExpiringSoon
                  ? "border-amber-300/50 dark:border-amber-700/30"
                  : ""
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isExpired ? (
                  <AlertTriangle className="size-4 text-destructive" />
                ) : isExpiringSoon ? (
                  <Clock className="size-4 text-amber-500" />
                ) : (
                  <CalendarClock className="size-4" />
                )}
                Expiry & Renewal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {/* Expiry Date - prominent */}
              <div className="rounded-xl bg-muted/30 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Expiry Date
                  </span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : ""}`}
                    >
                      {domain.expiry_date
                        ? formatDate(domain.expiry_date)
                        : "—"}
                    </span>
                    {domain.days_to_expiry !== null && (
                      <p
                        className={`text-xs mt-0.5 ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                      >
                        {isExpired
                          ? `Expired ${Math.abs(domain.days_to_expiry)} days ago`
                          : `${domain.days_to_expiry} days remaining`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DetailRow
                icon={
                  <RefreshCw
                    className={`size-4 ${domain.auto_renew ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                  />
                }
                iconBg={
                  domain.auto_renew
                    ? "bg-emerald-100 dark:bg-emerald-950/50"
                    : "bg-muted"
                }
                label="Auto-renew"
                value={
                  domain.auto_renew ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Enabled
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Disabled</span>
                  )
                }
              />
              <DetailRow
                icon={<Clock className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Last Checked"
                value={
                  domain.last_checked_at
                    ? formatDate(domain.last_checked_at)
                    : "Never"
                }
              />
              <DetailRow
                icon={<ShieldCheck className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="SSL Certificates"
                value={
                  <span>
                    {domain.ssl_count || domain.sslCertificates?.length || 0}
                    <button
                      onClick={() => {
                        const el = document.getElementById("ssl-section");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="ml-1.5 text-xs text-primary hover:underline"
                    >
                      View
                    </button>
                  </span>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SSL Certificates Section */}
      <Card className="mb-6" id="ssl-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            SSL Certificates
          </CardTitle>
          <CardDescription>
            {!domain.sslCertificates?.length
              ? "No SSL certificates found for this domain"
              : `${domain.sslCertificates.length} certificate${domain.sslCertificates.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!domain.sslCertificates?.length ? (
            <EmptyState
              icon={<ShieldCheck className="size-8" />}
              title="No SSL certificates"
              description="SSL data will appear here when certificates are linked."
            />
          ) : (
            <div className="space-y-3">
              {domain.sslCertificates.map((cert) => {
                const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
                const now = new Date();
                const daysToExpiry = validTo
                  ? Math.ceil(
                      (validTo.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;
                const isCertExpired =
                  daysToExpiry !== null && daysToExpiry <= 0;
                const isCertExpiring =
                  daysToExpiry !== null &&
                  daysToExpiry > 0 &&
                  daysToExpiry <= 30;

                return (
                  <div
                    key={cert.id}
                    className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium truncate">
                            {cert.common_name ||
                              cert.issuer ||
                              "SSL Certificate"}
                          </p>
                          {cert.type && (
                            <span className="inline-flex items-center rounded-md border border-border/50 bg-accent/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground capitalize shrink-0">
                              {cert.type}
                            </span>
                          )}
                          {isCertExpired && (
                            <Badge variant="dot" size="sm" color="red">
                              Expired
                            </Badge>
                          )}
                          {isCertExpiring && !isCertExpired && (
                            <Badge variant="dot" size="sm" color="amber">
                              {daysToExpiry}d left
                            </Badge>
                          )}
                        </div>
                        {cert.issuer && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Issued by {cert.issuer}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                      {cert.valid_from && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">
                            Valid From
                          </span>
                          <span>{formatDate(cert.valid_from)}</span>
                        </div>
                      )}
                      {cert.valid_to && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">
                            Valid To
                          </span>
                          <span
                            className={
                              isCertExpired
                                ? "text-destructive font-medium"
                                : isCertExpiring
                                  ? "text-amber-600 dark:text-amber-400 font-medium"
                                  : ""
                            }
                          >
                            {formatDate(cert.valid_to)}
                            {daysToExpiry !== null && (
                              <span className="ml-1">
                                {isCertExpired
                                  ? "(Expired)"
                                  : `(${daysToExpiry}d)`}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {cert.last_checked_at && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">
                            Last Checked
                          </span>
                          <span>{formatDate(cert.last_checked_at)}</span>
                        </div>
                      )}
                      {cert.sans && cert.sans.length > 0 && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">
                            SANs
                          </span>
                          <span
                            className="truncate block"
                            title={cert.sans.join(", ")}
                          >
                            {cert.sans.length} subject
                            {cert.sans.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    {cert.sans && cert.sans.length > 0 && (
                      <details className="mt-2 group">
                        <summary className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-foreground transition-colors">
                          View all {cert.sans.length} subject alternative names
                        </summary>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {cert.sans.map((san, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md border border-border/50 bg-accent/30 px-1.5 py-0.5 text-[10px] font-mono"
                            >
                              {san}
                            </span>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* WHOIS Snapshots Section — Log view */}
      <Card className="mb-6 p-3">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" />
                WHOIS History
              </CardTitle>
              <CardDescription>
                {!domain.snapshots?.length
                  ? "No WHOIS checks recorded yet"
                  : `${domain.snapshots.length} snapshot${domain.snapshots.length > 1 ? "s" : ""} — most recent first`}
              </CardDescription>
            </div>
            <DomainCheckButton domainId={domain.id} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!domain.snapshots?.length ? (
            <div className="px-6 pb-6 pt-2">
              <EmptyState
                icon={<History className="size-8" />}
                title="No checks yet"
                description="WHOIS snapshots will be recorded when a domain check is triggered."
              />
            </div>
          ) : (
            <ScrollArea className="max-h-[560px]" type="always">
              <div className="font-mono text-[11px] leading-relaxed">
                {/* Column header */}
                <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-2 bg-muted/80 backdrop-blur-sm border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                  <span className="w-[120px] shrink-0">Timestamp</span>
                  <span className="w-[80px] shrink-0">Since</span>
                  <span className="w-[140px] shrink-0">Registrar</span>
                  <span className="w-[110px] shrink-0">Expiry</span>
                  <span className="flex-1 min-w-0">Nameservers</span>
                </div>

                {/* Log entries */}
                {domain.snapshots.map((snapshot, idx) => {
                  const prevSnapshot = idx < domain.snapshots.length - 1
                    ? domain.snapshots[idx + 1]
                    : null;

                  const registrarChanged = prevSnapshot && prevSnapshot.registrar !== snapshot.registrar;
                  const expiryChanged = prevSnapshot && prevSnapshot.expiry_date !== snapshot.expiry_date;
                  const nsChanged = prevSnapshot && JSON.stringify(prevSnapshot.nameservers) !== JSON.stringify(snapshot.nameservers);

                  const timeSince = getRelativeTime(snapshot.checked_at);
                  const logDate = new Date(snapshot.checked_at);
                  const timestamp = logDate.toLocaleString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  }).replace(',', '');

                  return (
                    <div
                      key={snapshot.id}
                      className={`flex items-start gap-3 px-5 py-2.5 border-b border-border/10 transition-colors ${
                        idx === 0
                          ? 'bg-primary/[0.03]'
                          : idx % 2 === 0
                            ? 'bg-background'
                            : 'bg-muted/20'
                      } hover:bg-accent/20`}
                    >
                      {/* Timestamp */}
                      <span className="w-[120px] shrink-0 text-muted-foreground/70 tabular-nums truncate">
                        {timestamp}
                      </span>

                      {/* Relative time */}
                      <span className={`w-[80px] shrink-0 tabular-nums ${idx === 0 ? 'text-foreground font-semibold' : 'text-muted-foreground/60'}`}>
                        {timeSince}
                      </span>

                      {/* Registrar */}
                      <span className="w-[140px] shrink-0 truncate flex items-center gap-1">
                        <span className={registrarChanged ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground/80'}>
                          {snapshot.registrar || (
                            <span className="text-muted-foreground/30 italic">—</span>
                          )}
                        </span>
                        {registrarChanged && (
                          <span className="inline-flex items-center justify-center size-3.5 rounded bg-amber-500/15 text-[8px] font-bold text-amber-600 dark:text-amber-400 shrink-0" title={`Changed from "${prevSnapshot?.registrar}"`}>
                            ~
                          </span>
                        )}
                      </span>

                      {/* Expiry */}
                      <span className={`w-[110px] shrink-0 tabular-nums truncate ${expiryChanged ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground/80'}`}>
                        {snapshot.expiry_date ? formatDate(snapshot.expiry_date) : (
                          <span className="text-muted-foreground/30 italic">—</span>
                        )}
                      </span>

                      {/* Nameservers */}
                      <span className="flex-1 min-w-0 truncate text-muted-foreground/70 flex items-center gap-1">
                        {snapshot.nameservers && snapshot.nameservers.length > 0
                          ? snapshot.nameservers.join(', ')
                          : <span className="text-muted-foreground/30 italic">—</span>
                        }
                        {nsChanged && (
                          <span className="inline-flex items-center justify-center size-3.5 rounded bg-amber-500/15 text-[8px] font-bold text-amber-600 dark:text-amber-400 shrink-0" title="Nameservers changed">
                            ~
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}

                {/* Footer — entry count */}
                <div className="flex items-center gap-2 px-5 py-2.5 text-[10px] text-muted-foreground/40 border-t border-border/10">
                  <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                  {domain.snapshots.length} entr{domain.snapshots.length === 1 ? 'y' : 'ies'} — oldest at bottom
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Drawer */}
      <DomainEditForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        onDelete={() => {
          setEditOpen(false);
          setDeleteOpen(true);
        }}
        isPending={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        domain={domain}
        registrars={registrars}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{domain.fqdn}</strong>?
              This will also remove all associated snapshots. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/80"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DomainCheckButton({ domainId }: { domainId: string }) {
  const checkMutation = useTriggerDomainCheck()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => checkMutation.mutate(domainId)}
      disabled={checkMutation.isPending}
    >
      <RefreshCw className={`size-3.5 mr-1.5 ${checkMutation.isPending ? 'animate-spin' : ''}`} />
      {checkMutation.isPending ? "Checking..." : "Check Now"}
    </Button>
  )
}

