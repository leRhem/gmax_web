// components/bookings/client-combobox.tsx
"use client"

import * as React from "react"
import { IconCheck, IconChevronDown, IconPlus, IconSearch } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Client {
  id: string
  name: string
  phone: string
  email: string | null
}

interface ClientComboboxProps {
  clients: Client[]
  value?: string
  onValueChange: (value: string) => void
  onCreateNew: () => void
  disabled?: boolean
}

export function ClientCombobox({
  clients,
  value,
  onValueChange,
  onCreateNew,
  disabled = false,
}: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedClient = clients.find((client) => client.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedClient ? (
            <span className="truncate">
              {selectedClient.name} ({selectedClient.phone})
            </span>
          ) : (
            <span className="text-muted-foreground">Select a client</span>
          )}
          <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search clients by name or phone..." />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                <p className="text-muted-foreground mb-4">No clients found.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false)
                    onCreateNew()
                  }}
                >
                  <IconPlus className="mr-2 h-4 w-4" />
                  Create New Client
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.name} ${client.phone} ${client.email || ""}`}
                  onSelect={() => {
                    onValueChange(client.id)
                    setOpen(false)
                  }}
                >
                  <IconCheck
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {client.phone}
                      {client.email && ` • ${client.email}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  onCreateNew()
                }}
                className="justify-center text-primary"
              >
                <IconPlus className="mr-2 h-4 w-4" />
                <span className="font-medium">Add New Client</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}