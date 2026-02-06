// app/(dashboard)/dashboard/academy/academy-dashboard.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  IconSchool,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconUsers,
  IconCurrencyNaira,
  IconFilter,
  IconBuilding,
  IconBook,
  IconCheck,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

const COURSE_LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "MASTERCLASS", label: "Masterclass" },
]

const ENROLLMENT_STATUS = [
  { value: "PENDING", label: "Pending", color: "bg-yellow-500" },
  { value: "CONFIRMED", label: "Confirmed", color: "bg-blue-500" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-purple-500" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-500" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-500" },
]

interface Studio {
  id: string
  name: string
  city: string
}

interface Course {
  id: string
  name: string
  slug: string
  description: string | null
  level: string
  duration: string
  price: number
  salePrice: number | null
  features: string[]
  maxStudents: number
  studio: Studio
  enrolledCount: number
  spotsLeft: number
  isActive: boolean
}

interface Student {
  id: string
  name: string
  phone: string
  email: string | null
  status: string
  amountPaid: number
  enrollmentDate: string
  course: {
    id: string
    name: string
    price: number
    studio?: { name: string }
  }
}

interface AcademyDashboardProps {
  userRole: string
  userStudioId: string | null
}

const initialCourseForm = {
  name: "",
  description: "",
  level: "BEGINNER",
  duration: "",
  price: "",
  salePrice: "",
  maxStudents: "20",
  studioId: "",
  features: "",
}

const initialStudentForm = {
  name: "",
  phone: "",
  email: "",
  courseId: "",
  status: "PENDING",
  amountPaid: "0",
  notes: "",
}

export function AcademyDashboard({ userRole, userStudioId }: AcademyDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("courses")

  // Dialog states
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false)
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [courseForm, setCourseForm] = useState(initialCourseForm)
  const [studentForm, setStudentForm] = useState(initialStudentForm)
  const [isSaving, setIsSaving] = useState(false)

  // Filters
  const [levelFilter, setLevelFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const isAdmin = userRole === "ADMIN"

  const fetchCourses = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (levelFilter !== "all") params.set("level", levelFilter)
      params.set("includeInactive", "true")

      const response = await fetch(`/api/academy/courses?${params}`)
      if (response.ok) {
        const data = (await response.json()) as any
        setCourses(data.courses || [])
      } else {
        const errorData = (await response.json().catch(() => ({}))) as any
        toast.error(errorData.error || "Failed to fetch courses")
        setCourses([])
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to fetch courses")
      setCourses([])
    }
  }, [levelFilter])

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)

      const response = await fetch(`/api/academy/students?${params}`)
      if (response.ok) {
        const data = (await response.json()) as any
        setStudents(data.students || [])
      } else {
        const errorData = (await response.json().catch(() => ({}))) as any
        toast.error(errorData.error || "Failed to fetch students")
        setStudents([])
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to fetch students")
      setStudents([])
    }
  }, [statusFilter])

  const fetchStudios = async () => {
    try {
      const response = await fetch("/api/studios")
      if (response.ok) {
        const data = (await response.json()) as any
        setStudios(data.studios || [])
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchCourses(), fetchStudents(), isAdmin && fetchStudios()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchCourses, fetchStudents, isAdmin])

  const handleAddCourse = () => {
    setSelectedCourse(null)
    setCourseForm({
      ...initialCourseForm,
      studioId: userStudioId || "",
    })
    setIsCourseDialogOpen(true)
  }

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course)
    setCourseForm({
      name: course.name,
      description: course.description || "",
      level: course.level,
      duration: course.duration,
      price: course.price.toString(),
      salePrice: course.salePrice?.toString() || "",
      features: course.features?.join("\n") || "",
      maxStudents: course.maxStudents.toString(),
      studioId: course.studio.id,
    })
    setIsCourseDialogOpen(true)
  }

  const handleSaveCourse = async () => {
    if (!courseForm.name || !courseForm.price || !courseForm.duration) {
      toast.error("Name, price, and duration are required")
      return
    }

    try {
      setIsSaving(true)
      const url = selectedCourse
        ? `/api/academy/courses/${selectedCourse.id}`
        : "/api/academy/courses"
      const method = selectedCourse ? "PUT" : "POST"

      const payload = {
        ...courseForm,
        features: courseForm.features.split("\n").filter(f => f.trim()),
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(selectedCourse ? "Course updated" : "Course created")
        setIsCourseDialogOpen(false)
        fetchCourses()
      } else {
        const error = (await response.json()) as any
        toast.error(error.error || "Failed to save course")
      }
    } catch (error) {
      toast.error("Failed to save course")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddStudent = () => {
    setSelectedStudent(null)
    setStudentForm({
      ...initialStudentForm,
      courseId: courses[0]?.id || "",
    })
    setIsStudentDialogOpen(true)
  }

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student)
    setStudentForm({
      name: student.name,
      phone: student.phone,
      email: student.email || "",
      courseId: student.course.id,
      status: student.status,
      amountPaid: student.amountPaid.toString(),
      notes: "",
    })
    setIsStudentDialogOpen(true)
  }

  const handleSaveStudent = async () => {
    if (!studentForm.name || !studentForm.phone || !studentForm.courseId) {
      toast.error("Name, phone, and course are required")
      return
    }

    try {
      setIsSaving(true)
      const url = selectedStudent
        ? `/api/academy/students/${selectedStudent.id}`
        : "/api/academy/students"
      const method = selectedStudent ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm),
      })

      if (response.ok) {
        toast.success(selectedStudent ? "Student updated" : "Student registered")
        setIsStudentDialogOpen(false)
        fetchStudents()
      } else {
        const error = (await response.json()) as any
        toast.error(error.error || "Failed to save student")
      }
    } catch (error) {
      toast.error("Failed to save student")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return
    try {
      setIsSaving(true)
      const response = await fetch(`/api/academy/courses/${selectedCourse.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast.success("Course deleted")
        setIsDeleteDialogOpen(false)
        fetchCourses()
      } else {
        const error = (await response.json()) as any
        toast.error(error.error || "Failed to delete")
      }
    } catch (error) {
      toast.error("Failed to delete course")
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const option = ENROLLMENT_STATUS.find((s) => s.value === status)
    return <Badge className={option?.color || "bg-gray-500"}>{option?.label || status}</Badge>
  }

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      BEGINNER: "bg-green-500",
      INTERMEDIATE: "bg-blue-500",
      ADVANCED: "bg-purple-500",
      MASTERCLASS: "bg-orange-500",
    }
    return <Badge className={colors[level] || "bg-gray-500"}>{level}</Badge>
  }

  // Stats
  const totalStudents = students.length
  const pendingStudents = students.filter((s) => s.status === "PENDING").length
  const activeStudents = students.filter((s) => s.status === "IN_PROGRESS").length
  const totalRevenue = students.reduce((sum, s) => sum + Number(s.amountPaid), 0)

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 lg:gap-6 lg:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:gap-6 lg:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <IconSchool className="h-8 w-8" />
            Academy
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage courses and student enrollments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { fetchCourses(); fetchStudents() }} aria-label="Refresh">
            <IconRefresh className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <IconBook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">{pendingStudents} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <IconSchool className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{activeStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <IconCurrencyNaira className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>
          {activeTab === "courses" ? (
            <Button onClick={handleAddCourse}>
              <IconPlus className="h-4 w-4 mr-1" />
              Add Course
            </Button>
          ) : (
            <Button onClick={handleAddStudent}>
              <IconPlus className="h-4 w-4 mr-1" />
              Add Student
            </Button>
          )}
        </div>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex gap-2">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {COURSE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className={!course.isActive ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{course.name}</CardTitle>
                      <div className="text-sm text-muted-foreground mb-3">{course.duration}</div>
                    </div>
                    {getLevelBadge(course.level)}
                  </div>
                  
                  {course.features && course.features.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <ul className="text-sm space-y-1">
                        {course.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <IconCheck className="h-3 w-3 text-primary flex-shrink-0" />
                            <span className="line-clamp-1">{feature}</span>
                          </li>
                        ))}
                        {course.features.length > 3 && (
                          <li className="text-muted-foreground text-xs pl-5">
                            +{course.features.length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {course.description && (
                    <CardDescription className="line-clamp-2">
                      {course.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">
                      {course.salePrice ? (
                        <>
                          <span className="line-through text-muted-foreground mr-1">
                            {formatCurrency(course.price)}
                          </span>
                          {formatCurrency(course.salePrice)}
                        </>
                      ) : (
                        formatCurrency(course.price)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-medium">
                      {course.enrolledCount} / {course.maxStudents}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <IconBuilding className="h-3 w-3" />
                      {course.studio.name}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditCourse(course)}>
                      <IconEdit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCourse(course)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {courses.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <IconBook className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No courses found</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ENROLLMENT_STATUS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {students.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>{student.course.name}</TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell>{formatCurrency(Number(student.amountPaid))}</TableCell>
                        <TableCell>
                          {(() => {
                            const date = new Date(student.enrollmentDate)
                            return isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy")
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditStudent(student)}>
                            <IconEdit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <IconUsers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No students found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Course Dialog */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCourse ? "Edit Course" : "Add Course"}</DialogTitle>
            <DialogDescription>
              {selectedCourse ? "Update course details" : "Create a new course"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                placeholder="e.g. Photography Fundamentals"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select value={courseForm.level} onValueChange={(v) => setCourseForm({ ...courseForm, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  value={courseForm.duration}
                  onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                  placeholder="e.g. 8 weeks"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₦) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={courseForm.price}
                  onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price (₦)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  value={courseForm.salePrice}
                  onChange={(e) => setCourseForm({ ...courseForm, salePrice: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max Students</Label>
              <Input
                id="maxStudents"
                type="number"
                value={courseForm.maxStudents}
                onChange={(e) => setCourseForm({ ...courseForm, maxStudents: e.target.value })}
              />
            </div>
            {isAdmin && studios.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="studio">Studio *</Label>
                <Select value={courseForm.studioId} onValueChange={(v) => setCourseForm({ ...courseForm, studioId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select studio" />
                  </SelectTrigger>
                  <SelectContent>
                    {studios.map((studio) => (
                      <SelectItem key={studio.id} value={studio.id}>
                        {studio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={courseForm.features}
                onChange={(e) => setCourseForm({ ...courseForm, features: e.target.value })}
                placeholder="e.g. Certified Instructor&#10;Hands-on Projects&#10;Career Support"
                rows={3}
                className="overflow-y-auto"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCourse} disabled={isSaving}>
              {isSaving ? "Saving..." : selectedCourse ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Dialog */}
      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedStudent ? "Edit Student" : "Add Student"}</DialogTitle>
            <DialogDescription>
              {selectedStudent ? "Update student details" : "Register a new student"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">Name *</Label>
              <Input
                id="studentName"
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Course *</Label>
              <Select value={studentForm.courseId} onValueChange={(v) => setStudentForm({ ...studentForm, courseId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={studentForm.status} onValueChange={(v) => setStudentForm({ ...studentForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENROLLMENT_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Paid (₦)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  value={studentForm.amountPaid}
                  onChange={(e) => setStudentForm({ ...studentForm, amountPaid: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStudentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStudent} disabled={isSaving}>
              {isSaving ? "Saving..." : selectedStudent ? "Update" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCourse?.name}"? This will deactivate the course.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCourse} disabled={isSaving}>
              {isSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
