"use client"

import { useConfig, useUpdateSmtpConfig, useUpdateWhatsAppConfig } from "@/hooks/use-config"
import { Settings, Mail, MessageCircle, Loader2, Eye, EyeOff } from "lucide-react"
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
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
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
      <CardContent className="space-y-4">
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
