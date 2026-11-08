import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface AdminSectionTab {
  id: string;
  label: React.ReactNode;
  render: () => React.ReactNode;
}

/** One admin section made of several former sections, shown as tabs. `?sub=<id>` picks the tab. */
export const AdminSectionTabs: React.FC<{ tabs: AdminSectionTab[] }> = ({ tabs }) => {
  const [params, setParams] = useSearchParams();
  const sub = params.get('sub');
  const value = tabs.some((t) => t.id === sub) ? (sub as string) : tabs[0]?.id;
  const onChange = (v: string) => {
    const next = new URLSearchParams(params);
    next.set('sub', v);
    setParams(next, { replace: true });
  };
  return (
    <Tabs value={value} onValueChange={onChange} className="w-full min-w-0">
      <div className="mb-4 max-w-full overflow-x-auto overscroll-x-contain">
      <TabsList className="flex h-auto w-max min-w-full justify-start gap-1 sm:w-full sm:flex-wrap">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="min-h-11 shrink-0 font-semibold">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id}>
          {t.render()}
        </TabsContent>
      ))}
    </Tabs>
  );
};
