import React, { useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDealerQuoteTemplates, DealerQuoteTemplateInput } from '@/hooks/useDealerQuoteTemplates';

interface Props {
  getSelection: () => Omit<DealerQuoteTemplateInput, 'name'>;
  className?: string;
}

export const SaveQuoteTemplateButton: React.FC<Props> = ({ getSelection, className }) => {
  const { saveTemplate } = useDealerQuoteTemplates();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    const sel = getSelection();
    setName(`${sel.term} month · £${sel.excess} excess`);
    setOpen(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'Give your template a name', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveTemplate({ ...getSelection(), name: trimmed });
      toast({ title: 'Template saved', description: 'Apply it any time from Quick quote.' });
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Could not save template', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          className ||
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-orange-300 bg-white text-orange-700 hover:border-orange-500'
        }
      >
        <Bookmark className="w-3.5 h-3.5" /> Save as template
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save these settings as a template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Template name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard 12 month cover"
              maxLength={60}
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Saves your cover term, excess, labour rate, parts contribution, claim limit and price.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SaveQuoteTemplateButton;
