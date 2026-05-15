import React, { useState } from 'react';
import { MessageCircle, Mail, Clock, Upload, X, ArrowRight, Phone, Rocket, TrendingUp, ShieldCheck, Zap, PoundSterling, Users, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import RequestCallbackModal from '@/components/modals/RequestCallbackModal';

import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TrustpilotMicroStarWidget from '@/components/TrustpilotMicroStarWidget';

import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';

const ContactUs = () => {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const filteredValue = value.replace(/[^\d\s\-+]/g, '');
      setFormData({ ...formData, [name]: filteredValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Please upload a file smaller than 20MB.', variant: 'destructive' });
        return;
      }
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({ title: 'Invalid file type', description: 'Please upload a PDF, DOC, DOCX, JPG, or PNG file.', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.size > 20 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Please upload a file smaller than 20MB.', variant: 'destructive' });
        return;
      }
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(droppedFile.type)) {
        toast({ title: 'Invalid file type', description: 'Please upload a PDF, DOC, DOCX, JPG, or PNG file.', variant: 'destructive' });
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast({ title: 'Missing Information', description: 'Please fill in your name and email address.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let fileData = null;
      if (file) {
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        fileData = { name: file.name, size: file.size, type: file.type, data: fileBase64 };
      }

      const message = `[Dealer Enquiry]${formData.company ? ` Company: ${formData.company}.` : ''}\n\n${formData.message || ''}`.trim();

      const response = await supabase.functions.invoke('submit-contact', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message,
          file: fileData
        }
      });

      if (response.error) throw new Error(response.error.message || 'Failed to submit dealer enquiry');

      toast({
        title: 'Enquiry sent successfully',
        description: 'Thanks for getting in touch. Our dealer team will be back to you within 1 business day.',
      });

      setFormData({ name: '', email: '', phone: '', company: '', message: '' });
      setFile(null);
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({ title: 'Submission failed', description: error.message || 'Please try again or call us at 0330 229 5045.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    { icon: PoundSterling, title: 'Warranties from 20p a day', desc: 'Sharp trade pricing designed to boost dealer margins on every car you sell.' },
    { icon: Zap, title: '60-second onboarding', desc: 'Fast dealer sign-up via the dealer portal. Start selling extended warranties today.' },
    { icon: TrendingUp, title: 'Boost sales & profit', desc: 'Add a high-margin product to every deal and unlock exclusive trade account pricing.' },
    { icon: ShieldCheck, title: 'Trusted UK provider', desc: 'Reliable motor trade warranty solutions backed by full claims and dealer support.' },
    { icon: Users, title: 'Dedicated dealer support', desc: 'Real people, real resources — designed to help you maximise warranty sales.' },
    { icon: Rocket, title: 'Dealer dashboard', desc: 'Manage quotes, warranties and customers from one easy dealer portal.' },
  ];

  return (
    <>
      <DealerPublicHeader />
      <SEOHead
        title="Dealer Warranty Programme | Trade Account Sign Up | Panda Protect"
        description="Increase revenue with dealer car warranties from 20p a day. Fast 60-second onboarding via our dealer portal. Join the UK motor trade warranty programme today."
        keywords="dealer car warranties, dealer van warranties, motor trade warranty provider, trade account car warranties, dealer extended warranties, dealer portal, dealer programme, dealer sign up, motor trade warranties, dealer warranty programme"
      />

      <div className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-xs font-semibold tracking-wide uppercase">
                  Dealer Programme
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.05]">
                  Vehicle warranties for the trade.{' '}
                  <span className="text-orange-500">From 20p a day.</span>
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                  Boost dealer profits with car, van and vehicle warranties. Simple sign-up, exclusive trade pricing and full support to help you sell more cars.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    to="/dealer-portal/signup"
                    className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3.5 rounded-lg transition-colors"
                  >
                    Free dealer sign-up <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="tel:03302295045"
                    className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-semibold px-6 py-3.5 rounded-lg transition-colors"
                  >
                    <Phone className="w-4 h-4" /> 0330 229 5045
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-orange-500" /> 60-second onboarding</span>
                  <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-orange-500" /> Exclusive trade pricing</span>
                  <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-orange-500" /> Trusted UK provider</span>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 sm:p-7 space-y-5">
                  <div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-orange-500">Why dealers choose us</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">Earn more on every deal</p>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Quick dealer account registration',
                      'Sell extended car, van & vehicle warranties',
                      'Premium trade account pricing',
                      'Easy dealer dashboard & tracking',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                        <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-gray-200">
                    <TrustpilotMicroStarWidget className="max-w-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-20 px-4 bg-gray-50 border-b border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-10">
              <p className="text-orange-500 text-xs font-semibold tracking-wider uppercase mb-2">Dealer benefits</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                Built for the motor trade.
              </h2>
              <p className="text-gray-600 mt-3 text-lg">
                Join our dealer network and access exclusive warranty deals, competitive pricing and a fast setup tailored for your business.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-gray-200 bg-white p-6 hover:border-orange-300 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base mb-1.5">{title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact strip */}
        <section className="py-12 px-4 bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Phone, label: 'Dealer support', value: '0330 229 5045', sub: 'Trade account & onboarding', href: 'tel:03302295045' },
              { icon: Mail, label: 'Dealer email', value: 'dealers@pandaprotect.co.uk', sub: 'Programme enquiries', href: 'mailto:dealers@pandaprotect.co.uk' },
              { icon: Clock, label: 'Opening hours', value: 'Mon–Fri · 9am–5:30pm', sub: 'Request a callback →', onClick: () => setShowCallbackModal(true) },
            ].map(({ icon: Icon, label, value, sub, href, onClick }) => (
              <div key={label} className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 hover:border-orange-300 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
                  {href ? (
                    <a href={href} className="text-base font-semibold text-gray-900 hover:text-orange-500 break-all">{value}</a>
                  ) : (
                    <p className="text-base font-semibold text-gray-900">{value}</p>
                  )}
                  {onClick ? (
                    <button onClick={onClick} className="text-sm text-orange-500 hover:text-orange-600 font-medium mt-0.5">{sub}</button>
                  ) : (
                    <p className="text-sm text-gray-500">{sub}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="py-16 sm:py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              <div className="lg:col-span-5 space-y-6 order-2 lg:order-1 lg:sticky lg:top-24">
                <div>
                  <p className="text-orange-500 text-xs font-semibold tracking-wider uppercase mb-2">Talk to our dealer team</p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Partner with a trusted UK warranty provider.
                  </h2>
                  <p className="text-gray-600 mt-3 text-lg">
                    Tell us about your dealership and we'll get you set up with a trade account, exclusive pricing and dealer portal access.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold text-gray-900 mb-1">Prefer WhatsApp?</p>
                      <p className="mb-3">Quick question about the dealer programme? Message our trade team.</p>
                      <a
                        href="https://wa.me/message/SPQPJ6O3UBF5B1"
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-sm"
                      >
                        WhatsApp the dealer team
                      </a>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" /> Simple dealer sign-up. Start earning from warranties now.</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" /> Fast onboarding via dealer portal. Start selling today.</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" /> Get dealer benefits and boost your warranty sales.</li>
                </ul>
              </div>

              <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 order-1 lg:order-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Apply for a dealer account</h3>
                <p className="text-sm text-gray-500 mb-6">Approved in 1–2 business days. No obligation.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-700 font-medium text-sm">Your name <span className="text-orange-500">*</span></Label>
                      <Input id="name" name="name" type="text" placeholder="Full name" value={formData.name} onChange={handleInputChange} required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="company" className="text-gray-700 font-medium text-sm">Dealership name</Label>
                      <Input id="company" name="company" type="text" placeholder="e.g. Smith Motors Ltd" value={formData.company} onChange={handleInputChange} className="mt-1.5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-gray-700 font-medium text-sm">Business email <span className="text-orange-500">*</span></Label>
                      <Input id="email" name="email" type="email" placeholder="you@dealership.co.uk" value={formData.email} onChange={handleInputChange} required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-700 font-medium text-sm">Phone number</Label>
                      <Input id="phone" name="phone" type="tel" placeholder="07…" value={formData.phone} onChange={handleInputChange} pattern="[\d\s\-+]*" className="mt-1.5" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-gray-700 font-medium text-sm">Tell us about your dealership</Label>
                    <Textarea id="message" name="message" placeholder="Number of cars sold per month, current warranty provider, what you're looking for…" value={formData.message} onChange={handleInputChange} rows={4} className="mt-1.5" />
                  </div>

                  <div>
                    <Label htmlFor="file-upload" className="text-gray-700 font-medium text-sm">Attach a file (optional)</Label>
                    {!file ? (
                      <div className="mt-1.5">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div
                            className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400 bg-gray-50'}`}
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                          >
                            <Upload className="mx-auto h-6 w-6 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">Click to upload or drag &amp; drop</p>
                            <p className="text-xs text-gray-500">PDF, DOC, JPG, PNG up to 20MB</p>
                          </div>
                        </label>
                        <input id="file-upload" name="file-upload" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                      </div>
                    ) : (
                      <div className="mt-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <Upload className="h-5 w-5 text-orange-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={removeFile} className="text-gray-500 hover:text-orange-500">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="submit" disabled={isSubmitting}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 text-base rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'Sending…' : (<>Send dealer enquiry <ArrowRight className="w-4 h-4" /></>)}
                    </Button>
                    <Link
                      to="/dealer-portal/signup"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-semibold px-6 py-3 rounded-lg text-base"
                    >
                      Quick sign-up
                    </Link>
                  </div>

                  <p className="text-xs text-gray-500 text-center pt-1">By submitting you agree to be contacted about our dealer programme.</p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto text-center bg-orange-500 text-white rounded-2xl p-10 sm:p-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">Boost profits with dealer warranties</h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-7 text-lg">
              Join our dealer programme — start earning today with motor trade warranty solutions tailored for your business.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/dealer-portal/signup"
                className="inline-flex items-center justify-center gap-2 bg-white text-orange-600 font-semibold px-7 py-3.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Start dealer sign-up <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dealer-portal/login"
                className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/10 border border-white text-white font-semibold px-7 py-3.5 rounded-lg"
              >
                Dealer login
              </Link>
            </div>
          </div>
        </section>
      </div>

      <RequestCallbackModal isOpen={showCallbackModal} onClose={() => setShowCallbackModal(false)} />
    </>
  );
};

export default ContactUs;
