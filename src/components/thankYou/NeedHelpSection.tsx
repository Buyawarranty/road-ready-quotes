import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

export const NeedHelpSection: React.FC = () => {
  const handleContactSupport = () => {
    window.open('https://pandaprotect.co.uk/contact-us/', '_blank');
  };

  return (
    <Card className="border border-border shadow-sm bg-background">
      <CardContent className="p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 text-center">
          Need Help?
        </h2>
        
        <div className="flex justify-center">
          <Button
            onClick={handleContactSupport}
            variant="outline"
            size="lg"
            className="h-auto py-4 flex-col gap-2 hover:border-primary hover:bg-primary/5 w-full md:w-auto md:min-w-[240px]"
          >
            <Mail className="w-6 h-6 text-primary" />
            <span className="font-semibold">Contact Support</span>
            <span className="text-xs text-muted-foreground">Get help from our team</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
