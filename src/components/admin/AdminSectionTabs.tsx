import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface AdminSectionTab {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

/** One admin section made of several former sections, shown as tabs. */
export const AdminSectionTabs: React.FC<{ tabs: AdminSectionTab[] }> = ({ tabs }) => (
  <Tabs defaultValue={tabs[0]?.id} className="w-full">
    <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-1">
      {tabs.map((t) => (
        <TabsTrigger key={t.id} value={t.id} className="font-semibold">
          {t.label}
        </TabsTrigger>
      ))}
    </TabsList>
    {tabs.map((t) => (
      <TabsContent key={t.id} value={t.id}>
        {t.render()}
      </TabsContent>
    ))}
  </Tabs>
);
