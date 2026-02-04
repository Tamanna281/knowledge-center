// src/components/hierarchy/AddUserForm.tsx
'use client'

import { createUser } from '@/actions/create-user'
import { useState } from 'react'
import { SYSTEM_PRIVILEGES, TRANSACTION_COLUMNS, getFieldPrivileges } from '@/config/permissions'

type RoleOption = { id: string; name: string }

export default function AddUserForm({
  managerId,
  existingRoles = []
}: {
  managerId: string,
  existingRoles?: RoleOption[]
}) {
  const [isNewRole, setIsNewRole] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const inputStyle = "p-2 border border-gray-300 rounded text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm transition-all w-full"

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await createUser(formData)
      setIsSubmitting(false)
      window.location.reload() // Force refresh to see new user in hierarchy
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-inner w-[420px]">
      <h3 className="text-sm font-bold mb-3 text-gray-700">Add Employee</h3>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      <input type="hidden" name="managerId" value={managerId} />

      <div className="flex flex-col gap-3">
        {/* Basic Fields */}
        <input name="name" placeholder="Name" required className={inputStyle} />
        <input name="email" type="email" placeholder="Email" required className={inputStyle} />
        <input name="password" type="password" placeholder="Password" required minLength={6} className={inputStyle} />

        {/* === ROLE ASSIGNMENT === */}
        <div className="flex flex-col gap-2 p-3 border border-gray-300 rounded bg-white shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role Assignment</label>
            <button
              type="button"
              onClick={() => setIsNewRole(!isNewRole)}
              className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline transition-colors"
            >
              {isNewRole ? "Select Existing Role" : "+ Create New Role"}
            </button>
          </div>

          {isNewRole ? (
            // === NEW ROLE CREATION ===
            <div className="flex flex-col gap-4 animate-in fade-in duration-200 h-64 overflow-y-auto pr-2 custom-scrollbar">
              <input
                name="newRoleName"
                placeholder="New Role Name (e.g. Data Analyst)"
                required={isNewRole}
                className="p-1.5 border-b border-gray-300 text-sm outline-none focus:border-blue-500 placeholder:text-gray-400 sticky top-0 bg-white z-10"
              />

              {/* 1. Core Privileges */}
              <div className="flex flex-col gap-1.5 border-b pb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">App Controls</span>
                {SYSTEM_PRIVILEGES.map(priv => (
                  <label key={priv.id} className="flex items-center gap-2 text-xs text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer">
                    <input type="checkbox" name="privilege" value={priv.id} defaultChecked={priv.id === 'VIEW_TREE'} className="rounded border-gray-300 text-blue-600" />
                    {priv.label}
                  </label>
                ))}
              </div>

              {/* 2. Automated Chatbot Privileges */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Chatbot Knowledge Access</span>
                <p className="text-[10px] text-gray-400 -mt-1 mb-1">Check the data points this role is allowed to ask about.</p>

                <div className="grid grid-cols-2 gap-2">
                  {TRANSACTION_COLUMNS.map(col => {
                    const priv = getFieldPrivileges(col) // Generates simple VIEW_XXX
                    return (
                      <label key={col} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors">
                        <input type="checkbox" name="privilege" value={priv.id} className="rounded border-gray-300 text-blue-600" />
                        <span className="text-[11px] font-medium text-gray-700 truncate" title={col}>{col}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            // === EXISTING ROLE SELECTION ===
            <div className="relative">
              <select
                name="roleId"
                className="w-full p-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded outline-none cursor-pointer"
                defaultValue=""
                required={!isNewRole}
              >
                <option value="" disabled>-- Select a Role --</option>
                {/* --- FILTER APPLIED HERE --- */}
                {existingRoles
                  .filter(r => r.name.toLowerCase() !== 'admin')
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))
                }
              </select>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white p-2.5 rounded text-sm hover:bg-blue-700 transition font-medium mt-2 shadow-sm active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : '+ Create Account'}
        </button>
      </div>
    </form>
  )
}