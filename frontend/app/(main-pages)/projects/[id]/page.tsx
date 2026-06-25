"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useAsset,
  useUpdateAsset,
  useAssetContracts,
} from "@/hooks/use-assets";
import { useClient } from "@/hooks/use-clients";
import { useProviders } from "@/hooks/use-providers";
import { useCreateProvider } from "@/hooks/use-create-provider";
import { useCreateServer, useLinkAssetToServer } from "@/hooks/use-servers";
import {
  useCreateContract,
  useLinkAssetToContract,
} from "@/hooks/use-contracts";
import {
  useCreateDomain,
  useUpdateDomain,
  useDeleteDomain,
} from "@/hooks/use-domains";
import { useCreateSsl, useUpdateSsl, useDeleteSsl } from "@/hooks/use-ssl";
import { useMonitorsByAsset, useCreateMonitor } from "@/hooks/use-monitors";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DetailSkeleton } from "@/components/clients/client-details/detail-skeleton";
import { ServerCreateDrawer } from "@/components/servers/server-create-drawer";
import { ContractCreateDrawer } from "@/components/contracts/contract-create-drawer";
import { CreateDomainForm } from "@/components/assets/asset-details/create-domain-form";
import { CreateSslForm } from "@/components/assets/asset-details/create-ssl-form";
import { DomainEditForm } from "@/components/assets/asset-details/domain-edit-form";
import { SslEditForm } from "@/components/assets/asset-details/ssl-edit-form";
import { CreateProviderDialog } from "@/components/providers/create-provider-dialog";
import { MonitorCreateDrawer } from "@/components/monitors/monitor-create-drawer";
import { formatDate, formatCurrency } from "@/lib/format-utils";
import type { AssetDetail } from "@/types/api";
import { BackButton } from "@/components/common/back-button";
import {
  Monitor,
  FileText,
  User,
  Mail,
  Building2,
  Server,
  CalendarClock,
  Clock,
  DollarSign,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe2,
  ShieldCheck,
  Layers,
  Cpu,
  Pencil,
  Activity,
  Users,
  Contact,
  Phone,
  Check,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { AccountManager, Contact as ContactType } from "@/types/api";
import { ScopesSection } from "@/components/assets/asset-details/scopes-section";
import { NotesTimeline } from "@/components/assets/asset-details/notes-timeline";
import { AssetEditForm } from "@/components/assets/asset-details/asset-edit-form";
import Link from "next/link";

const STATUS_COLORS: Record<string, "emerald" | "amber" | "blue" | "gray"> = {
  live: "emerald",
  staging: "amber",
  development: "blue",
  parked: "gray",
};

const STATUS_LABELS: Record<string, string> = {
  live: "Live",
  staging: "Staging",
  development: "Development",
  parked: "Parked",
};

const CONTRACT_STATUS_COLORS: Record<
  string,
  "emerald" | "amber" | "blue" | "gray" | "red"
> = {
  active: "emerald",
  expiring: "amber",
  expired: "red",
  draft: "blue",
  terminated: "gray",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: asset, isLoading, isError } = useAsset(id);
  const { data: assetClient } = useClient(asset?.client_id ?? null);
  const { data: contractsData, isLoading: contractsLoading } =
    useAssetContracts(id);
  const { data: providersData, refetch: refetchProviders } = useProviders();
  const updateAsset = useUpdateAsset();
  const createServer = useCreateServer();
  const linkAssetToServer = useLinkAssetToServer();
  const createContract = useCreateContract();
  const linkAssetToContract = useLinkAssetToContract();
  const createDomain = useCreateDomain();
  const updateDomain = useUpdateDomain();
  const deleteDomain = useDeleteDomain();
  const createSsl = useCreateSsl();
  const updateSsl = useUpdateSsl();
  const deleteSsl = useDeleteSsl();
  const createProvider = useCreateProvider();
  const { data: monitorsData, isLoading: monitorsLoading } =
    useMonitorsByAsset(id);
  const createMonitor = useCreateMonitor();

  const [editOpen, setEditOpen] = useState(false);
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [createContractOpen, setCreateContractOpen] = useState(false);
  const [createDomainOpen, setCreateDomainOpen] = useState(false);
  const [createSslOpen, setCreateSslOpen] = useState(false);
  const [createProviderOpen, setCreateProviderOpen] = useState(false);
  const [editDomainOpen, setEditDomainOpen] = useState(false);
  const [editSslOpen, setEditSslOpen] = useState(false);
  const [createMonitorOpen, setCreateMonitorOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<
    AssetDetail["domains"][number] | null
  >(null);
  const [editingSsl, setEditingSsl] = useState<
    AssetDetail["ssl_certificates"][number] | null
  >(null);

  const handleUpdateAsset = useCallback(
    (data: {
      name: string;
      primary_contact_name?: string;
      primary_contact_email?: string;
      status?: string;
      monitoring_enabled?: boolean;
      notes?: string;
    }) => {
      updateAsset.mutate(
        { id, ...data },
        { onSuccess: () => setEditOpen(false) },
      );
    },
    [id, updateAsset],
  );

  const handleCreateServer = useCallback(
    (data: {
      provider_id: string;
      label: string;
      ip_addresses?: string[];
      region?: string;
      operating_system?: string;
      panel_url?: string;
      monthly_cost?: number;
      currency?: string;
      renewal_date?: string;
      notes?: string;
    }) => {
      createServer.mutate(data, {
        onSuccess: (result) => {
          const serverId = result.data.id;
          linkAssetToServer.mutate(
            { serverId, asset_ids: [id] },
            { onSuccess: () => setCreateServerOpen(false) },
          );
        },
      });
    },
    [id, createServer, linkAssetToServer],
  );

  const handleCreateContract = useCallback(
    (data: {
      client_id: string;
      contract_number?: string;
      billing_cycle: string;
      start_date: string;
      end_date: string;
      renewal_date: string;
      amount?: number;
      currency?: string;
      auto_renew?: boolean;
      scope?: string;
      status?: string;
    }) => {
      createContract.mutate(data, {
        onSuccess: (result) => {
          const contractId = result.data.id;
          linkAssetToContract.mutate(
            { contractId, asset_ids: [id] },
            { onSuccess: () => setCreateContractOpen(false) },
          );
        },
      });
    },
    [id, createContract, linkAssetToContract],
  );

  const handleUpdateDomain = useCallback(
    (data: {
      fqdn: string;
      registrar_id?: string;
      registered_date?: string;
      expiry_date?: string;
      auto_renew?: boolean;
      nameservers?: string[];
      notes?: string;
    }) => {
      if (!editingDomain) return;
      updateDomain.mutate(
        { id: editingDomain.id, ...data },
        { onSuccess: () => setEditDomainOpen(false) },
      );
    },
    [editingDomain, updateDomain],
  );

  const handleDeleteDomain = useCallback(() => {
    if (!editingDomain) return;
    deleteDomain.mutate(editingDomain.id, {
      onSuccess: () => setEditDomainOpen(false),
    });
  }, [editingDomain, deleteDomain]);

  const handleUpdateSsl = useCallback(
    (data: {
      common_name?: string;
      issuer?: string;
      sans?: string[];
      valid_from?: string;
      valid_to?: string;
      type?: string;
    }) => {
      if (!editingSsl) return;
      updateSsl.mutate(
        { id: editingSsl.id, ...data },
        { onSuccess: () => setEditSslOpen(false) },
      );
    },
    [editingSsl, updateSsl],
  );

  const handleDeleteSsl = useCallback(() => {
    if (!editingSsl) return;
    deleteSsl.mutate(editingSsl.id, {
      onSuccess: () => setEditSslOpen(false),
    });
  }, [editingSsl, deleteSsl]);

  const handleCreateDomain = useCallback(
    (data: {
      asset_id: string;
      fqdn: string;
      registrar_id?: string;
      registered_date?: string;
      expiry_date?: string;
      auto_renew?: boolean;
      nameservers?: string[];
      notes?: string;
    }) => {
      createDomain.mutate(data, {
        onSuccess: () => setCreateDomainOpen(false),
      });
    },
    [createDomain],
  );

  const handleCreateSsl = useCallback(
    (data: {
      domain_id: string;
      asset_id?: string;
      common_name?: string;
      issuer?: string;
      sans?: string[];
      valid_from?: string;
      valid_to?: string;
      type?: string;
    }) => {
      createSsl.mutate(data, {
        onSuccess: () => setCreateSslOpen(false),
      });
    },
    [createSsl],
  );



  const handleCreateMonitor = useCallback(
    (data: {
      asset_id: string;
      name: string;
      check_type: string;
      target: string;
      interval_seconds?: number;
      expected_status_code?: number;
      expected_keyword?: string;
      enabled?: boolean;
    }) => {
      createMonitor.mutate(data as import("@/types/api").CreateMonitorPayload, {
        onSuccess: () => setCreateMonitorOpen(false),
      });
    },
    [createMonitor],
  );

  const isCreatingServer =
    createServer.isPending || linkAssetToServer.isPending;
  const isCreatingContract =
    createContract.isPending || linkAssetToContract.isPending;
  const isCreatingDomain = createDomain.isPending;
  const isCreatingSsl = createSsl.isPending;
  const isUpdatingDomain = updateDomain.isPending;
  const isDeletingDomain = deleteDomain.isPending;
  const isUpdatingSsl = updateSsl.isPending;
  const isDeletingSsl = deleteSsl.isPending;

  const isCreatingMonitor = createMonitor.isPending;

  // Filter providers to get registrars for domain creation
  const registrars = (providersData?.data ?? []).filter(
    (p) => p.type === "registrar",
  );

  if (isLoading) return <DetailSkeleton />;

  if (isError || !asset) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <FileText className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Project not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The project you&apos;re looking for doesn&apos;t exist or may have
            been removed.
          </p>
          <BackButton
            variant="outline"
            label="Back to Projects"
            fallbackHref="/projects"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <BackButton label="Back to Projects" fallbackHref="/projects" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {asset.name}
              </h1>
              <Badge
                variant="dot"
                size="sm"
                color={STATUS_COLORS[asset.status] ?? "gray"}
              >
                {STATUS_LABELS[asset.status] ?? asset.status}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <FileText className="size-4 shrink-0" />
              <span>{asset.type_name}</span>
              <span className="text-muted-foreground/50 mx-1">·</span>
              <Building2 className="size-4 shrink-0" />
              <span className="truncate">{asset.client_name}</span>
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <Monitor className="size-3.5 mr-1.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Overview Section */}
      {(() => {
        const now = new Date();

        // Compute health data from domains
        const expiredDomains = asset.domains.filter(
          (d) => d.expiry_date && new Date(d.expiry_date) <= now,
        ).length;
        const expiringDomains = asset.domains.filter((d) => {
          if (!d.expiry_date) return false;
          const days = Math.ceil(
            (new Date(d.expiry_date).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return days > 0 && days <= 30;
        }).length;

        // Compute health data from SSL
        const expiredSsl = asset.ssl_certificates.filter(
          (c) => c.valid_to && new Date(c.valid_to) <= now,
        ).length;
        const expiringSsl = asset.ssl_certificates.filter((c) => {
          if (!c.valid_to) return false;
          const days = Math.ceil(
            (new Date(c.valid_to).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return days > 0 && days <= 30;
        }).length;

        // Compute health data from monitors
        const monitors = monitorsData?.data ?? [];
        const monitorsUp = monitors.filter(
          (m) => m.current_status === "up",
        ).length;
        const monitorsDown = monitors.filter(
          (m) => m.current_status === "down",
        ).length;

        const totalItems =
          asset.domains.length +
          asset.ssl_certificates.length +
          asset.servers.length +
          monitors.length +
          (contractsData?.data?.length ?? 0);
        const needsAttention =
          expiredDomains +
          expiringDomains +
          expiredSsl +
          expiringSsl +
          monitorsDown;

        // Compute health score (0-100)
        const totalChecks =
          asset.domains.length + asset.ssl_certificates.length;
        const totalIssues =
          expiredDomains + expiringDomains + expiredSsl + expiringSsl;
        const healthScore =
          totalChecks > 0
            ? Math.round(((totalChecks - totalIssues) / totalChecks) * 100)
            : 100;

        return (
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="size-4" />
                Overview
              </CardTitle>
              <CardDescription>
                Quick snapshot of project health and linked resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-stretch gap-4">
                {/* Health Score */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 lg:flex-1">
                  <div className="relative size-12 shrink-0">
                    <svg className="size-12 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="currentColor"
                        className="text-muted/50"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="currentColor"
                        className={
                          healthScore >= 80
                            ? "text-emerald-500"
                            : healthScore >= 50
                              ? "text-amber-500"
                              : "text-red-500"
                        }
                        strokeWidth="3"
                        strokeDasharray={`${(healthScore / 100) * 97.4} 97.4`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      className={`absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums ${
                        healthScore >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : healthScore >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {healthScore}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium leading-none">
                      Health
                    </p>
                    <p className="text-sm font-semibold mt-1 leading-snug">
                      {healthScore >= 80
                        ? "Good"
                        : healthScore >= 50
                          ? "Fair"
                          : "Poor"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      {totalIssues} issue{totalIssues !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Needs Attention */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 lg:flex-1">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                      needsAttention > 0
                        ? "bg-amber-50 dark:bg-amber-950/30"
                        : "bg-emerald-50 dark:bg-emerald-950/30"
                    }`}
                  >
                    {needsAttention > 0 ? (
                      <AlertTriangle
                        className={`size-5 ${
                          needsAttention > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      />
                    ) : (
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium leading-none">
                      Needs Attention
                    </p>
                    <p
                      className={`text-lg font-bold leading-snug mt-0.5 ${
                        needsAttention > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {needsAttention}
                    </p>
                  </div>
                </div>

                {/* Total Items */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 lg:flex-1">
                  <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                    <Layers className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium leading-none">
                      Total Resources
                    </p>
                    <p className="text-lg font-bold leading-snug mt-0.5 text-blue-600 dark:text-blue-400">
                      {totalItems}
                    </p>
                  </div>
                </div>

                {/* Monitor Status */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 lg:flex-1">
                  <div className="size-10 rounded-full bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
                    <Activity className="size-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium leading-none">
                      Monitors
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {monitors.length > 0 ? (
                        <>
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {monitorsUp}
                          </span>
                          {monitorsDown > 0 && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                              <span className="size-1.5 rounded-full bg-red-500" />
                              {monitorsDown}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Two-column layout: Project Info + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Row 1: Project Details + Status */}
        <div className="lg:col-span-3 space-y-6">
          {/* Main Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">


              {/* Contact row */}
              {asset.primary_contact_name && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="size-4 text-primary" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-xs text-muted-foreground font-medium leading-none mb-1">
                      Contact
                    </p>
                    <p className="text-sm">{asset.primary_contact_name}</p>
                    {asset.primary_contact_email && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Mail className="size-3 shrink-0 text-muted-foreground" />
                        <a
                          href={`mailto:${asset.primary_contact_email}`}
                          className="text-xs text-primary hover:underline truncate"
                        >
                          {asset.primary_contact_email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Client + Created side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-xs text-muted-foreground font-medium leading-none mb-1">
                      Client
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push(`/clients/${asset.client_id}`)}
                      className="text-sm text-primary hover:underline text-left leading-snug"
                    >
                      {asset.client_name}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarClock className="size-4 text-primary" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-xs text-muted-foreground font-medium leading-none mb-1">
                      Created
                    </p>
                    <p className="text-sm leading-snug">
                      {formatDate(asset.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tech Stack */}
              {asset.tech_stack && asset.tech_stack.length > 0 && (
                <div className="flex items-start gap-3 pt-1 border-t border-border/40">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Layers className="size-4 text-primary" />
                  </div>
                  <div className="pt-0.5 min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium leading-none mb-2">
                      Tech Stack
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {asset.tech_stack.map((tech, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full border border-border/60 bg-accent/50 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-xs"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg leading-none">
                <Activity className="size-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
         
              <div className="flex items-center justify-between min-h-9">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium capitalize leading-none">
                  {asset.type_name}
                </span>
              </div>
              <div className="flex items-center justify-between min-h-9">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="dot"
                  size="sm"
                  color={STATUS_COLORS[asset.status] ?? "gray"}
                >
                  {STATUS_LABELS[asset.status] ?? asset.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Team section full width */}
        <div className="lg:col-span-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Account Managers Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="size-3.5 text-muted-foreground" />
                  Account Managers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {asset.account_managers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="size-6 mx-auto mb-1.5 opacity-30" />
                    <p className="text-xs">No managers assigned to this client</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {asset.account_managers.map((manager: AccountManager) => (
                      <div
                        key={manager.id}
                        className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent/50"
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {getInitials(manager.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {manager.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {manager.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Contacts Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Contact className="size-3.5 text-muted-foreground" />
                  Client Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {asset.contacts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Contact className="size-6 mx-auto mb-1.5 opacity-30" />
                    <p className="text-xs">No contacts for this client</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {asset.contacts.map((contact: ContactType) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent/50"
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium truncate">
                              {contact.name}
                            </p>
                            {contact.is_primary && (
                              <Check className="size-3 shrink-0 text-emerald-500" />
                            )}
                            {contact.should_send_notification && (
                              <Bell className="size-3 shrink-0 text-muted-foreground" />
                            )}
                          </div>
                          {contact.designation && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {contact.designation}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            {contact.email && (
                              <span className="truncate">{contact.email}</span>
                            )}
                            {contact.email && contact.phone && <span>·</span>}
                            {contact.phone && (
                              <span className="shrink-0">{contact.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Scopes Section */}
        <ScopesSection assetId={id} />

        {/* Activity Timeline */}
        <NotesTimeline noteableType="asset" noteableId={id} />
      </div>
      {/* Domains Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="size-4" />
              Linked Domains
            </CardTitle>
            <CardDescription>
              {asset.domains.length === 0
                ? "No domains linked to this project"
                : `${asset.domains.length} domain${asset.domains.length > 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateDomainOpen(true)}
          >
            <Plus className="size-3.5 mr-1.5" />
            Create Domain
          </Button>
        </CardHeader>
        <CardContent>
          {asset.domains.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Globe2 className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No domains linked</p>
              <p className="text-xs mt-1">
                Add domains from the domain management page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {asset.domains.map((domain) => {
                const expiryDate = domain.expiry_date
                  ? new Date(domain.expiry_date)
                  : null;
                const now = new Date();
                const daysUntilExpiry = expiryDate
                  ? Math.ceil(
                      (expiryDate.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;
                const isExpired =
                  daysUntilExpiry !== null && daysUntilExpiry <= 0;
                const isExpiringSoon =
                  daysUntilExpiry !== null &&
                  daysUntilExpiry > 0 &&
                  daysUntilExpiry <= 30;

                return (
                  <div
                    key={domain.id}
                    className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-lg bg-accent/60 flex items-center justify-center shrink-0 ring-1 ring-border/30">
                        <Globe2 className="size-4 text-muted-foreground" />
                      </div>
                      <Link
                        className="min-w-0 flex-1 cursor-pointer pt-0.5"
                        href={`/domains/${domain.id}`}
                      >
                        <p className="text-sm font-medium truncate leading-snug group-hover:text-primary transition-colors">
                          {domain.fqdn}
                        </p>
                        {domain.registrar_name && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 leading-normal">
                            {domain.registrar_name}
                          </p>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDomain(domain);
                          setEditDomainOpen(true);
                        }}
                        className="size-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent text-muted-foreground hover:text-foreground shrink-0 mt-1"
                        aria-label="Edit domain"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3">
                      {expiryDate && (
                        <div className="flex items-center justify-between">
                          <span>Expiry</span>
                          <span
                            className={
                              isExpired
                                ? "text-destructive font-medium"
                                : isExpiringSoon
                                  ? "text-amber-600 dark:text-amber-400 font-medium"
                                  : ""
                            }
                          >
                            {formatDate(domain.expiry_date!)}
                            {isExpired && (
                              <AlertTriangle className="size-3 inline ml-1 text-destructive" />
                            )}
                            {isExpiringSoon && !isExpired && (
                              <span className="ml-1">({daysUntilExpiry}d)</span>
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>Auto-renew</span>
                        <span
                          className={
                            domain.auto_renew
                              ? "text-emerald-600 dark:text-emerald-400"
                              : ""
                          }
                        >
                          {domain.auto_renew ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SSL Certificates Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              SSL Certificates
            </CardTitle>
            <CardDescription>
              {asset.ssl_certificates.length === 0
                ? "No SSL certificates linked to this project"
                : `${asset.ssl_certificates.length} certificate${asset.ssl_certificates.length > 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateSslOpen(true)}
          >
            <Plus className="size-3.5 mr-1.5" />
            Create SSL
          </Button>
        </CardHeader>
        <CardContent>
          {asset.ssl_certificates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldCheck className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No SSL certificates</p>
              <p className="text-xs mt-1">
                SSL certificates will appear here when linked.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {asset.ssl_certificates.map((cert) => {
                const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
                const now = new Date();
                const daysToExpiry = validTo
                  ? Math.ceil(
                      (validTo.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;
                const isExpired = daysToExpiry !== null && daysToExpiry <= 0;
                const isExpiringSoon =
                  daysToExpiry !== null &&
                  daysToExpiry > 0 &&
                  daysToExpiry <= 30;

                return (
                  <div
                    key={cert.id}
                    className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-lg bg-accent/60 flex items-center justify-center shrink-0 ring-1 ring-border/30">
                        <ShieldCheck className="size-4 text-muted-foreground" />
                      </div>
                      <Link
                        className="min-w-0 flex-1 cursor-pointer pt-0.5"
                        href={`/ssl-certificates/${cert.id}`}
                      >
                        <p className="text-sm font-medium truncate leading-snug group-hover:text-primary transition-colors">
                          {cert.common_name ||
                            cert.domain_fqdn ||
                            "SSL Certificate"}
                        </p>
                        {cert.issuer && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 leading-normal">
                            {cert.issuer}
                          </p>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSsl(cert);
                          setEditSslOpen(true);
                        }}
                        className="size-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent text-muted-foreground hover:text-foreground shrink-0 mt-1"
                        aria-label="Edit SSL certificate"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3">
                      {validTo && (
                        <div className="flex items-center justify-between">
                          <span>Expires</span>
                          <span
                            className={
                              isExpired
                                ? "text-destructive font-medium"
                                : isExpiringSoon
                                  ? "text-amber-600 dark:text-amber-400 font-medium"
                                  : ""
                            }
                          >
                            {formatDate(cert.valid_to!)}
                            {isExpired && (
                              <AlertTriangle className="size-3 inline ml-1 text-destructive" />
                            )}
                            {isExpiringSoon && !isExpired && (
                              <span className="ml-1">({daysToExpiry}d)</span>
                            )}
                          </span>
                        </div>
                      )}
                      {cert.type && (
                        <div className="flex items-center justify-between">
                          <span>Type</span>
                          <span className="capitalize">{cert.type}</span>
                        </div>
                      )}
                      {cert.domain_fqdn && (
                        <div className="flex items-center justify-between">
                          <span>Domain</span>
                          <span className="truncate max-w-[140px]">
                            {cert.domain_fqdn}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Servers Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4" />
              Linked Servers
            </CardTitle>
            <CardDescription>
              {asset.servers.length === 0
                ? "No servers linked to this project"
                : `${asset.servers.length} server${asset.servers.length > 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateServerOpen(true)}
            >
              <Plus className="size-3.5 mr-1.5" />
              Create Server
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {asset.servers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Server className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No servers linked</p>
              <p className="text-xs mt-1">
                Link servers to this project from the server detail page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {asset.servers.map((server) => (
                <div
                  key={server.id}
                  className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm group cursor-pointer"
                  onClick={() => router.push(`/servers/${server.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      router.push(`/servers/${server.id}`);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Server className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {server.label}
                      </p>
                      {server.ip_addresses &&
                        server.ip_addresses.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {server.ip_addresses[0]}
                            {server.ip_addresses.length > 1 &&
                              ` +${server.ip_addresses.length - 1}`}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monitors Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4" />
              Monitors
            </CardTitle>
            <CardDescription>
              {monitorsLoading
                ? "Loading monitors..."
                : !monitorsData?.data?.length
                  ? "No monitors linked to this project"
                  : `${monitorsData.meta.total} monitor${monitorsData.meta.total !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateMonitorOpen(true)}
          >
            <Plus className="size-3.5 mr-1.5" />
            Create Monitor
          </Button>
        </CardHeader>
        <CardContent>
          {monitorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 p-4 space-y-3"
                >
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : !monitorsData?.data?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No monitors set up</p>
              <p className="text-xs mt-1">
                Create an uptime monitor to keep track of this project&apos;s
                availability.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monitorsData.data.map((monitor) => (
                <div
                  key={monitor.id}
                  className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm group cursor-pointer"
                  onClick={() => router.push(`/monitors/${monitor.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      router.push(`/monitors/${monitor.id}`);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="size-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0 ring-1 ring-border/30">
                        <Activity className="size-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium truncate leading-snug group-hover:text-primary transition-colors">
                          {monitor.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 leading-normal font-mono">
                          {monitor.target}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {monitor.current_status === "up" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="size-3.5" />
                          Up
                        </span>
                      ) : monitor.current_status === "down" ? (
                        <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                          <XCircle className="size-3.5" />
                          Down
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <Clock className="size-3.5" />
                          Unknown
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3">
                    <div className="flex items-center justify-between">
                      <span>Type</span>
                      <span className="uppercase font-medium">
                        {monitor.check_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Interval</span>
                      <span>
                        {monitor.interval_seconds >= 3600
                          ? `${monitor.interval_seconds / 3600}h`
                          : monitor.interval_seconds >= 60
                            ? `${monitor.interval_seconds / 60}m`
                            : `${monitor.interval_seconds}s`}
                      </span>
                    </div>
                    {monitor.last_checked_at && (
                      <div className="flex items-center justify-between">
                        <span>Last checked</span>
                        <span>{formatDate(monitor.last_checked_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contracts Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              Linked Contracts
            </CardTitle>
            <CardDescription>
              {contractsLoading
                ? "Loading contracts..."
                : !contractsData?.data?.length
                  ? "No contracts linked to this project"
                  : `${contractsData.meta.total} contract${contractsData.meta.total !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateContractOpen(true)}
          >
            <Plus className="size-3.5 mr-1.5" />
            Create Contract
          </Button>
        </CardHeader>
        <CardContent>
          {contractsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 p-4 space-y-3"
                >
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : !contractsData?.data?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No contracts linked</p>
              <p className="text-xs mt-1">
                Link contracts to this project from the contract edit page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractsData.data.map((contract) => {
                const endDate = new Date(contract.end_date);
                const now = new Date();
                const daysUntilEnd = Math.ceil(
                  (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                );
                const isExpiringSoon = daysUntilEnd > 0 && daysUntilEnd <= 30;
                const isExpired = daysUntilEnd <= 0;

                return (
                  <div
                    key={contract.id}
                    className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm group cursor-pointer"
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        router.push(`/contracts/${contract.id}`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {contract.contract_number ||
                            `Contract ${contract.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contract.client_name}
                        </p>
                      </div>
                      <Badge
                        variant="dot"
                        size="sm"
                        color={
                          CONTRACT_STATUS_COLORS[contract.status] ?? "gray"
                        }
                      >
                        {contract.status}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3">
                      <div className="flex items-center justify-between">
                        <span>End date</span>
                        <span
                          className={
                            isExpired
                              ? "text-destructive font-medium"
                              : isExpiringSoon
                                ? "text-amber-600 dark:text-amber-400 font-medium"
                                : ""
                          }
                        >
                          {formatDate(contract.end_date)}
                          {isExpired && (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-destructive">
                              <AlertTriangle className="size-3" />
                            </span>
                          )}
                          {isExpiringSoon && !isExpired && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              ({daysUntilEnd}d)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Amount</span>
                        <span className="font-medium">
                          {formatCurrency(contract.amount, contract.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Billing</span>
                        <span className="capitalize">
                          {contract.billing_cycle}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Auto-renew</span>
                        {contract.auto_renew ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <RefreshCw className="size-3" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Drawer */}
      <AssetEditForm
        key={`edit-asset-${editOpen}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdateAsset}
        isPending={updateAsset.isPending}
        asset={asset}
        contacts={assetClient?.contacts ?? []}
      />

      {/* Create Server Drawer */}
      <ServerCreateDrawer
        key={`create-server-${createServerOpen}`}
        open={createServerOpen}
        onOpenChange={setCreateServerOpen}
        onSubmit={handleCreateServer}
        isPending={isCreatingServer}
        providers={providersData?.data ?? []}
      />

      {/* Create Contract Drawer */}
      <ContractCreateDrawer
        key={`create-contract-${createContractOpen}`}
        open={createContractOpen}
        onOpenChange={setCreateContractOpen}
        onSubmit={handleCreateContract}
        isPending={isCreatingContract}
        clientId={asset.client_id}
      />

      {/* Create Domain Drawer */}
      <CreateDomainForm
        key={`create-domain-${createDomainOpen}`}
        open={createDomainOpen}
        onOpenChange={setCreateDomainOpen}
        onSubmit={handleCreateDomain}
        isPending={isCreatingDomain}
        assetId={id}
      />

      {/* Create SSL Drawer */}
      <CreateSslForm
        key={`create-ssl-${createSslOpen}`}
        open={createSslOpen}
        onOpenChange={setCreateSslOpen}
        onSubmit={handleCreateSsl}
        isPending={isCreatingSsl}
        domains={asset.domains}
        assetId={id}
      />

      {/* Edit Domain Drawer */}
      {editingDomain && (
        <DomainEditForm
          key={`edit-domain-${editDomainOpen}`}
          open={editDomainOpen}
          onOpenChange={setEditDomainOpen}
          onSubmit={handleUpdateDomain}
          onDelete={handleDeleteDomain}
          isPending={isUpdatingDomain}
          isDeleting={isDeletingDomain}
          domain={editingDomain}
          registrars={registrars}
        />
      )}

      {/* Edit SSL Drawer */}
      {editingSsl && (
        <SslEditForm
          key={`edit-ssl-${editSslOpen}`}
          open={editSslOpen}
          onOpenChange={setEditSslOpen}
          onSubmit={handleUpdateSsl}
          onDelete={handleDeleteSsl}
          isPending={isUpdatingSsl}
          isDeleting={isDeletingSsl}
          cert={editingSsl}
        />
      )}

      {/* Create Monitor Drawer */}
      <MonitorCreateDrawer
        open={createMonitorOpen}
        onOpenChange={setCreateMonitorOpen}
        onSubmit={handleCreateMonitor}
        isPending={isCreatingMonitor}
        preSelectedAssetId={id}
      />

      {/* Create Provider Dialog */}
    </div>
  );
}
