import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Phone, Mail, Shield, FileText, Clock, Users, Menu, ArrowLeft } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import platinumPlanDoc from '@/assets/panda-protect-platinum-warranty-plan.pdf.asset.json';
import termsDoc from '@/assets/panda-protect-terms-and-conditions.pdf.asset.json';

import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
const Terms = () => {
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const TermsAccordionItem = ({ item }: { item: any }) => (
    <div className="bg-brand-orange rounded-lg overflow-hidden shadow-lg border border-orange-400 mb-4">
      <button
        onClick={() => toggleItem(item.id)}
        className="w-full px-6 py-5 text-left flex items-center justify-between text-white hover:bg-orange-600 transition-colors"
      >
        <span className="font-bold text-lg pr-4">{item.title}</span>
        <ChevronDown 
          className={`w-6 h-6 flex-shrink-0 transition-transform duration-300 text-white ${
            openItems[item.id] ? 'rotate-180' : ''
          }`}
        />
      </button>
      
      {openItems[item.id] && (
        <div className="px-6 pb-6 text-gray-800 bg-white border-t border-orange-400 animate-accordion-down">
          <div className="pt-6">
            {item.content}
          </div>
        </div>
      )}
    </div>
  );

  const termsContent = [
    {
      id: 'introduction',
      title: 'Introduction & Our Promise',
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-gray-600">
              We know how important peace of mind is when it comes to car ownership, and that's exactly what we're here to provide.
            </p>
            <p className="text-gray-600">
              With our warranty cover, you're backed by a reliable service that includes comprehensive protection for mechanical and electrical repairs, quick claims payouts, and access to trusted garages across the UK.
            </p>
            <p className="text-gray-600">
              We're committed to making things simple, fair and stress-free - so if something goes wrong, we'll be here to help get you back on the road as quickly as possible.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'warranty-confirmation',
      title: 'Warranty Confirmation & Coverage',
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            Warranty is confirmed when you receive your confirmation email and payment is received.
          </p>
        </div>
      )
    },
    {
      id: 'conditions',
      title: 'Conditions & Requirements',
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            Covers vehicles up to 15 years old and 150,000 miles. Cover begins immediately; pre-existing faults are excluded.
          </p>
        </div>
      )
    },
    {
      id: 'cancellation',
      title: 'Cancellation Rights & Refunds',
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            14-day cooling off period with full refund if no claims made.
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="public-static-page public-legal-page min-h-screen bg-background">
      <DealerPublicHeader />
      <SEOHead 
        title="Terms & Conditions | Panda Protect - Vehicle Warranty Terms"
        description="Read the Panda Protect terms and conditions for comprehensive vehicle warranty cover sold through approved UK motor dealers, including claims, cancellation and refund rules."
        keywords="terms and conditions, warranty terms, vehicle warranty"
        canonical={`${window.location.origin}/terms`}
      />

      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center mb-4">
            <button 
              onClick={() => { if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) navigate(-1); else navigate('/'); }}
              type="button"
              className="flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-all duration-200 bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Terms & Conditions
            </h1>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Simple and Clear - Your Extended Warranty Guide. Everything you need to know about your vehicle warranty coverage explained in plain language.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { href: termsDoc.url, title: 'Terms & Conditions', sub: 'Open PDF' },
            { href: platinumPlanDoc.url, title: 'Platinum Warranty Plan', sub: 'Open PDF' },
          ].map((d) => (
            <a key={d.title} href={d.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-brand-orange text-white px-5 py-4 font-semibold hover:bg-orange-600 transition-colors">
              <FileText className="w-6 h-6 flex-shrink-0" />
              <span className="text-left">
                <span className="block">{d.title}</span>
                <span className="block text-sm font-normal opacity-90">{d.sub}</span>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 text-center">How to make a claim</h2>
          <ol className="space-y-3 text-gray-700 list-decimal pl-5">
            <li>Contact us before any repair work starts.</li>
            <li>Email <a href="mailto:claims@pandaprotect.co.uk" className="font-semibold text-brand-orange break-all">claims@pandaprotect.co.uk</a> with your warranty reference, registration and a description of the fault.</li>
            <li>Or submit your claim online and our claims team will guide you through the next steps.</li>
          </ol>
          <div className="mt-5 text-center">
            <Link to="/make-a-claim/" className="inline-flex items-center justify-center rounded-lg bg-brand-orange text-white px-5 py-3 font-semibold hover:bg-orange-600 transition-colors">Make a claim</Link>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Contact Information</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <Phone className="w-8 h-8 text-brand-orange mx-auto mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-4">Customer Service</h4>
              <a href="tel:03302296547" className="text-2xl font-bold text-brand-orange hover:text-orange-600 transition-colors">
                0330 229 6547
              </a>
            </div>
            <div className="text-center">
              <Mail className="w-8 h-8 text-brand-orange mx-auto mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-4">Email Support</h4>
              <a href="mailto:support@pandaprotect.co.uk" className="text-lg font-semibold text-brand-orange break-all hover:text-orange-600 transition-colors">
                support@pandaprotect.co.uk
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;