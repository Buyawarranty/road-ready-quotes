import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Calendar, User, Clock, ChevronRight, Phone, Shield, Check, Briefcase, TrendingUp, Wrench } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import pandaHeroImage from '@/assets/blog-hero-panda-mechanic.png';
import warrantyCarImage from '@/assets/blog-hero-warranty-car.png';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();

  const goToDealerSignup = () => navigate('/dealer-portal/signup');

  const blogPosts = [
    {
      id: 1,
      title: "Why Every UK Dealer Should Offer a Trade Warranty in 2026",
      excerpt: "Trade warranties are no longer a nice-to-have. Discover how offering a dealer-branded warranty increases forecourt conversions, reduces comeback costs, and protects your margin on every sale.",
      author: "Sarah Johnson",
      date: "March 18, 2026",
      readTime: "7 min read",
      category: "Trade Warranty Guides",
      image: warrantyCarImage,
      featured: true,
    },
    {
      id: 2,
      title: "Dealer-Paid vs Customer-Paid Warranties: What's Right for Your Forecourt?",
      excerpt: "A side-by-side breakdown of the two dealer warranty models — when to absorb the cost, when to upsell, and how each impacts CSI, repeat business and your bottom line.",
      author: "Mike Thompson",
      date: "March 15, 2026",
      readTime: "6 min read",
      category: "Dealer Strategy",
      image: "/lovable-uploads/car-warranty-uk-compare-quotes.png",
      featured: false,
    },
    {
      id: 3,
      title: "How Trade Warranties Cut Comeback Costs by Up to 80%",
      excerpt: "Every comeback eats into your margin. Learn how a structured trade warranty programme transfers post-sale repair risk away from your workshop and onto a regulated provider.",
      author: "Emma Davis",
      date: "March 12, 2026",
      readTime: "8 min read",
      category: "Workshop & Claims",
      image: pandaHeroImage,
      featured: false,
    },
  ];

  const categories = ['All', 'Trade Warranty Guides', 'Dealer Strategy', 'Workshop & Claims', 'Compliance & FCA', 'Selling Tips'];

  const featuredPost = blogPosts.find((p) => p.featured);
  const filteredPosts = selectedCategory === 'All'
    ? blogPosts.filter((p) => !p.featured)
    : blogPosts.filter((p) => !p.featured && p.category === selectedCategory);
  const recentPosts = filteredPosts.slice(0, 4);
  const olderPosts = filteredPosts.slice(4);

  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "The Warranty Hub — Trade Warranties for UK Dealers",
    "description": "Trade warranty insights, dealer strategy, and forecourt protection guides for UK motor retailers.",
    "url": "https://pandaprotect.co.uk/thewarrantyhub",
    "publisher": {
      "@type": "Organization",
      "name": "Panda Protect",
      "logo": {
        "@type": "ImageObject",
        "url": "https://pandaprotect.co.uk/lovable-uploads/baw-logo-new-2025.png",
      },
    },
  };

  return (
    <>
      <DealerPublicHeader />
      <SEOHead
        title="The Warranty Hub | Trade Warranties for UK Dealers"
        description="Trade warranty advice for UK motor dealers — dealer-paid and customer-paid plans, forecourt protection strategy, and claims insight from Panda Protect."
        keywords="trade warranty UK, dealer warranty, motor trade warranty, forecourt warranty, used car dealer warranty, dealer-paid warranty, trade cover, dealer protection plans"
        canonical="https://pandaprotect.co.uk/thewarrantyhub"
        ogImage={pandaHeroImage}
      />

      <script type="application/ld+json">{JSON.stringify(schemaMarkup)}</script>

      <div className="min-h-screen bg-white">
        {/* Hero */}
        <section className="relative bg-white py-16 md:py-20 border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
              <div className="space-y-6">
                <Badge className="bg-primary text-white px-4 py-1 text-sm font-medium">
                  The Warranty Hub — for the Motor Trade
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Trade Warranty Insight for UK Dealers
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Guides, strategy and claims insight to help motor dealers sell with confidence, cut comebacks, and grow margin on every vehicle.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    size="lg"
                    onClick={goToDealerSignup}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-semibold"
                  >
                    Register Your Dealership
                  </Button>
                  <a href="tel:03302295045">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-2 border-gray-300 text-gray-900 hover:bg-gray-50 px-8 py-6 text-lg font-semibold"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      0330 229 5045
                    </Button>
                  </a>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Built for the Trade</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      'Dealer-paid & customer-paid plans',
                      'White-label warranty options',
                      'Dedicated dealer portal',
                      'Fast claims paid in 90 minutes',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <img
                  src={warrantyCarImage}
                  alt="Panda Protect — trade warranties for UK motor dealers"
                  className="w-full max-w-lg h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trade-only notice */}
        <section className="py-10 bg-gray-50 border-b border-gray-200">
          <div className="container mx-auto px-4 max-w-4xl text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">A Hub Built for the Motor Trade</h2>
            <p className="text-gray-600 text-lg">
              The Warranty Hub is dedicated to trade warranties for UK motor dealers — independents, franchises and forecourts. For retail customer cover, please use our main quote journey.
            </p>
          </div>
        </section>

        {/* Search & Categories */}
        <section className="py-12 bg-white border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search trade warranty guides, claims advice, dealer strategy…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-6 text-base border-2 border-gray-200 focus:border-primary rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {categories.map((category) => (
                  <Button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    className={`px-6 py-2 rounded-full transition-all ${
                      selectedCategory === category
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Featured */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Featured Trade Insight</h2>
                <p className="text-gray-600 text-lg">Our most-read dealer guide this month</p>
              </div>

              {featuredPost && (
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-gray-200 bg-white">
                  <div className="grid lg:grid-cols-2 gap-0">
                    <div className="relative h-80 lg:h-full overflow-hidden bg-white">
                      <img src={featuredPost.image} alt={featuredPost.title} className="w-full h-full object-contain p-4" />
                      <Badge className="absolute top-4 left-4 bg-primary text-white px-4 py-2 text-sm font-semibold shadow-lg">
                        Featured
                      </Badge>
                    </div>

                    <CardContent className="p-8 lg:p-12 flex flex-col justify-center">
                      <div className="space-y-6">
                        <Badge variant="outline" className="border-2 border-primary text-primary font-semibold px-4 py-1">
                          {featuredPost.category}
                        </Badge>
                        <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">{featuredPost.title}</h3>
                        <p className="text-lg text-gray-600 leading-relaxed">{featuredPost.excerpt}</p>

                        <div className="flex items-center gap-6 text-sm text-gray-500 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2"><User className="w-4 h-4" /><span className="font-medium">{featuredPost.author}</span></div>
                          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{featuredPost.date}</span></div>
                          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{featuredPost.readTime}</span></div>
                        </div>

                        <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-semibold group">
                          Read Full Article
                          <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 bg-white border-y border-gray-200">
          <div className="container mx-auto px-4">
            <Card className="max-w-5xl mx-auto bg-gradient-to-r from-primary to-orange-600 border-0">
              <CardContent className="p-8 md:p-12 text-center text-white">
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Ready to Add a Trade Warranty Programme?</h3>
                <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                  Register your dealership and we'll set you up on the Panda Protect dealer portal as soon as we go live.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button size="lg" onClick={goToDealerSignup} className="bg-white text-primary hover:bg-gray-50 px-10 py-6 text-lg font-bold">
                    Register Your Dealership
                  </Button>
                  <div className="flex items-center gap-3 text-white">
                    <div className="h-px w-8 bg-white/50" />
                    <span className="text-lg font-medium">or call</span>
                    <div className="h-px w-8 bg-white/50" />
                  </div>
                  <a href="tel:03302295045" className="text-2xl font-bold hover:underline">0330 229 5045</a>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Grid with sidebar */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-12">
                  <div>
                    <div className="mb-8">
                      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Latest Trade Articles</h2>
                      <p className="text-gray-600 text-lg">
                        {selectedCategory === 'All' ? 'All trade warranty guides & insights' : selectedCategory}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {recentPosts.map((post) => (
                        <Card key={post.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-primary bg-white group">
                          <div className="relative h-48 overflow-hidden bg-white">
                            <img src={post.image} alt={post.title} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
                            <Badge className="absolute top-3 left-3 bg-primary text-white px-3 py-1 text-xs font-semibold shadow-lg">{post.category}</Badge>
                          </div>
                          <CardContent className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors leading-tight line-clamp-2">{post.title}</h3>
                            <p className="text-gray-600 mb-4 text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-4 border-t border-gray-200 pt-4">
                              <div className="flex items-center gap-1"><User className="w-3 h-3" /><span className="font-medium">{post.author}</span></div>
                              <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{post.readTime}</span></div>
                            </div>
                            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 text-sm group/btn">
                              Read Article
                              <ChevronRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {olderPosts.length > 0 && (
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-6">More Trade Articles</h3>
                      <div className="space-y-4">
                        {olderPosts.map((post) => (
                          <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-primary bg-white group">
                            <div className="flex gap-4 p-4">
                              <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden bg-white rounded">
                                <img src={post.image} alt={post.title} className="w-full h-full object-contain" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <Badge className="bg-primary/10 text-primary px-2 py-1 text-xs font-semibold mb-2">{post.category}</Badge>
                                <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors leading-tight line-clamp-2">{post.title}</h4>
                                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">{post.excerpt}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                  <Card className="bg-gradient-to-br from-primary to-orange-600 border-0 overflow-hidden sticky top-4">
                    <CardContent className="p-6 text-white text-center">
                      <Briefcase className="w-12 h-12 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Join the Dealer Network</h3>
                      <p className="text-sm opacity-90 mb-4">Set up your dealership in minutes</p>
                      <Button onClick={goToDealerSignup} className="w-full bg-white text-primary hover:bg-gray-50 font-bold">
                        Register Your Dealership
                      </Button>
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <a href="tel:03302295045" className="text-lg font-bold hover:underline block">0330 229 5045</a>
                        <p className="text-xs opacity-75 mt-1">Mon-Fri 9am-5:30pm</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-gray-200">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Browse by Category</h3>
                      <div className="space-y-2">
                        {categories.filter((c) => c !== 'All').map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                              selectedCategory === category ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-gray-200">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Popular with Dealers</h3>
                      <div className="space-y-4">
                        {blogPosts.slice(0, 3).map((post, index) => (
                          <div key={post.id} className="flex gap-3 group cursor-pointer">
                            <span className="text-2xl font-bold text-gray-300 flex-shrink-0">{index + 1}</span>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors leading-tight mb-1">{post.title}</h4>
                              <p className="text-xs text-gray-500">{post.readTime}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Trade Newsletter</h3>
                      <p className="text-sm text-gray-600 mb-4">Monthly trade warranty tips for UK dealers</p>
                      <Input type="email" placeholder="Your work email" className="mb-3" />
                      <Button className="w-full bg-primary hover:bg-primary/90 text-white">Subscribe</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular topics */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Popular Trade Topics</h2>
                <p className="text-gray-600 text-lg">Explore guides written specifically for the motor trade</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Trade Warranty Guides', count: '12 articles', icon: Shield },
                  { title: 'Dealer Strategy', count: '8 articles', icon: TrendingUp },
                  { title: 'Workshop & Claims', count: '6 articles', icon: Wrench },
                  { title: 'Compliance & FCA', count: '10 articles', icon: Check },
                ].map((topic, index) => (
                  <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 border-gray-200 hover:border-primary bg-white">
                    <CardContent className="text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-100 group-hover:bg-primary/10 rounded-full flex items-center justify-center mx-auto transition-colors">
                        <topic.icon className="w-8 h-8 text-gray-600 group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">{topic.title}</h3>
                      <p className="text-sm text-gray-600">{topic.count}</p>
                      <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5 font-semibold">Browse →</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gray-50 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <Card className="bg-gradient-to-r from-primary to-orange-600 border-0 overflow-hidden">
                <CardContent className="p-12 md:p-16">
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6 text-white">
                      <h2 className="text-4xl md:text-5xl font-bold leading-tight">Grow Your Forecourt with Panda Protect</h2>
                      <p className="text-xl opacity-90 leading-relaxed">
                        Join UK dealers using Panda Protect to add real value to every sale, reduce comebacks, and protect customer satisfaction.
                      </p>
                      <div className="space-y-4 pt-4">
                        {[
                          'Dealer-paid & customer-paid warranty options',
                          'White-label dealer branding available',
                          'Live dealer portal — quote, sell, manage',
                          'UK-based claims team, paid in 90 minutes',
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-3">
                            <Check className="w-6 h-6" />
                            <span className="text-lg">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <Card className="bg-white p-8">
                        <CardContent className="space-y-6">
                          <h3 className="text-2xl font-bold text-gray-900">Register Your Dealership</h3>
                          <Button size="lg" onClick={goToDealerSignup} className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg font-bold">
                            Get Started
                          </Button>
                          <div className="text-center">
                            <p className="text-gray-600 mb-2">Or speak to our trade team</p>
                            <a href="tel:03302295045" className="text-3xl font-bold text-primary hover:text-primary/90">0330 229 5045</a>
                            <p className="text-sm text-gray-500 mt-2">Mon-Fri 9am-5:30pm</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Blog;
