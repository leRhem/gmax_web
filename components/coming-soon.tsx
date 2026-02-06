"use client"

import { IconRocket, IconSparkles } from "@tabler/icons-react"
import Image from "next/image"

interface ComingSoonProps {
    title?: string
    description?: string
    showLogo?: boolean
}

export function ComingSoon({
    title = "Coming Soon",
    description = "We're working hard to bring you something amazing. Stay tuned!",
    showLogo = true,
}: ComingSoonProps) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-950 font-sans">
            {/* Background decoration - Simplified */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[120px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-2xl">
                {/* Logo */}
                {showLogo && (
                    <div className="mb-4">
                        <Image
                            src="/Logo.png"
                            alt="GMax Studioz"
                            width={80}
                            height={80}
                            className="drop-shadow-sm"
                        />
                    </div>
                )}

                {/* Icon */}
                <div className="relative">
                    <div className="relative rounded-2xl border border-primary/10 bg-white/50 dark:bg-white/5 p-6 shadow-sm backdrop-blur-sm">
                        <IconRocket className="h-10 w-10 text-primary" stroke={1.5} />
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-neutral-900 dark:text-neutral-50">
                        {title}
                    </h1>
                    <p className="text-xl text-muted-foreground font-light leading-relaxed">{description}</p>
                </div>

                {/* Features teaser */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {["Photography", "Videography", "Editing"].map((feature) => (
                        <div
                            key={feature}
                            className="flex items-center gap-2 rounded-full border border-border/60 bg-white/50 dark:bg-white/5 px-5 py-2.5 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-sm"
                        >
                            <IconSparkles className="h-4 w-4 text-primary" />
                            {feature}
                        </div>
                    ))}
                </div>

                {/* Footer text */}
                <p className="mt-16 text-sm text-neutral-400 font-medium tracking-wide">
                    GMAX STUDIOZ © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    )
}
