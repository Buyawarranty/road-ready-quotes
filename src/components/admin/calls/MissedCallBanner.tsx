import { PhoneMissed, X, User, MapPin, Clock, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CallRailCall } from '@/hooks/useCallRailPresence';
import { formatDistanceToNow } from 'date-fns';

interface MissedCallBannerProps {
  calls: CallRailCall[];
  onAcknowledge: (callId: string) => void;
}

function formatPhone(phone: string | null) {
  if (!phone) return 'Unknown number';
  const s = phone.replace(/[^0-9+]/g, '');
  if (s.startsWith('+44') && s.length === 13) {
    return `0${s.slice(3)}`;
  }
  return s;
}

export const MissedCallBanner = ({ calls, onAcknowledge }: MissedCallBannerProps) => {
  if (calls.length === 0) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[90] flex flex-col gap-2">
      {calls.map((call, index) => (
        <Card
          key={call.id}
          className="mx-2 mt-2 md:mx-6 md:mt-4 bg-red-600 text-white border-red-700 shadow-2xl"
          style={{ marginTop: index === 0 ? undefined : '0.5rem' }}
        >
          <div className="px-4 py-4 md:px-6 md:py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <PhoneMissed className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg md:text-2xl font-bold truncate">{formatPhone(call.caller_number)}</span>
                  <Badge className="bg-white text-red-700 font-bold text-xs uppercase tracking-wider hover:bg-white">
                    Missed call
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-red-50 text-xs md:text-sm flex-wrap">
                  {call.caller_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {call.caller_name}
                    </span>
                  )}
                  {(call.caller_city || call.caller_state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[call.caller_city, call.caller_state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {call.started_at ? formatDistanceToNow(new Date(call.started_at), { addSuffix: true }) : 'just now'}
                  </span>
                  {call.tracked_number && (
                    <span className="hidden md:inline">via {formatPhone(call.tracked_number)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {call.matched_lead_id && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="hidden md:flex bg-white text-red-700 hover:bg-red-50 font-semibold"
                  asChild
                >
                  <a href={`/dealer-admin/new-leads?id=${call.matched_lead_id}`}>
                    <ExternalLink className="h-4 w-4 mr-1" /> View lead
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                className="bg-white text-red-700 hover:bg-red-50 font-bold"
                onClick={() => onAcknowledge(call.id)}
              >
                <Check className="h-4 w-4 mr-1" /> I got it
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                onClick={() => onAcknowledge(call.id)}
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
