// src/lib/config/permissions.ts

// 1. Core App Privileges
export const SYSTEM_PRIVILEGES = [
    { id: 'VIEW_TREE', label: 'View Hierarchy' },
    { id: 'ADD_USER', label: 'Add Employees' },
    { id: 'DELETE_USER', label: 'Delete Employees' },
]

// 2. Transaction Columns
// The AI will check these columns against the user's role before answering.
export const TRANSACTION_COLUMNS = [
    'ItemName',
    'Category',
    'Quantity',
    'Units',
    'Price',
    'TotalCost',
    'PurchaseDate',
    'Supplier',
    'Buyer'
]

// 3. Helper: Only generate "VIEW" access now
export const getFieldPrivileges = (column: string) => {
    return {
        id: `VIEW_${column.toUpperCase()}`,
        label: `Access ${column}`
    }
}
