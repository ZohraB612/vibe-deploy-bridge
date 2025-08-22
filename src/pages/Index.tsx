import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowRight, 
  Cloud, 
  Zap, 
  Shield, 
  CheckCircle,
  Code,
  Rocket,
  Users,
  Star,
  User,
  LogOut,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useAWSStatus } from "@/hooks/use-aws-status";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useState } from "react";
import heroImage from "@/assets/hero-deployment.jpg";

const features = [
  {
    icon: Zap,
    title: "One-Click Deployment", 
    description: "Deploy your applications with a single click. No complex configurations or command-line interfaces required."
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your AWS credentials stay with you. We use industry-standard IAM roles for secure, limited access."
  },
  {
    icon: Cloud,
    title: "Cloud-Ready",
    description: "Automatically configure serverless architecture, CDN, and custom domains for optimal performance."
  }
];

const steps = [
  {
    step: "01",
    title: "Connect AWS",
    description: "One-time setup to securely link your AWS account"
  },
  {
    step: "02", 
    title: "Upload App",
    description: "Drag and drop your application files"
  },
  {
    step: "03",
    title: "Deploy",
    description: "Click deploy and watch your app go live"
  }
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Solo Developer",
    content: "DeployHub turned hours of AWS configuration into a 5-minute process. Game changer!",
    rating: 5
  },
  {
    name: "Mike Rodriguez", 
    role: "Startup Founder",
    content: "Finally, I can focus on building instead of wrestling with cloud infrastructure.",
    rating: 5
  },
  {
    name: "Alex Johnson",
    role: "Designer who codes",
    content: "I went from zero AWS knowledge to having my portfolio live in minutes.",
    rating: 5
  }
];

export default function Index() {
  const { isAuthenticated, user, signOut } = useAuth();
  const { hasAWSConnection, isLoading: isAWSLoading } = useAWSStatus();
  const [showAuth, setShowAuth] = useState(false);
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Cloud className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">DeployHub</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  {/* Show Dashboard only if user has AWS connection */}
                  {!isAWSLoading && hasAWSConnection && (
                    <Link to="/dashboard">
                      <Button variant="ghost">Dashboard</Button>
                    </Link>
                  )}
                  
                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatar_url} alt={user?.name || user?.email} />
                          <AvatarFallback>
                            {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button variant="ghost" onClick={() => setShowAuth(true)}>
                  Login
                </Button>
              )}
              
              {/* Get Started button - show AWS setup for users without connection */}
              {isAuthenticated && !isAWSLoading && !hasAWSConnection ? (
                <Link to="/setup/aws">
                  <Button variant="hero">Connect AWS</Button>
                </Link>
              ) : (
                <Link to="/setup/aws">
                  <Button variant="hero">Get Started</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-subtle overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <Badge className="mb-4">For Vibe Coders & No-Code Builders</Badge>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  Deploy Your Apps to the{" "}
                  <span className="bg-gradient-accent bg-clip-text text-transparent">
                    Cloud
                  </span>{" "}
                  in Minutes
                </h1>
                <p className="text-xl text-muted-foreground mt-6 max-w-xl">
                  Transform your prototypes into production-ready applications. 
                  No cloud expertise required. Just upload, configure, and deploy.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated && !isAWSLoading && hasAWSConnection ? (
                  <Link to="/deploy">
                    <Button size="lg" variant="hero" className="w-full sm:w-auto">
                      Deploy Your Project
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : isAuthenticated && !isAWSLoading && !hasAWSConnection ? (
                  <Link to="/setup/aws">
                    <Button size="lg" variant="hero" className="w-full sm:w-auto">
                      Connect AWS Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/setup/aws">
                    <Button size="lg" variant="hero" className="w-full sm:w-auto">
                      Start Deploying Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <Code className="mr-2 h-5 w-5" />
                  See How It Works
                </Button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>5 minute setup</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-3xl opacity-20"></div>
              <img 
                src={heroImage}
                alt="Cloud deployment visualization"
                className="relative rounded-2xl shadow-elevation w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Why Choose DeployHub</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for Creators, Not Engineers
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We handle the complex cloud infrastructure so you can focus on what you do best - creating amazing applications.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-soft transition-all">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Simple Process</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Three Steps to Production
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From idea to live application in just three simple steps. No technical expertise required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-8">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                    <span className="text-2xl font-bold text-white">{step.step}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-primary transform translate-x-8"></div>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/setup/aws">
              <Button size="lg" variant="hero">
                Get Started Now
                <Rocket className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Loved by Creators</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of creators who've made their deployment dreams come true.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-soft transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Deploy Your Next Big Idea?
            </h2>
            <p className="text-xl opacity-90 mb-8">
              Join thousands of creators who've gone from prototype to production with DeployHub. 
              Your users are waiting.
            </p>
            <Link to="/setup/aws">
              <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-gray-50">
                Start Your First Deployment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-primary">
                  <Cloud className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">DeployHub</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Making cloud deployment accessible to everyone. No engineering degree required.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#" className="block hover:text-foreground transition-colors">Features</a>
                <a href="#" className="block hover:text-foreground transition-colors">Pricing</a>
                <a href="#" className="block hover:text-foreground transition-colors">Documentation</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#" className="block hover:text-foreground transition-colors">Help Center</a>
                <a href="#" className="block hover:text-foreground transition-colors">Contact Us</a>
                <a href="#" className="block hover:text-foreground transition-colors">Status</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#" className="block hover:text-foreground transition-colors">About</a>
                <a href="#" className="block hover:text-foreground transition-colors">Blog</a>
                <a href="#" className="block hover:text-foreground transition-colors">Careers</a>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2024 DeployHub. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm text-muted-foreground mt-4 md:mt-0">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
}