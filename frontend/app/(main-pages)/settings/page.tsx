"use client"

import { useConfig, useUpdateSmtpConfig, useUpdateWhatsAppConfig } from "@/hooks/use-config"
import { Settings, Mail, MessageCircle, Loader2, Eye, EyeOff, Info } from "lucide-react"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { SmtpConfig, WhatsAppConfig } from "@/types/api"
import { useState } from "react"

function SmtpSection() {
  const { data, isLoading } = useConfig("smtp")
  const updateMutation = useUpdateSmtpConfig()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState<SmtpConfig | null>(null)
  const config = form ?? (data?.config as unknown as SmtpConfig | undefined)

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="size-4" />SMTP</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  const handleChange = (field: keyof SmtpConfig, value: string | number) => {
    setForm((prev) => ({ ...(prev ?? (data?.config as unknown as SmtpConfig)), [field]: value }))
  }

  const handleSave = () => {
    if (!form) return
    updateMutation.mutate(form, {
      onSuccess: () => setForm(null),
    })
  }

  const hasChanges = form !== null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4" />
          SMTP Configuration
        </CardTitle>
        <CardDescription>Outgoing email server settings for notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-host">Host</Label>
            <Input id="smtp-host" value={config?.host ?? ""} onChange={(e) => handleChange("host", e.target.value)} placeholder="smtp.example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-port">Port</Label>
            <Input id="smtp-port" type="number" value={config?.port ?? 587} onChange={(e) => handleChange("port", Number(e.target.value))} placeholder="587" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-user">Username</Label>
            <Input id="smtp-user" value={config?.user ?? ""} onChange={(e) => handleChange("user", e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-password">Password</Label>
            <div className="relative">
              <Input id="smtp-password" type={showPassword ? "text" : "password"} value={config?.password ?? ""} onChange={(e) => handleChange("password", e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-from-email">From Email</Label>
            <Input id="smtp-from-email" type="email" value={config?.from_email ?? ""} onChange={(e) => handleChange("from_email", e.target.value)} placeholder="noreply@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-from-name">From Name</Label>
            <Input id="smtp-from-name" value={config?.from_name ?? ""} onChange={(e) => handleChange("from_name", e.target.value)} placeholder="AMC Portal" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-encryption">Encryption</Label>
          <Input id="smtp-encryption" value={config?.encryption ?? ""} onChange={(e) => handleChange("encryption", e.target.value)} placeholder="tls / ssl" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            Save SMTP Config
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function WhatsAppSection() {
  const { data, isLoading } = useConfig("whatsapp")
  const updateMutation = useUpdateWhatsAppConfig()
  const [showKey, setShowKey] = useState(false)
  const [form, setForm] = useState<WhatsAppConfig | null>(null)
  const config = form ?? (data?.config as unknown as WhatsAppConfig | undefined)

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="size-4" />WhatsApp</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  const handleChange = (field: keyof WhatsAppConfig, value: string) => {
    setForm((prev) => ({ ...(prev ?? (data?.config as unknown as WhatsAppConfig)), [field]: value }))
  }

  const handleSave = () => {
    if (!form) return
    updateMutation.mutate(form, {
      onSuccess: () => setForm(null),
    })
  }

  const hasChanges = form !== null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-4" />
          WhatsApp Configuration
        </CardTitle>
        <CardDescription>WhatsApp Business API settings for notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Credentials */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">API Credentials</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wa-phone-id">Phone Number ID</Label>
              <Input id="wa-phone-id" value={config?.phone_number_id ?? ""} onChange={(e) => handleChange("phone_number_id", e.target.value)} placeholder="123456789012345" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wa-api-key">API Key</Label>
                <div className="relative">
                  <Input id="wa-api-key" type={showKey ? "text" : "password"} value={config?.api_key ?? ""} onChange={(e) => handleChange("api_key", e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wa-api-secret">API Secret</Label>
                <Input id="wa-api-secret" type="password" value={config?.api_secret ?? ""} onChange={(e) => handleChange("api_secret", e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wa-business-id">Business Account ID</Label>
                <Input id="wa-business-id" value={config?.business_account_id ?? ""} onChange={(e) => handleChange("business_account_id", e.target.value)} placeholder="123456789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wa-webhook-token">Webhook Verify Token</Label>
                <Input id="wa-webhook-token" type="password" value={config?.webhook_verify_token ?? ""} onChange={(e) => handleChange("webhook_verify_token", e.target.value)} placeholder="••••••••" />
              </div>
            </div>
          </div>
        </div>

        {/* Template Requirements Info */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
          <Info className="size-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-medium">WhatsApp Template Requirements</p>
            <p>Each template must be created in <strong>Meta Business Manager</strong> with exactly <strong>3 text parameters</strong> in the body:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Entity name / identifier</li>
              <li>Days remaining or creation date</li>
              <li>Additional context (expiry date, severity, etc.)</li>
            </ol>
            <p className="mt-1">Enter the exact template name exactly as it appears in Meta Business Manager.</p>
          </div>
        </div>

        <Separator />

        {/* Creation Templates */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Creation Notification Templates</h4>
          <p className="text-xs text-muted-foreground mb-3">Template names sent when a new entity is created</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wa-domain-created">Domain Created</Label>
              <Input id="wa-domain-created" value={config?.domain_created_template ?? ""} onChange={(e) => handleChange("domain_created_template", e.target.value)} placeholder="domain_created" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-ssl-created">SSL Created</Label>
              <Input id="wa-ssl-created" value={config?.ssl_created_template ?? ""} onChange={(e) => handleChange("ssl_created_template", e.target.value)} placeholder="ssl_created" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-server-created">Server Created</Label>
              <Input id="wa-server-created" value={config?.server_created_template ?? ""} onChange={(e) => handleChange("server_created_template", e.target.value)} placeholder="server_created" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-incident-created">Incident Created</Label>
              <Input id="wa-incident-created" value={config?.incident_created_template ?? ""} onChange={(e) => handleChange("incident_created_template", e.target.value)} placeholder="incident_created" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Expiry Reminder Templates */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Expiry Reminder Templates</h4>
          <p className="text-xs text-muted-foreground mb-3">Template names sent when entities are nearing expiration</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wa-domain-expiry">Domain Expiry</Label>
              <Input id="wa-domain-expiry" value={config?.domain_expiry_template ?? ""} onChange={(e) => handleChange("domain_expiry_template", e.target.value)} placeholder="domain_expiry_reminder" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-ssl-expiry">SSL Expiry</Label>
              <Input id="wa-ssl-expiry" value={config?.ssl_expiry_template ?? ""} onChange={(e) => handleChange("ssl_expiry_template", e.target.value)} placeholder="ssl_expiry_reminder" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-server-expiry">Server Renewal</Label>
              <Input id="wa-server-expiry" value={config?.server_expiry_template ?? ""} onChange={(e) => handleChange("server_expiry_template", e.target.value)} placeholder="server_renewal_reminder" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-contract-expiry">Contract Expiry</Label>
              <Input id="wa-contract-expiry" value={config?.contract_expiry_template ?? ""} onChange={(e) => handleChange("contract_expiry_template", e.target.value)} placeholder="contract_expiry_reminder" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            Save WhatsApp Config
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Settings className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground mt-1">Manage integration and notification settings</p>
      </div>

      <Separator className="mb-6" />

      <div className="space-y-6">
        <SmtpSection />
        <WhatsAppSection />
      </div>
    </div>
  )
}
