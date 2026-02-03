"use client"
import { useState } from 'react'

export default function DepartmentList({ departments, branches, onAddDepartment }: { departments: any[], branches: any[], onAddDepartment: (name: string, branchId: string) => void }) {
    const [name, setName] = useState('')
    const [branchId, setBranchId] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name && branchId) {
            onAddDepartment(name, branchId)
            setName('')
            setBranchId('')
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
                Departments
            </h3>

            <form onSubmit={handleSubmit} className="mb-6 flex gap-3 flex-wrap">
                <input
                    type="text"
                    placeholder="Dept Name"
                    className="border p-2 rounded flex-1 min-w-[120px] focus:ring-2 focus:ring-pink-400 outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="border p-2 rounded flex-1 min-w-[150px] focus:ring-2 focus:ring-pink-400 outline-none bg-white"
                >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
                >
                    Add
                </button>
            </form>

            <div className="space-y-3 max-h-60 overflow-y-auto">
                {departments.length === 0 && <p className="text-gray-400 italic">No departments found.</p>}
                {departments.map(dept => (
                    <div key={dept.id} className="p-3 border rounded-lg bg-gray-50 hover:bg-pink-50 transition-colors">
                        <div className="font-semibold text-gray-800">{dept.name}</div>
                        <div className="text-xs text-gray-500">
                            Branch: {dept.branch?.name || 'Unknown'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
