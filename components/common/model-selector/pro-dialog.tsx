"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { APP_NAME } from "@/lib/config"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/user-store/provider"
import Image from "next/image"
import { useEffect, useState } from "react"

type ProModelDialogProps = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  currentModel: string
}

export function ProModelDialog({
  isOpen,
  setIsOpen,
  currentModel,
}: ProModelDialogProps) {
  const [submitted, setSubmitted] = useState(false)
  const { user } = useUser()
  const isMobile = useBreakpoint(768)

  useEffect(() => {
    setSubmitted(false)
  }, [currentModel])

  const handleSubmitInterest = async () => {
    if (!user?.id) {
      return
    }

    const supabase = await createClient()

    if (!supabase) {
      return
    }

    const { error } = await supabase.from("feedback").insert({
      message: `I want access to ${currentModel}`,
      user_id: user?.id,
    })

    if (error) {
      throw new Error(error.message)
    }

    setSubmitted(true)
  }

  const renderContent = () => (
    <div className="flex max-h-[70vh] flex-col">
      <div className="relative">
        <Image
          src="/banner_ocean.jpg"
          alt={`calm paint generate by ${APP_NAME}`}
          width={400}
          height={128}
          className="h-32 w-full object-cover"
        />
      </div>

      <div className="px-6 pt-4 text-center text-lg leading-tight font-medium">
        This model is Pro-only on HyperFix
      </div>

      <div className="flex-grow overflow-y-auto">
        <div className="px-6 py-4">
          <p className="text-muted-foreground text-sm">
            HyperFix is free and open-source. Some models require self-hosted
            access.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            If you want to use this model, you can fork HyperFix and add your own
            key. Or let us know you want access.
          </p>

          <div className="mt-5 flex justify-center gap-3">
            {submitted ? (
              <Badge className="bg-green-600 text-white">
                Thanks! We&apos;ll keep you updated
              </Badge>
            ) : (
              <>
                <Button
                  onClick={handleSubmitInterest}
                  className="flex-1"
                  variant="default"
                >
                  I want this model
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href="https://github.com/ibelick/hyperfix"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View setup
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="px-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Pro Model Access Required</DrawerTitle>
          </DrawerHeader>
          {renderContent()}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="[&>button:last-child]:bg-background gap-0 overflow-hidden rounded-3xl p-0 shadow-xs sm:max-w-md [&>button:last-child]:rounded-full [&>button:last-child]:p-1">
        <DialogHeader className="sr-only">
          <DialogTitle>Pro Model Access Required</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
