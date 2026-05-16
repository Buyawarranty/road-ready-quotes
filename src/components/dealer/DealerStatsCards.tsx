import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Shield, AlertCircle } from 'lucide-react';

interface DealerStatsCardsProps {
  totalQuotes: number;
  activeWarranties: number;
  activeClaims: number;
}

export const DealerStatsCards: React.FC<DealerStatsCardsProps> = ({
  totalQuotes,
  activeWarranties,
  activeClaims,
}) => {
  const stats = [
    { label: 'Total Quotes', value: totalQuotes, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Warranties', value: activeWarranties, icon: Shield, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Active claims', value: activeClaims, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
