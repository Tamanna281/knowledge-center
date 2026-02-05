// src/components/hierarchy/OrgNode.tsx
'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, User, Shield, Plus, X, Trash2, Pencil, GripVertical, Save } from 'lucide-react'
import AddUserForm from './AddUserForm'
import { deleteUser } from '@/actions/delete-user'
import { updateUser } from '@/actions/update-user'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

type OrgUser = {
  id: string
  name: string
  email: string
  role: { name: string }
  managerId?: string | null
  children: OrgUser[]
}

// 1. Define the Role Type
type RoleOption = { id: string; name: string }

// Helper for search matching
function hasMatch(node: OrgUser, query: string): boolean {
  if (!query) return false
  if (node.name.toLowerCase().includes(query.toLowerCase())) return true
  if (node.role.name.toLowerCase().includes(query.toLowerCase())) return true
  return node.children.some(child => hasMatch(child, query))
}

export default function OrgNode({
  node,
  isLast = true,
  searchQuery = '',
  existingRoles = [], // 2. Accept the list of roles
  userPrivileges = [] // Current user's privileges
}: {
  node: OrgUser,
  isLast?: boolean,
  searchQuery?: string,
  existingRoles?: RoleOption[], // Type definition
  userPrivileges?: string[] // Current user's privileges
}) {
  // Check privileges
  const canAddUser = userPrivileges.includes('ADD_USER')
  const canDeleteUser = userPrivileges.includes('DELETE_USER')
  const [isOpen, setIsOpen] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const children = node.children || []
  const isAdmin = node.role.name === 'ADMIN'

  // === SEARCH LOGIC ===
  const isDirectMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase())
  const isChildMatch = searchQuery && children.some(child => hasMatch(child, searchQuery))

  useEffect(() => {
    if (searchQuery && isChildMatch) {
      setIsOpen(true)
    }
  }, [searchQuery, isChildMatch])

  const isDimmed = searchQuery && !isDirectMatch && !isChildMatch

  // === DRAG & DROP ===
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id })
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: node.id,
    disabled: isAdmin,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  }

  const handleUpdate = async (formData: FormData) => {
    try {
      await updateUser(node.id, formData)
      setIsEditing(false)
    } catch (err: any) {
      alert(err.message || 'Failed to update user')
    }
  }

  const handleDelete = async () => {
    if (confirm(`Delete ${node.name}?`)) {
      try {
        await deleteUser(node.id)
        window.location.reload()
      } catch (err: any) {
        alert(err.message || 'Failed to delete user')
      }
    }
  }

  const editInputStyle = "w-full p-1.5 border border-gray-300 rounded text-sm bg-white text-gray-900 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"

  return (
    <div className={`relative pl-6 transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
      {!isLast && <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300 -translate-x-1/2" />}
      <div className="absolute left-0 top-6 w-6 h-px bg-gray-300 -translate-x-1/2" />
      <div className="absolute left-0 top-0 h-6 w-px bg-gray-300 -translate-x-1/2" />

      <div className="py-2">
        <div className="flex items-center gap-3">

          <div ref={setDropRef} className={`transition-all duration-200 ${isOver ? 'scale-105' : ''}`}>
            <div
              ref={setDragRef}
              style={style}
              {...attributes}
              className={`group flex items-center gap-3 p-3 rounded-lg shadow-sm border w-fit min-w-[320px] relative z-10 
                ${isDirectMatch ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200' : 'bg-white border-gray-200'}
                ${isOver ? '!border-green-500 !bg-green-50' : ''}
              `}
            >
              {!isAdmin && (
                <div {...listeners} className="cursor-grab text-gray-300 hover:text-gray-600">
                  <GripVertical size={14} />
                </div>
              )}
              {isAdmin && <div className="w-3.5" />}

              <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={children.length === 0}
                onPointerDown={(e) => e.stopPropagation()}
                className={`p-1 rounded transition-colors ${children.length > 0 ? 'hover:bg-gray-100 text-gray-500' : 'invisible'}`}
              >
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isAdmin ? <Shield size={18} className="text-purple-600" /> : <User size={18} className="text-blue-600" />}

              <div className="flex-grow">
                {isEditing ? (
                  <form action={handleUpdate} className="flex flex-col gap-2 min-w-[180px]" onPointerDown={(e) => e.stopPropagation()}>
                    <input
                      name="name"
                      defaultValue={node.name}
                      className={editInputStyle}
                      placeholder="Name"
                    />
                    <input
                      name="role"
                      defaultValue={node.role.name}
                      className={editInputStyle}
                      placeholder="Role"
                    />
                    <button type="submit" className="flex items-center justify-center gap-1 bg-green-600 text-white text-xs font-bold p-1.5 rounded hover:bg-green-700 transition">
                      <Save size={12} /> Save
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col">
                    <span className={`text-sm ${isDirectMatch ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                      {node.name}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">{node.role.name}</span>
                  </div>
                )}
              </div>

              {/* ACTIONS: Protect ROOT Admin and all ADMINs, check privileges */}
              {!isEditing && !isAdmin && node.email !== 'bhavya.jn2804@gmail.com' && canDeleteUser && (
                <div className="flex gap-1 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => e.stopPropagation()}>
                  <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-blue-600">
                    <Pencil size={14} />
                  </button>
                  <button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-700 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Only show add button if user has ADD_USER privilege */}
          {canAddUser && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`p-2 rounded-full transition-colors relative z-10 ${showAddForm ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'}`}
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="ml-10 mt-2 max-w-xs border-l-2 border-dashed border-gray-300 pl-4">
            {/* 3. Pass roles to the Form */}
            <AddUserForm managerId={node.id} existingRoles={existingRoles} />
          </div>
        )}

        {isOpen && children.length > 0 && (
          <div className="mt-2 ml-4">
            {children.map((child, index) => (
              <OrgNode
                key={child.id}
                node={child}
                isLast={index === children.length - 1}
                searchQuery={searchQuery}
                existingRoles={existingRoles} // 4. Pass roles down recursively
                userPrivileges={userPrivileges} // Pass privileges down recursively
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}