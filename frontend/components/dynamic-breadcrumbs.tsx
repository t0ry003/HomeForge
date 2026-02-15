"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react"

export function DynamicBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter((segment) => segment !== "")

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          const isFirst = index === 0
          const href = `/${segments.slice(0, index + 1).join("/")}`
          const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

          return (
            <React.Fragment key={href}>
              {/* Show separator between items, but not before the first */}
              {!isFirst && (
                <BreadcrumbSeparator className={isLast ? "block" : "hidden md:block"} />
              )}
              <BreadcrumbItem className={isLast || isFirst ? "block" : "hidden md:block"}>
                {isLast ? (
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
