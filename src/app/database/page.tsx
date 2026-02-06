import { prisma } from '@/lib/prisma';
import DatabaseClientView from '@/components/DatabaseClientView';

export const dynamic = 'force-dynamic';

export default async function DatabasePage() {
    const data = await prisma.knowledgeBase.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });

    return <DatabaseClientView data={data} />;
}
