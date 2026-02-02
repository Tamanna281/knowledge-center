// src/components/hierarchy/SearchInput.tsx
'use client'

import { Search, X } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function SearchInput() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  
  // Initialize with the URL value
  const [term, setTerm] = useState(searchParams.get('q')?.toString() || '')

  const handleSearch = (term: string) => {
    setTerm(term)
    const params = new URLSearchParams(searchParams)
    
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    
    // Update URL without refreshing page
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative w-full max-w-sm mb-6">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
        placeholder="Search employee..."
        value={term}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {term && (
        <button 
          onClick={() => handleSearch('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}