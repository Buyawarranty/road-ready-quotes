import React, { useState, useMemo } from 'react';
import { ChevronDown, Search, MessageCircle, Phone, Mail, Menu, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SEOHead } from '@/components/SEOHead';
import { FAQSchema } from '@/components/schema/FAQSchema';
import { dealerFaqCategories } from '@/data/dealerFaqs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import pandaSavingsFaq from '@/assets/panda-savings-faq.png';
import { OptimizedImage } from '@/components/OptimizedImage';
import trustpilotBadge from '@/assets/trustpilot-badge.png';
import TrustpilotMicroStarWidget from '@/components/TrustpilotMicroStarWidget';

import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
const FAQ = () => {
  const navigate = useNavigate();
  
  const navigateToQuoteForm = () => {
    navigate('/');
    setTimeout(() => {
      const element = document.getElementById('quote-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAIAnswer, setShowAIAnswer] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [relatedQuestions, setRelatedQuestions] = useState<any[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Common search suggestions based on popular queries
  const commonSearches = [
    'How much does it cost?',
    'What is covered?',
    'How to make a claim?',
    'Electric vehicle warranty',
    'Can I use my own garage?',
    'How to cancel warranty?',
    'Breakdown cover',
    'Service requirements'
  ];

  // Enhanced search suggestions with scoring and instant access
  const getSearchSuggestions = (query: string) => {
    if (!query.trim()) return commonSearches.slice(0, 6);
    
    const lowerQuery = query.toLowerCase();
    const results = [];
    
    // First, check common searches
    const matchingCommon = commonSearches.filter(search => 
      search.toLowerCase().includes(lowerQuery)
    ).map(question => ({ question, type: 'common', score: 10 }));
    
    // Then check all FAQ questions with scoring
    const allQuestions = faqData.flatMap(category => 
      category.questions.map(q => ({
        ...q,
        category: category.category,
        categoryId: category.id
      }))
    );
    
    const matchingQuestions = allQuestions
      .map(q => {
        const questionLower = q.question.toLowerCase();
        const answerLower = q.answer.toLowerCase();
        
        let score = 0;
        
        // Exact question match gets highest score
        if (questionLower === lowerQuery) score = 100;
        // Question starts with query
        else if (questionLower.startsWith(lowerQuery)) score = 80;
        // Question contains query at word boundary
        else if (questionLower.includes(` ${lowerQuery}`)) score = 60;
        // Question contains query anywhere
        else if (questionLower.includes(lowerQuery)) score = 40;
        // Answer contains query
        else if (answerLower.includes(lowerQuery)) score = 20;
        
        // Boost popular questions
        if (q.popular) score += 15;
        
        return { ...q, type: 'faq', score };
      })
      .filter(q => q.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    
    // Combine and limit results
    return [...matchingCommon, ...matchingQuestions]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSuggestionClick = (suggestion: any) => {
    if (typeof suggestion === 'string') {
      // Handle common searches
      setSearchTerm(suggestion);
      setShowSuggestions(false);
    } else {
      // Handle FAQ suggestions - scroll to and open the FAQ item
      setSearchTerm(suggestion.question);
      setShowSuggestions(false);
      
      // Scroll to category first
      setTimeout(() => {
        const categoryElement = document.getElementById(suggestion.categoryId);
        if (categoryElement) {
          categoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Then open the specific FAQ item
          setTimeout(() => {
            setOpenItems(prev => ({
              ...prev,
              [suggestion.id]: true
            }));
            
            // Scroll to the specific FAQ item
            const faqElement = document.getElementById(suggestion.id);
            if (faqElement) {
              faqElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 500);
        }
      }, 100);
    }
  };

  const findRelatedQuestions = (query: string) => {
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const allQuestions = faqData.flatMap(category => 
      category.questions.map(q => ({ ...q, category: category.category }))
    );
    
    const related = allQuestions.filter(q => {
      const questionText = (q.question + ' ' + q.answer).toLowerCase();
      return keywords.some(keyword => questionText.includes(keyword));
    }).slice(0, 3);
    
    return related;
  };

  // Helper function to render text with clickable links
  const renderAnswerWithLinks = (text: string) => {
    // Split text by URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            className="text-brand-orange hover:underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Dealer / motor trade FAQs sourced from the shared data file so the
  // visible content and the FAQPage JSON-LD schema always match.
  const faqData = dealerFaqCategories.map((cat) => ({
    category: cat.category,
    id: cat.id,
    questions: cat.questions.map((q) => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      popular: false as boolean,
    })),
  }));

  // Filter FAQs based on search term
  const filteredFAQs = useMemo(() => {
    if (!searchTerm) return faqData;
    
    return faqData.map(category => ({
      ...category,
      questions: category.questions.filter(
        q => 
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(category => category.questions.length > 0);
  }, [searchTerm]);

  // Get popular questions
  const popularQuestions = faqData
    .flatMap(category => category.questions)
    .filter(q => q.popular)
    .slice(0, 5);

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(categoryId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveCategory(categoryId);
    }
  };

  const generateAIAnswer = async (query: string) => {
    setIsLoadingAI(true);
    setShowAIAnswer(true);
    
    try {
      // Create a comprehensive knowledge base from all FAQ data
      const siteKnowledge = `
        Company: Buy-a-Warranty - Car, Van, and Motorcycle Extended Warranty Provider
        
        Core Services:
        - Extended warranties for cars, vans, and motorcycles
        - Coverage for petrol, diesel, hybrid, PHEV, and electric vehicles
        - One comprehensive Platinum Plan covering mechanical and electrical parts
        - Optional add-ons: Wear & tear, 24/7 recovery, tyre cover, Europe cover, vehicle rental, transfer cover
        
        Key Features:
        - Warranty costs from £12/month
        - Plans available for 1, 2, or 3 years
        - Vehicles up to 15 years old and 150,000 miles eligible
        - Cover begins immediately with no waiting period (pre-existing faults excluded)
        - Fast claim processing (within 90 minutes of approval)
        - Direct payment to garages or reimbursement
        - Claims team: 0330 229 5045 (Mon-Fri 09:00-17:30)
        - Support email: support@pandaprotect.co.uk
        
        Coverage Details:
        - All mechanical and electrical parts
        - Engine, gearbox, drivetrain, turbocharger, fuel systems
        - Cooling, exhaust, brakes, suspension, steering
        - Air conditioning, electrical systems, ECUs, sensors
        - For EVs: drive motors, high-voltage battery, inverters, chargers
        - For hybrids: hybrid motors, batteries, power control units
        - Labour costs and diagnostics included
        
        What's Not Covered:
        - Pre-existing faults
        - Routine maintenance (unless add-on purchased)
        - Accident/collision damage
        - Commercial use (taxi, courier, rental)
        
        Claims Process:
        1. Contact claims team at 0330 229 5045
        2. Get vehicle diagnosed at garage
        3. Garage must contact claims team before repairs
        4. Fast approval and payment process
        
        Additional Services:
        - Can use own garage (must be VAT registered)
        - 14-day cancellation period for full refund
        - Transferable warranty (£30 fee)
        - European coverage available
        - 24/7 breakdown recovery
        - Vehicle rental during repairs
        
        ${faqData.map(category => 
          `${category.category}:\n${category.questions.map(q => 
            `Q: ${q.question}\nA: ${q.answer}`
          ).join('\n\n')}`
        ).join('\n\n')}
      `;

      // Simple AI-like response generation based on keyword matching
      const lowerQuery = query.toLowerCase();
      let response = '';

      if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('how much')) {
        response = 'Our warranty costs start from just £12 per month, depending on your vehicle and coverage level. We offer flexible payment options including paying in full (with savings), 12-month interest-free payments, or monthly Pay As You Go. You can get an instant quote by entering your registration number on our homepage.';
      } else if (lowerQuery.includes('claim') || lowerQuery.includes('repair')) {
        response = 'To make a claim, contact our Claims Team at 0330 229 5045 (Mon-Fri 09:00-17:30) or use our online form. Get your vehicle diagnosed at a garage first, then the garage must contact our claims team before starting repairs. We process claims within 90 minutes of approval and can pay the garage directly.';
      } else if (lowerQuery.includes('cover') || lowerQuery.includes('what') || lowerQuery.includes('include')) {
        response = 'Our Platinum Plan covers all mechanical and electrical parts including engine, gearbox, drivetrain, electrical systems, ECUs, sensors, and labour costs. We cover cars, vans, and motorcycles (petrol, diesel, hybrid, and electric). Optional add-ons available for wear & tear, tyres, Europe cover, and more.';
      } else if (lowerQuery.includes('electric') || lowerQuery.includes('ev') || lowerQuery.includes('hybrid')) {
        response = 'Yes, we cover electric and hybrid vehicles! For EVs we cover drive motors, high-voltage battery, inverters, chargers, and thermal systems. For hybrids we cover all the above plus petrol/diesel engine components, hybrid drive motors, batteries, and power control units.';
      } else if (lowerQuery.includes('garage') || lowerQuery.includes('mechanic')) {
        response = 'You can use your preferred garage for repairs as long as they\'re VAT registered. You can choose a main dealer, but may need to cover the price difference compared to an independent garage. We can also recommend trusted repair centres in our network.';
      } else if (lowerQuery.includes('cancel') || lowerQuery.includes('refund')) {
        response = 'You have 14 days to cancel your warranty for a full refund (if no repairs have been made). After this period, our standard cancellation policy applies. Contact us at support@pandaprotect.co.uk or call 0330 229 5045 for cancellation requests.';
      } else if (lowerQuery.includes('transfer') || lowerQuery.includes('sell') || lowerQuery.includes('new owner')) {
        response = 'Yes, the warranty is transferable to a new owner when you sell your vehicle privately. This adds value to your car and is a great selling point. There is a £30 fee for transferring the warranty. Contact us to arrange the transfer.';
      } else if (lowerQuery.includes('age') || lowerQuery.includes('old') || lowerQuery.includes('mileage') || lowerQuery.includes('eligible')) {
        response = 'We cover vehicles up to 15 years old and up to 150,000 miles. We offer warranty plans for 1, 2, or 3 years. Whether your vehicle is petrol, diesel, hybrid, or electric, we likely have coverage available.';
      } else if (lowerQuery.includes('breakdown') || lowerQuery.includes('recovery') || lowerQuery.includes('roadside')) {
        response = 'We offer 24/7 Vehicle Recovery as an add-on for £4/month. This covers recovery costs when you\'ve already been recovered. We also offer European coverage and vehicle rental during repairs as additional options.';
      } else if (lowerQuery.includes('service') || lowerQuery.includes('maintenance') || lowerQuery.includes('mot')) {
        response = 'Yes, you need to keep up with regular servicing to maintain your warranty validity. Follow the manufacturer\'s service schedule and keep your receipts. Routine maintenance isn\'t covered unless you add our Wear & Tear cover add-on.';
      } else {
        response = `I couldn't find a specific FAQ for "${query}", but I can help! Our comprehensive warranty covers mechanical and electrical parts for cars, vans, and motorcycles. For specific questions, please contact our team at 0330 229 5045 or support@pandaprotect.co.uk. You can also browse our detailed FAQ categories above for more information.`;
      }

      setAiAnswer(response);
    } catch (error) {
      console.error('Error generating AI answer:', error);
      setAiAnswer(`I couldn't find a specific answer for "${query}" in our FAQ. For personalized assistance, please contact our support team at 0330 229 5045 or support@pandaprotect.co.uk. You can also browse our FAQ categories above for related information.`);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Convert FAQ data to schema format
  const faqSchemaData = useMemo(() => {
    return faqData.flatMap(category => 
      category.questions.map(q => ({
        question: q.question,
        answer: q.answer
      }))
    );
  }, []);

  return (
    <>
      <SEOHead 
        title="Dealer FAQs | Motor Trade Warranty Partner | Panda Protect"
        description="Answers for UK motor trade dealers about Panda Protect's partner programme, dealer portal, claims, Fast Payouts, warranty admin and support."
        keywords="dealer warranty FAQ, motor trade warranty, dealer portal, dealer partner programme, AutoTrader integration, fast payouts"
        canonical="https://pandaprotect.co.uk/faq/"
      />
      <FAQSchema faqs={faqSchemaData} />
      
      <DealerPublicHeader />
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <section className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-brand-dark-text mb-4">
                Dealer <span className="text-primary">FAQs</span>
              </h1>
              <p className="text-lg text-brand-dark-text max-w-3xl mx-auto mb-8">
                Answers for UK motor trade dealers — partner programme, dealer portal, claims, Fast Payouts and support.
                Can't find what you're looking for? Our UK team is here to help.
              </p>
              
              {/* Search Bar with Panda Image */}
              <div className="max-w-4xl mx-auto relative">
                <div className="flex items-center gap-6">
                  {/* Search Bar Container */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    <Input
                      type="text"
                      placeholder="Search frequently asked questions..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowSuggestions(false);
                        }
                      }}
                      className="pl-12 pr-4 py-3 text-lg border-2 border-gray-800 focus:border-black rounded-lg"
                      role="combobox"
                      aria-expanded={showSuggestions}
                      aria-haspopup="listbox"
                      autoComplete="off"
                    />
                    
                    {/* Enhanced Auto-suggestions Dropdown */}
                    {showSuggestions && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 z-50 max-h-80 overflow-y-auto">
                        <div className="p-2">
                          <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wide">
                            {searchTerm.length > 0 ? `${getSearchSuggestions(searchTerm).length} Suggestions` : 'Popular Searches'}
                          </div>
                          {getSearchSuggestions(searchTerm).map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-md text-sm text-gray-700 hover:text-primary transition-colors group focus:outline-none focus:bg-gray-50 focus:text-primary"
                              role="option"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleSuggestionClick(suggestion);
                                }
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <Search className="w-4 h-4 text-gray-400 group-hover:text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {typeof suggestion === 'string' ? suggestion : suggestion.question}
                                  </div>
                                  {typeof suggestion !== 'string' && (
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                                        {suggestion.category}
                                      </span>
                                      {suggestion.popular && (
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                          Popular
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                          {getSearchSuggestions(searchTerm).length === 0 && searchTerm.length > 0 && (
                            <div className="px-3 py-4 text-center text-gray-500 text-sm">
                              No suggestions found for "{searchTerm}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Panda with Coins Image */}
                  <div className="flex-shrink-0 hidden md:block">
                    <img 
                      src={pandaSavingsFaq} 
                      alt="Panda mascot saving money with warranty protection" 
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                </div>
              </div>
              
              {/* Quick Category Chips */}
              <div className="max-w-4xl mx-auto mt-6 flex flex-wrap justify-center gap-3">
                {faqData.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => scrollToCategory(category.id)}
                    className="px-[18px] py-[10px] bg-white border border-black rounded-[20px] text-[15px] text-[#6f6f6f] cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:text-black"
                  >
                    {category.category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <h3 className="font-bold text-lg text-brand-dark-text mb-4">Quick Navigation</h3>
                  <nav className="space-y-2">
                    {faqData.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => scrollToCategory(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                          activeCategory === category.id
                            ? 'bg-primary text-white'
                            : 'text-brand-dark-text hover:bg-gray-100'
                        }`}
                      >
                        {category.category}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Popular Questions */}
                {!searchTerm && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="font-bold text-lg text-brand-dark-text mb-4">Popular Questions</h3>
                    <div className="space-y-3">
                      {popularQuestions.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => toggleItem(q.id)}
                          className="w-full text-left text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          {q.question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Savings Section - Hidden on Mobile */}
                {!searchTerm && (
                  <div className="hidden md:block bg-gradient-to-br from-orange-50/50 to-white rounded-lg border border-orange-100 p-5 mt-6">
                    <h3 className="font-semibold text-base text-brand-dark-text mb-3">Save Money with an Extended Car Warranty from Panda Protect</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      Protect your vehicle and your wallet with our trusted UK car warranty plans. Here's why thousands of drivers choose Panda Protect:
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-brand-dark-text mb-1">Save Money on Repairs</h4>
                        <p className="text-muted-foreground text-sm">
                          Avoid unexpected garage bills. With Panda Protect, our extended car warranty can save you thousands compared to paying for major repairs out of pocket.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-brand-dark-text mb-1">Affordable Monthly Payments</h4>
                        <p className="text-muted-foreground text-sm">
                          Spread the cost with small, manageable payments from Buy-A-Warranty that give you peace of mind.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-brand-dark-text mb-1">Comprehensive UK Coverage</h4>
                        <p className="text-muted-foreground text-sm">
                          From engine to electrics, Panda Protect offers plans that cover the essentials that matter most.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-brand-dark-text mb-1">Instant Activation</h4>
                        <p className="text-muted-foreground text-sm">
                          Your protection starts immediately after purchase (excludes pre-existing conditions).
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-brand-dark-text mb-1">Trusted by UK Drivers</h4>
                        <p className="text-muted-foreground text-sm">
                          Join thousands who rely on Panda Protect for reliable, affordable cover.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {searchTerm && (
                <div className="mb-6">
                  <p className="text-brand-dark-text">
                    {filteredFAQs.reduce((total, category) => total + category.questions.length, 0)} 
                    {' '}results found for "{searchTerm}"
                  </p>
                </div>
              )}

              {filteredFAQs.map((category) => (
                <section key={category.id} id={category.id} className="mb-12" itemScope itemType="https://schema.org/FAQPage">
                  <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-primary">
                    <h2 className="text-2xl font-bold text-brand-dark-text">
                      {category.category}
                    </h2>
                    {category.category === 'Getting Started' && (
                      <TrustpilotMicroStarWidget className="max-w-[200px]" />
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {category.questions.map((faq) => (
                      <article key={faq.id} id={faq.id} className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg overflow-hidden" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                        <button
                          onClick={() => toggleItem(faq.id)}
                          className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-orange-600/20 transition-colors"
                        >
                          <div className="flex items-center">
                            <h3 className="font-semibold text-lg text-white pr-4" itemProp="name">
                              {faq.question}
                            </h3>
                            {faq.popular && (
                              <span className="bg-white text-orange-600 text-xs px-2 py-1 rounded-full font-medium">
                                Popular
                              </span>
                            )}
                          </div>
                          <ChevronDown 
                            className={`w-6 h-6 flex-shrink-0 text-white transition-transform duration-300 ${
                              openItems[faq.id] ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        
                        <div className={`overflow-hidden transition-all duration-200 ease-out ${
                          openItems[faq.id] 
                            ? 'max-h-screen opacity-100 animate-accordion-down' 
                            : 'max-h-0 opacity-0'
                        }`}>
                          <div className="px-6 pb-5 bg-white border-t border-orange-200" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                            <div className="pt-4 transform translate-y-0">
                              <div className="text-brand-dark-text leading-relaxed whitespace-pre-line" itemProp="text">
                                {renderAnswerWithLinks(faq.answer)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}

              {/* AI-Generated Answer Section */}
              {showAIAnswer && (
                <section className="mt-8">
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Search className="w-5 h-5" />
                        AI Assistant Response
                      </CardTitle>
                      <CardDescription className="text-blue-600">
                        I couldn't find an exact match in our FAQ, but here's what I found based on our warranty information:
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingAI ? (
                        <div className="flex items-center gap-2 text-blue-700">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Searching our knowledge base...</span>
                        </div>
                      ) : (
                        <div className="prose prose-blue max-w-none">
                          <p className="text-blue-800 leading-relaxed">{aiAnswer}</p>
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-sm text-blue-600">
                          For more specific information, please contact our team at{' '}
                          <a href="tel:03302295045" className="font-medium hover:underline">
                            0330 229 5045
                          </a>{' '}
                          or{' '}
                          <a href="mailto:support@pandaprotect.co.uk" className="font-medium hover:underline">
                            support@pandaprotect.co.uk
                          </a>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Related Questions Section */}
              {searchTerm && filteredFAQs.length === 0 && relatedQuestions.length > 0 && (
                <section className="mt-8">
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-800">
                        <MessageCircle className="w-5 h-5" />
                        Related Questions
                      </CardTitle>
                      <CardDescription className="text-yellow-600">
                        No exact matches found, but these related questions might help:
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {relatedQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSearchTerm(question.question);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-300 hover:bg-yellow-25 transition-colors"
                          >
                            <div className="font-medium text-yellow-800 mb-1">{question.question}</div>
                            <div className="text-sm text-yellow-600">From {question.category}</div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-yellow-200">
                        <p className="text-sm text-yellow-600">
                          Still can't find what you're looking for? Try the AI assistant response above or{' '}
                          <a href="#contact" className="font-medium hover:underline">
                            contact our support team
                          </a>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* No Results Fallback - Only show if no AI answer and no related questions */}
              {searchTerm && filteredFAQs.length === 0 && !showAIAnswer && relatedQuestions.length === 0 && (
                <section className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-brand-dark-text mb-2">
                    No results found
                  </h3>
                  <p className="text-brand-dark-text mb-4">
                    Try searching with different keywords or browse our categories above.
                  </p>
                  <Button 
                    onClick={() => setSearchTerm('')}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-white"
                  >
                    Clear Search
                  </Button>
                </section>
              )}

              {/* Vehicle Coverage Image Section */}
              <section className="my-12">
                <div className="flex justify-center">
                  <img 
                    src="/car-warranty-uk-suv-warranty-uk-2.png" 
                    alt="Car warranty UK SUV warranty - Affordable vehicle protection with savings for cars, motorcycles, and SUVs with panda mascot"
                    className="w-full h-auto max-w-4xl"
                  />
                </div>
              </section>

              {/* Contact Section */}
              <section id="contact" className="bg-white rounded-lg shadow-lg p-8 mt-12">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-brand-dark-text mb-4">
                    Still Need Help?
                  </h2>
                  <p className="text-brand-dark-text mb-6">
                    Can't find the answer you're looking for? Our friendly team is here to help.
                  </p>
                  
                  <div className="space-y-4 max-w-2xl mx-auto">
                    <div className="flex items-start gap-3 text-left">
                      <Phone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-brand-dark-text">
                          Call Us
                        </p>
                        <a href="tel:03302295040" className="text-primary hover:underline">
                          Phone: 0330 229 5040
                        </a>
                        <span className="text-brand-dark-text"> | </span>
                        <a href="tel:03302295045" className="text-primary hover:underline">
                          Claims: 0330 229 5045
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 text-left">
                      <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-brand-dark-text">
                          Email Us
                        </p>
                        <a href="mailto:support@pandaprotect.co.uk" className="text-primary hover:underline">
                          support@pandaprotect.co.uk
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 text-sm text-brand-dark-text">
                    <p>Monday to Friday, 9am to 5pm</p>
                  </div>
                </div>
              </section>

              {/* Complaints Section */}
              <section className="bg-gray-100 rounded-lg p-6 mt-8">
                <h3 className="font-bold text-lg text-brand-dark-text mb-3">
                  Have a Complaint?
                </h3>
                <p className="text-brand-dark-text">
                  We take complaints very seriously. Our UK-based team will look into it properly. 
                  Please email us at{' '}
                  <a 
                    href="mailto:info@pandaprotect.co.uk" 
                    className="text-primary hover:text-primary/80 transition-colors underline"
                  >
                    info@pandaprotect.co.uk
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQ;