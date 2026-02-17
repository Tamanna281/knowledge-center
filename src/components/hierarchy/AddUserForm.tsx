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

  const inputStyle = "p-2 border border-white/20 rounded text-sm bg-black/40 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none shadow-sm transition-all w-full"

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
    <form action={handleSubmit} className="mt-4 p-4 border border-white/10 rounded-xl bg-white/5 shadow-2xl w-[420px] backdrop-blur-xl">
      <h3 className="text-sm font-bold mb-3 text-slate-300">Add Employee</h3>

      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
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
        <div className="flex flex-col gap-2 p-3 border border-white/10 rounded bg-white/5 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role Assignment</label>
            <button
              type="button"
              onClick={() => setIsNewRole(!isNewRole)}
              className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 underline transition-colors"
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
                className="p-1.5 border-b border-white/10 text-sm outline-none focus:border-purple-500 bg-transparent text-white placeholder:text-gray-500 sticky top-0 z-10"
              />

              {/* 1. Core Privileges */}
              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">App Controls</span>
                {SYSTEM_PRIVILEGES.map(priv => (
                  <label key={priv.id} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-white/5 p-1 rounded cursor-pointer">
                    <input type="checkbox" name="privilege" value={priv.id} defaultChecked={priv.id === 'VIEW_TREE'} className="rounded border-white/20 bg-black/40 text-purple-500" />
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
                      <label key={col} className="flex items-center gap-2 p-1.5 bg-white/5 rounded border border-white/5 cursor-pointer hover:border-purple-500/30 transition-colors">
                        <input type="checkbox" name="privilege" value={priv.id} className="rounded border-white/20 bg-black/40 text-purple-500" />
                        <span className="text-[11px] font-medium text-slate-300 truncate" title={col}>{col}</span>
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
                className="w-full p-2 text-sm text-white bg-black/40 border border-white/10 rounded outline-none cursor-pointer"
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
          className="bg-purple-600 text-white p-2.5 rounded-lg text-sm hover:bg-purple-700 transition font-bold mt-2 shadow-lg shadow-purple-500/20 active:scale-95 disabled:bg-slate-700 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : '+ Create Account'}
        </button>
      </div>
    </form>
  )
}