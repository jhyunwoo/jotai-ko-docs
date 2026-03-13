import type { SectionGroup } from '@/lib/docs'

import { DocsNav } from '@/components/docs-nav'

export function SidebarNav({ groups }: { groups: SectionGroup[] }) {
  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] overflow-y-auto border-r border-border/60 pr-6 lg:block">
      <DocsNav groups={groups} />
    </aside>
  )
}

