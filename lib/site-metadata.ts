import type { Metadata } from "next"

type PageMetadataInput = {
  title: string
  description: string
  path: string
  noIndex?: boolean
  openGraphTitle?: string
}

export function pageMetadata({ title, description, path, noIndex = false, openGraphTitle }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: openGraphTitle ?? title,
      description,
      url: path,
      siteName: "Avantia Build",
      type: "website",
    },
  }
}

export function shopDepartmentMetadata(path: string, department: string, description?: string) {
  return pageMetadata({
    title: `${department} Materials | Avantia Build`,
    description: description ?? `Build a clear ${department.toLowerCase()} material request with quantities, specifications, attachments, and jobsite delivery details.`,
    path: `/shop/${path}`,
  })
}
