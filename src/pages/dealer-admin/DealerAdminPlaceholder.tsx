import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
}

const DealerAdminPlaceholder: React.FC<Props> = ({ title, description }) => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Construction className="h-5 w-5 text-primary" /> Dealer-scoped {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This tab mirrors the retail admin's <strong>{title}</strong> feature, scoped to dealer-only data.
          </p>
          <p>
            The UI and functionality from the retail dashboard will be wired up here against dedicated
            <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">dealer_*</code>
            tables, so retail data stays completely isolated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAdminPlaceholder;
