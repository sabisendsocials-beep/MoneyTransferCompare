import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Eye, ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  published_at: string;
  category: string;
  featured_image?: string;
  view_count: number;
  featured: boolean;
  tags?: string[];
}

const categories = [
  { value: "", label: "All Posts" },
  { value: "money-transfer-guides", label: "Transfer Guides" },
  { value: "market-analysis", label: "Market Analysis" },
  { value: "provider-reviews", label: "Provider Reviews" },
  { value: "news", label: "News & Updates" },
];

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState("");
  
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['/api/blog', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory ? `/api/blog?category=${selectedCategory}` : '/api/blog';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch blog posts');
      return response.json();
    }
  });

  const { data: featuredPosts = [] } = useQuery({
    queryKey: ['/api/blog/featured'],
    queryFn: async () => {
      const response = await fetch('/api/blog/featured');
      if (!response.ok) throw new Error('Failed to fetch featured posts');
      return response.json();
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCategory = (category: string) => {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <>
      <Helmet>
        <title>Money Transfer Blog - Expert Guides & Market Analysis | SabiSend</title>
        <meta 
          name="description" 
          content="Read expert guides on international money transfers, market analysis, and provider reviews. Stay informed about exchange rates and remittance trends." 
        />
        <meta name="keywords" content="money transfer blog, remittance guides, exchange rate analysis, provider reviews" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Money Transfer Insights
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Expert guides, market analysis, and the latest trends in international money transfers
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Featured Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredPosts.map((post: BlogPost) => (
                  <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {post.featured_image && (
                      <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{formatCategory(post.category)}</Badge>
                        <Badge variant="outline">Featured</Badge>
                      </div>
                      <CardTitle className="line-clamp-2">
                        <Link href={`/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                          {post.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(post.published_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {post.view_count}
                          </span>
                        </div>
                        <Link href={`/blog/${post.slug}`}>
                          <Button variant="ghost" size="sm">
                            Read More <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Separator className="mt-12" />
            </section>
          )}

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          {/* All Posts */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              {selectedCategory ? `${formatCategory(selectedCategory)} Articles` : 'Latest Articles'}
            </h2>
            
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                    <CardHeader>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post: BlogPost) => (
                  <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {post.featured_image ? (
                      <img 
                        src={post.featured_image} 
                        alt={post.title}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{formatCategory(post.category)}</Badge>
                        {post.featured && <Badge variant="outline">Featured</Badge>}
                      </div>
                      <CardTitle className="line-clamp-2">
                        <Link href={`/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                          {post.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(post.published_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {post.view_count}
                          </span>
                        </div>
                        <Link href={`/blog/${post.slug}`}>
                          <Button variant="ghost" size="sm">
                            Read More <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No posts found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedCategory 
                    ? `No articles found in the ${formatCategory(selectedCategory)} category.`
                    : "No blog posts have been published yet."
                  }
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default Blog;