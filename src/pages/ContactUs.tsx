import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Upload,
  X,
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import contactSupportPanda from '@/assets/contact-support-panda.png';

const acceptedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

const ContactUs = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [callbackData, setCallbackData] = useState({ phone: '', preferredTime: 'Anytime' });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCallbackSubmitting, setIsCallbackSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isOpenNow = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const weekday = parts.find((part) => part.type === 'weekday')?.value;
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    return weekday !== 'Sun' && hour >= 9 && hour < 18;
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'phone' ? value.replace(/[^\d\s\-+]/g, '') : value,
    }));
  };

  const validateFile = (selectedFile: File) => {
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload a file smaller than 20MB.', variant: 'destructive' });
      return false;
    }
    if (!acceptedTypes.includes(selectedFile.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a PDF, DOC, DOCX, JPG, or PNG file.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) setFile(selectedFile);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile && validateFile(selectedFile)) setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    const input = document.getElementById('contact-file') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({ title: 'Please complete the required fields', description: 'Enter your name and email address.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      let fileData = null;
      if (file) {
        const reader = new FileReader();
        const data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        fileData = { name: file.name, size: file.size, type: file.type, data };
      }

      const response = await supabase.functions.invoke('submit-contact', {
        body: { ...formData, file: fileData },
      });
      if (response.error) throw new Error(response.error.message || 'Unable to send your message');

      toast({ title: 'Message sent', description: 'Thank you. Our team will reply within 1–2 business days.' });
      setFormData({ name: '', email: '', phone: '', message: '' });
      removeFile();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again or call us.';
      toast({ title: 'Message not sent', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallback = async (event: React.FormEvent) => {
    event.preventDefault();
    const phone = callbackData.phone.replace(/\D/g, '');
    if (phone.length < 10 || phone.length > 11) {
      toast({ title: 'Check your phone number', description: 'Enter a valid UK phone number.', variant: 'destructive' });
      return;
    }

    setIsCallbackSubmitting(true);
    try {
      const { error } = await supabase.from('abandoned_carts').insert({
        email: `callback_${Date.now()}@callback.temp`,
        phone: callbackData.phone,
        full_name: 'Contact page callback request',
        step_abandoned: 0,
        contact_status: 'new',
        contact_notes: `Callback requested from contact page. Preferred time: ${callbackData.preferredTime}`,
        cart_metadata: { source: 'contact_page', priority: 'urgent', request_type: 'callback' },
      });
      if (error) throw error;
      toast({ title: 'Callback requested', description: 'Our team will call you during business hours.' });
      setCallbackData({ phone: '', preferredTime: 'Anytime' });
    } catch (error) {
      console.error('Callback request error:', error);
      toast({ title: 'Request not sent', description: 'Please call us on 0330 912 2402.', variant: 'destructive' });
    } finally {
      setIsCallbackSubmitting(false);
    }
  };

  const availability = isOpenNow ? 'We’re open — call us now' : 'We’re closed right now — call back during opening hours';

  return (
    <>
      <SEOHead
        title="Contact Panda Protect | Warranty Support & Claims"
        description="Contact Panda Protect for warranty support, claims help, WhatsApp assistance or a callback from our friendly UK team."
      />
      <DealerPublicHeader />

      <main className="contact-page">
        <section className="contact-intro">
          <div className="contact-shell">
            <p className="contact-eyebrow">Contact Us</p>
            <h1>We're Here to Help</h1>
            <p className="contact-lead">
              Whether you have a question, need to make a claim, or just want to chat about your warranty options — our friendly team is ready to help.
            </p>

            <div className="contact-channel-grid">
              <article className="contact-channel-card">
                <div className="contact-channel-heading">
                  <span className="contact-icon contact-icon-orange"><Phone /></span>
                  <div><h2>Customer support</h2><p>Quotes, cover questions and anything about your policy.</p></div>
                </div>
                <a className="contact-detail-link" href="tel:03309122402"><Phone />0330 912 2402</a>
                <a className="contact-detail-link" href="mailto:support@pandaprotect.co.uk"><Mail />support@pandaprotect.co.uk</a>
                <Button asChild className="contact-action contact-action-orange"><a href="mailto:support@pandaprotect.co.uk">Email us <ArrowRight /></a></Button>
                <p className="contact-availability"><Clock3 />{availability}</p>
              </article>

              <article className="contact-channel-card">
                <div className="contact-channel-heading">
                  <span className="contact-icon contact-icon-orange"><FileText /></span>
                  <div><h2>Claims &amp; repairs</h2><p>Start a claim or check progress with our claims team.</p></div>
                </div>
                <a className="contact-detail-link" href="tel:03302295045"><Phone />0330 229 5045</a>
                <a className="contact-detail-link" href="mailto:claims@pandaprotect.co.uk"><Mail />claims@pandaprotect.co.uk</a>
                <Button asChild className="contact-action contact-action-navy"><a href="mailto:claims@pandaprotect.co.uk">Email us <ArrowRight /></a></Button>
                <p className="contact-availability"><Clock3 />{availability}</p>
              </article>

              <article className="contact-channel-card">
                <div className="contact-channel-heading">
                  <span className="contact-icon contact-icon-green"><MessageCircle /></span>
                  <div><h2>WhatsApp</h2><p>Quick question? Message us and we'll be right with you.</p></div>
                </div>
                <Button asChild className="contact-action contact-action-green"><a href="https://wa.me/message/SPQPJ6O3UBF5B1" target="_blank" rel="noopener noreferrer">Start chat <ArrowRight /></a></Button>
                <a className="contact-email-shortcut" href="mailto:support@pandaprotect.co.uk">Email us</a>
                <p className="contact-availability"><Clock3 />Replies during opening hours</p>
              </article>
            </div>

            <div className="contact-hours-strip">
              <span><Clock3 />Customer support: Monday – Saturday · 9am to 6pm</span>
              <span><Clock3 />Claims &amp; repairs: Monday – Friday · 9am to 5pm</span>
              <span className="contact-rating">Excellent <strong>★★★★★</strong></span>
            </div>
          </div>
        </section>

        <section className="contact-form-section">
          <div className="contact-shell contact-form-grid">
            <div className="contact-message-card">
              <div className="contact-section-heading">
                <h2>Drop us a message</h2>
                <p>We'd love to hear from you — we'll get back to you within 1–2 business days.</p>
              </div>

              <form onSubmit={handleSubmit} className="contact-message-form">
                <div className="contact-field contact-field-full">
                  <Label htmlFor="contact-name">Name <span>*</span></Label>
                  <Input id="contact-name" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="contact-field">
                  <Label htmlFor="contact-email">Email <span>*</span></Label>
                  <Input id="contact-email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="contact-field">
                  <Label htmlFor="contact-phone">Phone <small>(optional)</small></Label>
                  <Input id="contact-phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div className="contact-field contact-field-full">
                  <Label htmlFor="contact-file">Attachment <small>(optional)</small></Label>
                  <p className="contact-field-help">Accepted formats: PDF, DOC, DOCX, JPG, PNG — up to 20MB</p>
                  {!file ? (
                    <label htmlFor="contact-file" className={`contact-upload ${isDragging ? 'is-dragging' : ''}`}>
                      <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
                        <Upload />
                        <span>Click to upload or drag and drop</span>
                      </div>
                      <input id="contact-file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                    </label>
                  ) : (
                    <div className="contact-uploaded-file">
                      <span><FileText />{file.name}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={removeFile} aria-label="Remove attachment"><X /></Button>
                    </div>
                  )}
                </div>
                <div className="contact-field contact-field-full">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea id="contact-message" name="message" rows={6} placeholder="How can we help?" value={formData.message} onChange={handleInputChange} />
                </div>
                <div className="contact-submit-row">
                  <Button type="submit" disabled={isSubmitting} className="contact-action contact-action-orange">
                    {isSubmitting ? 'Sending…' : <>Send message <ArrowRight /></>}
                  </Button>
                </div>
              </form>
            </div>

            <aside className="contact-side-column">
              <form className="contact-callback-card" onSubmit={handleCallback}>
                <div className="contact-callback-heading">
                  <span className="contact-icon contact-icon-soft"><Phone /></span>
                  <div><h2>Prefer us to call you?</h2><p>Leave your number and we'll call you back at a time that suits you.</p></div>
                </div>
                <div className="contact-field">
                  <Label htmlFor="callback-phone">Phone number <span>*</span></Label>
                  <Input id="callback-phone" type="tel" placeholder="e.g. 07123 456789" value={callbackData.phone} onChange={(event) => setCallbackData((current) => ({ ...current, phone: event.target.value.replace(/[^\d\s\-+]/g, '') }))} required />
                </div>
                <div className="contact-field">
                  <Label htmlFor="callback-time">Preferred time</Label>
                  <select id="callback-time" value={callbackData.preferredTime} onChange={(event) => setCallbackData((current) => ({ ...current, preferredTime: event.target.value }))}>
                    <option>Anytime</option>
                    <option>Morning</option>
                    <option>Afternoon</option>
                    <option>Early evening</option>
                  </select>
                </div>
                <Button type="submit" disabled={isCallbackSubmitting} className="contact-action contact-action-callback">
                  {isCallbackSubmitting ? 'Requesting…' : <>Request a callback <ArrowRight /></>}
                </Button>
                <p className="contact-callback-note"><Clock3 />We'll call you within business hours (Mon – Sat, 9am to 6pm).</p>
              </form>

              <img className="contact-panda" src={contactSupportPanda} alt="Panda Protect customer support panda at a desk answering the phone" loading="lazy" width={1024} height={1024} />
            </aside>
          </div>
        </section>

        <section className="contact-location-section">
          <div className="contact-shell contact-location-grid">
            <article><Clock3 /><div><h2>Opening hours</h2><p>Customer support: Monday – Saturday, 9am to 6pm</p><p>Claims &amp; repairs: Monday – Friday, 9am to 5pm</p></div></article>
            <article><MapPin /><div><h2>Postal address</h2><p>Buy A Warranty Limited, Warranty House, 62 Berkhamsted Avenue, Wembley, London, HA9 6DT, United Kingdom</p></div></article>
          </div>
        </section>

        <section className="contact-quote-band">
          <div className="contact-shell">
            <div className="contact-quote-copy"><span className="contact-quote-icon"><MessageCircle /></span><div><h2>Looking for warranty cover instead?</h2><p>Get a personalised quote in under 60 seconds.</p></div></div>
            <Button asChild className="contact-action contact-action-orange"><Link to="/#hero-reg">Get my quote <ArrowRight /></Link></Button>
            <p>Drive with<br /><strong>confidence.</strong></p>
          </div>
        </section>
      </main>
    </>
  );
};

export default ContactUs;