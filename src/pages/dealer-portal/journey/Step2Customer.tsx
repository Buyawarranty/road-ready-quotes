import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { User, Clock, MessageCircle, Mail, ChevronRight, Info } from 'lucide-react';

type Mode = 'now' | 'later';
type Channel = 'whatsapp' | 'email';

const Step2Customer: React.FC = () => {
  const navigate = useNavigate();
  const { vehicle, customer, setCustomer } = useDealerJourney();
  const { dealer } = useDealerAuth();

  const initialMode: Mode = customer?.address_line2?.startsWith('[Pending:') ? 'later' : 'now';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [note, setNote] = useState('');

  const [form, setForm] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address_line1: customer?.address_line1 || '',
    address_line2: customer?.address_line2?.startsWith('[Pending:') ? '' : (customer?.address_line2 || ''),
    town: customer?.town || '',
    postcode: customer?.postcode || '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle) navigate('/dealer-portal/quote/pricing', { replace: true });
  }, [vehicle, navigate]);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'now') {
      if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address_line1.trim() || !form.town.trim() || !form.postcode.trim()) {
        setError('Please complete all required fields');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) {
        setError('Enter a valid email address');
        return;
      }
      setCustomer(form);
      navigate('/dealer-portal/quote/checkout');
      return;
    }

    // mode === 'later' — stash placeholder so downstream flows can run.
    // Admin/dealer can spot the marker in address_line2.
    const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : 'Email';
    const placeholderEmail = dealer?.email || 'pending@pandaprotect.co.uk';
    const dealerName = dealer?.company_name || dealer?.name || 'Dealer';
    setCustomer({
      name: 'Pending customer details',
      email: placeholderEmail,
      phone: '',
      address_line1: 'To be confirmed',
      address_line2: `[Pending: ${dealerName} to send details via ${channelLabel}]${note ? ` — ${note}` : ''}`,
      town: 'To be confirmed',
      postcode: 'TBC',
    });
    navigate('/dealer-portal/quote/checkout');
  };

  const inputClass = 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-orange-500';

  const ModeTab: React.FC<{ value: Mode; icon: React.ElementType; title: string; sub: string }> = ({ value, icon: Icon, title, sub }) => {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        className={`flex-1 text-left rounded-xl border-2 p-4 transition-all ${
          active ? 'border-orange-500 bg-orange-50/50' : 'border-gray-200 bg-white hover:border-orange-300'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm">{title}</p>
            <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <DealerJourneyLayout
      step={2}
      title="Customer details"
      subtitle="Add the end customer's details now, or send them later via WhatsApp / email."
      backTo="/dealer-portal/quote/pricing"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <ModeTab value="now" icon={User} title="Add details now" sub="Fill in the customer's contact and address." />
          <ModeTab value="later" icon={Clock} title="Send details later" sub="Continue and share the details by WhatsApp or email." />
        </div>

        {mode === 'now' ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Full name *</label>
                <Input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Phone *</label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Address line 1 *</label>
              <Input value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Address line 2</label>
              <Input value={form.address_line2} onChange={(e) => update('address_line2', e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Town *</label>
                <Input value={form.town} onChange={(e) => update('town', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Postcode *</label>
                <Input value={form.postcode} onChange={(e) => update('postcode', e.target.value.toUpperCase())} className={`uppercase ${inputClass}`} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                You can continue without customer details. We'll mark this warranty as <strong>Pending customer details</strong> and your team will add them once you've sent them through.
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">How will you send the details?</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' },
                  { key: 'email', icon: Mail, label: 'Email' },
                ] as const).map(({ key, icon: Icon, label }) => {
                  const active = channel === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setChannel(key)}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                        active
                          ? 'border-orange-500 bg-yellow-300 text-gray-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Quick note (optional)</label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Will send name + address on WhatsApp this afternoon."
                className={inputClass}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-orange-600 font-medium">{error}</p>}

        <div className="flex justify-end">
          <Button
            type="submit"
            className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6"
          >
            Continue to plan & pricing <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </DealerJourneyLayout>
  );
};

export default Step2Customer;
