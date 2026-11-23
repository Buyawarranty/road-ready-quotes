import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Mail, Clock } from 'lucide-react';
import { CLAIMS_PHONE, CLAIMS_PHONE_TEL } from '@/lib/contactNumbers';

export const TrustSecurityFooter: React.FC = () => {
  return (
    <Card className="border border-border shadow-sm bg-muted/30">
      <CardContent className="p-6 md:p-8">
        <div className="text-center mb-6">
          <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Your trusted warranty partner
          </h3>
          <p className="text-sm text-muted-foreground">
            <a 
              href="https://www.pandaprotect.co.uk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              pandaprotect.co.uk
            </a>
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border border-border">
            <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold text-foreground text-sm mb-1">Contact Claims</p>
              <a 
                href="mailto:claims@pandaprotect.co.uk"
                className="text-sm text-primary hover:underline break-all"
              >
                claims@pandaprotect.co.uk
              </a>
              <a
                href={CLAIMS_PHONE_TEL}
                className="text-sm text-primary hover:underline block mt-1"
              >
                Claims Helpline: {CLAIMS_PHONE}
              </a>
              <p className="text-xs text-muted-foreground mt-1">
                Email us with your warranty number
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border border-border">
            <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold text-foreground text-sm mb-1">Customer Support</p>
              <a 
                href="tel:03302296547" 
                className="text-sm text-primary hover:underline"
              >
                0330 229 6547
              </a>
              <p className="text-xs text-muted-foreground mt-1">
                <a 
                  href="mailto:support@pandaprotect.co.uk"
                  className="hover:text-foreground"
                >
                  support@pandaprotect.co.uk
                </a>
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            <span>Secure Payment</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Mon–Fri, 9am–5:30pm</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
