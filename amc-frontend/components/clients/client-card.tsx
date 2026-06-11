// components/clients/client-card.tsx
"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {  Mail } from "lucide-react"
import type { ClientListItem } from "@/types/api"

interface ClientCardProps {
  client: ClientListItem
  onClick: (id: string) => void
  onEdit: (id: string) => void
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }



  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-primary/20"
      onClick={() => onClick(client.id)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg leading-tight">{client.name}</h3>
            {client.company && (
              <p className="text-sm text-muted-foreground">{client.company}</p>
            )}
          </div>
        </div>
       
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
      
        
        <div className="space-y-2 text-sm">
          {client.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
     
      </CardFooter>
    </Card>
  )
}