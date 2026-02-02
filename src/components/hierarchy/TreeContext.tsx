// src/components/hierarchy/TreeContext.tsx
'use client'

import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { moveUser } from '@/actions/move-user'

export default function TreeContext({ children }: { children: React.ReactNode }) {
  
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) return // Dropped nowhere
    if (active.id === over.id) return // Dropped on self

    // active.id = The User ID being dragged
    // over.id = The User ID of the new Manager
    console.log(`Moving user ${active.id} to manager ${over.id}`)
    
    await moveUser(active.id as string, over.id as string)
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  )
}