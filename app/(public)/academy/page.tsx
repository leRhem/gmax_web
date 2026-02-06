"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  IconSchool,
  IconClock,
  IconUsers,
  IconCurrencyNaira,
  IconCheck,
  IconArrowLeft,
  IconBrandWhatsapp,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

interface Course {
  id: string
  name: string
  slug: string
  description: string | null
  level: string
  duration: string
  price: number
  salePrice: number | null
  curriculum: string[]
  features: string[]
  maxStudents: number
  spotsLeft: number
  isFull: boolean
  studio: { name: string; city: string }
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  MASTERCLASS: "Masterclass",
}

export default function AcademyPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" })
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setError(null)
      const response = await fetch("/api/public/academy")
      if (response.ok) {
        const data = (await response.json()) as any
        setCourses(data.courses || [])
      } else {
        const errorData = (await response.json().catch(() => ({}))) as any
        setError(errorData.error || "Failed to load courses")
      }
    } catch (err) {
      console.error("Error:", err)
      setError("Failed to load courses. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleRegister = (course: Course) => {
    setSelectedCourse(course)
    setFormData({ name: "", phone: "", email: "" })
    setRegistrationSuccess(false)
    setIsRegisterOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !selectedCourse) {
      toast.error("Name and phone are required")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/public/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          courseId: selectedCourse.id,
        }),
      })

      const data = (await response.json()) as any

      if (response.ok) {
        setRegistrationSuccess(true)
        toast.success("Registration successful!")
      } else {
        toast.error(data.error || "Registration failed")
      }
    } catch (error) {
      toast.error("Registration failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="container mx-auto px-6 py-12">
          <div className="space-y-4 mb-12">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-3/4 max-w-2xl" />
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[400px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans selection:bg-black/5 dark:selection:bg-white/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between h-20 px-6">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="p-2 bg-primary text-primary-foreground rounded-lg">
                <IconSchool className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">GMAX Academy</span>
          </Link>
          <Button variant="ghost" className="text-sm font-medium hover:bg-transparent hover:underline underline-offset-4" asChild>
            <Link href="/">
              <IconArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 md:py-32 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col items-start fade-in-up">
            <Badge variant="outline" className="mb-8 px-4 py-1.5 border-primary/20 text-primary bg-primary/5 uppercase tracking-widest text-[10px] font-semibold rounded-full">
              Professional Training
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9] text-primary">
              Master the Art of <br />
              <span className="text-muted-foreground font-light">Visual Storytelling.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground/80 max-w-2xl font-light leading-relaxed mb-12">
              Join our exclusive courses. Learn from industry experts in a <span className="text-foreground font-medium">world-class studio environment</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-24 px-6 bg-white dark:bg-black border-t border-border/40">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-baseline justify-between mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Available Courses</h2>
            <p className="text-sm text-muted-foreground hidden md:block">Select a course to begin your journey</p>
          </div>
          
          {courses.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <div 
                  key={course.id} 
                  className="group relative flex flex-col bg-neutral-50 dark:bg-neutral-900 border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20"
                >
                  <div className="p-8 flex-1">
                    <div className="flex items-start justify-between mb-6">
                      <Badge 
                        variant="secondary" 
                        className="rounded-md px-2.5 py-0.5 text-xs font-medium tracking-wide"
                      >
                        {LEVEL_LABELS[course.level] || course.level}
                      </Badge>
                      {course.isFull && (
                        <Badge variant="destructive" className="rounded-md">Full</Badge>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold mb-3 tracking-tight group-hover:text-primary transition-colors">
                      {course.name}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-3">
                      {course.description || "Learn professional photography skills directly from the masters of the craft."}
                    </p>

                    {Array.isArray(course.features) && course.features.length > 0 && (
                      <ul className="space-y-3 mb-8">
                        {course.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground/80">
                            <IconCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-8 pt-0 mt-auto border-t border-border/50">
                     <div className="flex items-center justify-between mb-6 pt-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <IconClock className="h-3.5 w-3.5" />
                            <span>Duration</span>
                          </div>
                          <p className="font-semibold">{course.duration}</p>
                        </div>
                        <div className="space-y-1 text-right">
                           <div className="flex items-center justify-end gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              <span>Fee</span>
                           </div>
                           {/* Price Logic */}
                           <div className="flex items-center justify-end gap-2">
                              {course.salePrice ? (
                                <>
                                  <span className="text-sm line-through text-muted-foreground/50">
                                    {formatCurrency(course.price).replace("NGN", "")}
                                  </span>
                                  <span className="text-xl font-bold">
                                    {formatCurrency(course.salePrice).replace("NGN", "")}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xl font-bold">
                                  {formatCurrency(course.price).replace("NGN", "")}
                                </span>
                              )}
                           </div>
                        </div>
                     </div>

                    <Button 
                      className="w-full h-12 rounded-xl text-base font-medium shadow-none hover:shadow-lg transition-all" 
                      onClick={() => handleRegister(course)}
                      disabled={course.isFull}
                      size="lg"
                    >
                      {course.isFull ? "Enrollment Closed" : "Reserve Your Spot"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/50 rounded-3xl bg-neutral-50/50">
              <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
                 <IconSchool className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Courses Currently Open</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                We are currently updating our curriculum. Please check back later for upcoming sessions.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer / Contact */}
      <footer className="py-24 px-6 bg-neutral-50 dark:bg-neutral-950 border-t border-border/40">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Start Your Journey</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg font-light">
            Have questions about our programs? Our team is here to help you choose the right path.
          </p>
          <Button size="lg" className="h-14 px-8 rounded-full shadow-lg hover:shadow-xl transition-all gap-3 text-base" asChild>
            <a href="https://wa.me/2348012345678" target="_blank" rel="noopener noreferrer">
              <IconBrandWhatsapp className="h-5 w-5" />
              Chat with Admissions
            </a>
          </Button>
          
          <div className="mt-24 pt-8 border-t border-border/20 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground/60">
             <p>© {new Date().getFullYear()} GMAX Studio. All rights reserved.</p>
             <div className="flex gap-6 mt-4 md:mt-0">
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
             </div>
          </div>
        </div>
      </footer>

      {/* Registration Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
           <div className="bg-primary px-6 py-8 text-primary-foreground text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
               <h2 className="text-2xl font-bold relative z-10">{selectedCourse?.name}</h2>
               <p className="text-primary-foreground/80 text-sm mt-2 relative z-10">Complete your registration</p>
           </div>

          {registrationSuccess ? (
            <div className="p-8 text-center bg-background">
               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <IconCheck className="w-8 h-8" />
               </div>
              <h3 className="text-xl font-bold mb-2">Registration Confirmed!</h3>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                  Thank you for registering. We will contact you via WhatsApp shortly to finalize your enrollment.
              </p>
              
              <div className="bg-neutral-50 p-4 rounded-xl mb-6 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Course Fee</p>
                <p className="font-bold text-lg text-primary">
                    {selectedCourse && formatCurrency(selectedCourse.salePrice ?? selectedCourse.price)}
                </p>
              </div>

              <div className="space-y-3">
                  <Button className="w-full h-12 rounded-xl" asChild>
                    <a href="https://wa.me/2348012345678" target="_blank" rel="noopener noreferrer">
                      <IconBrandWhatsapp className="h-5 w-5 mr-2" />
                      Contact Admissions
                    </a>
                  </Button>
                  <Button variant="ghost" className="w-full rounded-xl" onClick={() => setIsRegisterOpen(false)}>
                    Close
                  </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-background">
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Full Name</Label>
                  <Input
                    id="name"
                    className="h-11 rounded-lg bg-neutral-50 border-transparent focus:bg-white focus:border-primary/20 transition-all font-medium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Phone Number</Label>
                  <Input
                    id="phone"
                    className="h-11 rounded-lg bg-neutral-50 border-transparent focus:bg-white focus:border-primary/20 transition-all font-medium"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 080..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Email Address <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(Optional)</span></Label>
                  <Input
                    id="email"
                    type="email"
                    className="h-11 rounded-lg bg-neutral-50 border-transparent focus:bg-white focus:border-primary/20 transition-all font-medium"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                  />
                </div>
                
                <div className="pt-4">
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-12 rounded-xl text-base shadow-lg hover:shadow-xl transition-all">
                    {isSubmitting ? "Processing..." : "Submit Registration"}
                    </Button>
                    <div className="text-center mt-4">
                        <Button variant="link" className="text-muted-foreground text-sm p-0 h-auto" onClick={() => setIsRegisterOpen(false)}>
                        Cancel
                        </Button>
                    </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
