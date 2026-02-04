"use client"
import { useState } from 'react'

export default function BranchList({ branches, onAddBranch }: { branches: any[], onAddBranch: (name: string, location: string) => void }) {
    const [name, setName] = useState('')
    const [location, setLocation] = useState('')

    const [isAdding, setIsAdding] = useState(false)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (name) {
            setIsAdding(true)
            await onAddBranch(name, location)
            setName('')
            setLocation('')
            setIsAdding(false)
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
                Branches
            </h3>

            <form onSubmit={handleSubmit} className="mb-6 flex gap-3">
                <input
                    type="text"
                    placeholder="Branch Name"
                    className="border p-2 rounded flex-1 focus:ring-2 focus:ring-purple-400 outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Location"
                    className="border p-2 rounded flex-1 focus:ring-2 focus:ring-purple-400 outline-none"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={isAdding}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isAdding ? 'Adding...' : 'Add'}
                </button>
            </form>

            <div className="space-y-3 max-h-60 overflow-y-auto">
                {branches.length === 0 && <p className="text-gray-400 italic">No branches found.</p>}
                {branches.map(branch => (
                    <div key={branch.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center group hover:shadow-md transition-all">
                        <div>
                            <div className="font-semibold text-gray-800">{branch.name}</div>
                            {branch.location && <div className="text-xs text-gray-500">{branch.location}</div>}
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-purple-500">
                            {/* potentially adding count of departments or users later */}
                            Details
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
