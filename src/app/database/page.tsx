import { prisma } from '@/lib/prisma';
import DatabaseClientView from '@/components/DatabaseClientView';

export const dynamic = 'force-dynamic';

export default async function DatabasePage() {
    // Fetch from legacy KnowledgeBase
    const kbData = await prisma.knowledgeBase.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });

    // Fetch from new MachineProduct table
    const mpData = await prisma.machineProduct.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });

    // Unified interface for the view
    const unifiedData = [
        ...kbData.map(item => ({
            ...item,
            id: `kb-${item.id}`,
            sourceTable: 'KnowledgeBase'
        })),
        ...mpData.map(item => ({
            id: `mp-${item.id}`,
            title: item.productName || item.modelNumber || 'Untitled Machine',
            content: JSON.stringify(item.metadata || {}),
            category: item.productCategory || 'Machine',
            tags: item.tags.join(', '),
            fileName: item.sourceFile,
            createdAt: item.createdAt,
            sourceTable: 'MachineProduct',
            original: item
        }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return <DatabaseClientView data={unifiedData} />;
}
