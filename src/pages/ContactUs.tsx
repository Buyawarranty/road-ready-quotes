import React, { useState } from 'react';
import { MessageCircle, Mail, Clock, Upload, X, ArrowRight, Phone, Rocket, TrendingUp, ShieldCheck, Zap, PoundSterling, Users } from 'lucide-react';
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
        title: '✓ Enquiry sent successfully',
        description: 'Thanks for getting in touch. Our dealer team will be back to you within 1 business day.',
        className: 'bg-green-500 text-white border-green-600 animate-in slide-in-from-top-5 duration-300',
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
        {/* Hero - Dealer focused */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1b2a] via-[#13243b] to-[#0d1b2a] text-white">
          <div className="absolute inset-0 opacity-30 pointer-events-none [background:radial-gradient(circle_at_20%_20%,#eb4b00_0%,transparent_45%),radial-gradient(circle_at_80%_60%,#1e3a5f_0%,transparent_55%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-[0.18em] uppercase">
                  <Rocket className="w-3.5 h-3.5 text-orange-400" /> Motor Trade · Dealer Programme
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  Vehicle warranties for the trade. <span className="text-orange-400">From just 20p a day.</span>
                </h1>
                <p className="text-base sm:text-lg text-white/80 max-w-xl">
                  Increase revenue with dealer car, van and vehicle warranties. Simple dealer sign-up, exclusive trade pricing, and full support to help you sell more cars and grow your dealership profits.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/dealer-portal/signup"
                    className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5"
                  >
                    Start dealer sign-up <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a
                    href="tel:03302295045"
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors"
                  >
                    <Phone className="w-4 h-4" /> Speak to a dealer manager
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-sm text-white/70">
                  <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Trusted UK warranty provider</span>
                  <span className="inline-flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> 60-second onboarding</span>
                  <span className="inline-flex items-center gap-2"><PoundSterling className="w-4 h-4 text-orange-400" /> Exclusive trade pricing</span>
                </div>
              </div>

              {/* Right card */}
              <div className="lg:justify-self-end w-full max-w-md">
                <div className="bg-white text-gray-900 rounded-2xl shadow-2xl border border-white/10 p-6 sm:p-7 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold tracking-[0.18em] uppercase text-gray-500">Dealer programme</p>
                      <p className="text-lg font-bold">Start earning from warranties</p>
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Quick dealer account registration — unlock extra revenue</li>
                    <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Sell extended car, van and vehicle warranties with full dealer support</li>
                    <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Premium trade account pricing and dealer benefits</li>
                    <li className="flex gap-2"><span className="text-orange-500 font-bold">→</span> Dealer dashboard for easy warranty management and tracking</li>
                  </ul>
                  <Link
                    to="/dealer-portal/signup"
                    className="inline-flex w-full items-center justify-center gap-2 bg-[#0d1b2a] hover:bg-[#13243b] text-white font-bold px-5 py-3 rounded-xl transition-colors"
                  >
                    Join the dealer programme <ArrowRight className="w-4 h-4" />
                  </Link>
                  <div className="pt-1"><TrustpilotMicroStarWidget className="max-w-xs" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-12 sm:py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <p className="text-orange-500 text-sm font-bold tracking-[0.18em] uppercase mb-2">Dealer Benefits</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Built for the motor trade. Designed to grow your dealership.
              </h2>
              <p className="text-gray-600 mt-3 text-base sm:text-lg">
                Join our dealer network and access exclusive warranty deals, competitive pricing and a fast setup tailored for your business.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:shadow-md transition-all p-5 sm:p-6">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1.5">{title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact details strip */}
        <section className="py-10 sm:py-12 px-4 bg-[#0d1b2a] text-white">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/60 font-bold">Dealer support</p>
                <a href="tel:03302295045" className="text-lg font-bold hover:text-orange-400">0330 229 5045</a>
                <p className="text-sm text-white/70">Trade account &amp; onboarding</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/60 font-bold">Dealer email</p>
                <a href="mailto:dealers@pandaprotect.co.uk" className="text-lg font-bold hover:text-orange-400 break-all">dealers@pandaprotect.co.uk</a>
                <p className="text-sm text-white/70">Programme enquiries &amp; partnerships</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/60 font-bold">Opening hours</p>
                <p className="text-lg font-bold">Mon–Fri · 9am to 5:30pm</p>
                <button onClick={() => setShowCallbackModal(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold mt-1">Request a callback →</button>
              </div>
            </div>
          </div>
        </section>

        {/* Contact / sign-up form */}
        <section className="py-12 sm:py-16 lg:py-20 px-4 bg-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Left – pitch */}
              <div className="space-y-6 order-2 lg:order-1">
                <div>
                  <p className="text-orange-500 text-sm font-bold tracking-[0.18em] uppercase mb-2">Talk to our dealer team</p>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                    Partner with a trusted UK warranty provider — <span className="text-orange-500">sell more cars</span>.
                  </h2>
                  <p className="text-gray-600 mt-3 text-base sm:text-lg">
                    Tell us a little about your dealership and we'll get you set up with a trade account, exclusive pricing and access to the dealer portal.
                  </p>
                </div>

                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-bold text-gray-900 mb-1">Prefer WhatsApp?</p>
                      <p className="mb-3">Quick question about the dealer programme? Message our trade team and we'll be straight back to you.</p>
                      <a
                        href="https://wa.me/message/SPQPJ6O3UBF5B1"
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm"
                      >
                        WhatsApp the dealer team
                      </a>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Simple dealer sign-up. Start earning from warranties now.</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Fast onboarding via dealer portal. Start selling today.</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Get dealer benefits and boost your warranty sales.</li>
                </ul>
              </div>

              {/* Right – form */}
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 order-1 lg:order-2">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Apply for a dealer account</h3>
                <p className="text-sm text-gray-500 mb-6">Approved in 1–2 business days. No obligation.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-700 font-medium text-sm">Your name <span className="text-red-500">*</span></Label>
                    <Input id="name" name="name" type="text" placeholder="Full name" value={formData.name} onChange={handleInputChange} required className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="company" className="text-gray-700 font-medium text-sm">Dealership / company name</Label>
                    <Input id="company" name="company" type="text" placeholder="e.g. Smith Motors Ltd" value={formData.company} onChange={handleInputChange} className="mt-1" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-gray-700 font-medium text-sm">Business email <span className="text-red-500">*</span></Label>
                      <Input id="email" name="email" type="email" placeholder="you@dealership.co.uk" value={formData.email} onChange={handleInputChange} required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-700 font-medium text-sm">Phone number</Label>
                      <Input id="phone" name="phone" type="tel" placeholder="07…" value={formData.phone} onChange={handleInputChange} pattern="[\d\s\-+]*" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="file-upload" className="text-gray-700 font-medium text-sm">Attach a file (optional)</Label>
                    <p className="text-gray-500 text-xs mb-2">Trade docs, logo or anything useful · Max 20MB</p>
                    {!file ? (
                      <div className="mt-1">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div
                            className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${isDragging ? 'border-orange-500 bg-orange-500/5' : 'border-gray-300 hover:border-orange-500'}`}
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                          >
                            <Upload className="mx-auto h-7 w-7 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">Click to upload or drag &amp; drop</p>
                            <p className="text-xs text-gray-500">PDF, DOC, JPG, PNG up to 20MB</p>
                          </div>
                        </label>
                        <input id="file-upload" name="file-upload" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                      </div>
                    ) : (
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg border flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Upload className="h-5 w-5 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={removeFile} className="text-gray-500 hover:text-red-500">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-gray-700 font-medium text-sm">Tell us about your dealership</Label>
                    <Textarea id="message" name="message" placeholder="Number of cars sold per month, current warranty provider, what you're looking for…" value={formData.message} onChange={handleInputChange} rows={4} className="mt-1" />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="submit" disabled={isSubmitting}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 text-base rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'Sending…' : (<>Send dealer enquiry <ArrowRight className="w-5 h-5" strokeWidth={3} /></>)}
                    </Button>
                    <Link
                      to="/dealer-portal/signup"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0d1b2a] hover:bg-[#13243b] text-white font-bold px-6 py-3 rounded-xl text-base"
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
        <section className="py-12 sm:py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto text-center bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">Boost profits with dealer extended warranties</h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-6 text-base sm:text-lg">
              Join our dealer programme — start earning today with motor trade warranty solutions tailored for your business.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/dealer-portal/signup"
                className="inline-flex items-center justify-center gap-2 bg-white text-orange-600 font-bold px-7 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Start dealer sign-up <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/dealer-portal/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/40 text-white font-semibold px-7 py-3.5 rounded-xl"
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
