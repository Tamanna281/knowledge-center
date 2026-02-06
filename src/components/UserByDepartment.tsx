"use client"
import { useState } from 'react'

export default function UsersByDepartment({ users }: { users: any[] }) {
    // Group users by Department name (and then Branch)
    const grouped = users.reduce((acc, user) => {
        const deptName = user.department?.name || 'Unassigned Dept'
        const branchName = user.branch?.name || 'Unassigned Branch'
        const key = `${branchName} > ${deptName}`

        if (!acc[key]) acc[key] = []
        acc[key].push(user)
        return acc
    }, {} as Record<string, any[]>)

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 mb-6">
                Users by Department
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(grouped).map(([groupName, groupUsers]) => (
                    <div key={groupName} className="border border-emerald-100 rounded-lg overflow-hidden bg-emerald-50/30">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-white font-medium text-sm">
                            {groupName}
                        </div>
                        <div className="p-4 space-y-2 max-h-60 overflow-y-scroll">
                            {(groupUsers as any[]).map(u => (
                                <div key={u.id} className="flex items-center space-x-3 p-2 bg-white rounded shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                        {u.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-800">{u.username || u.email}</div>
                                        <div className="text-xs text-gray-500">{u.role?.name || 'USER'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
