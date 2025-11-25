import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, AlertCircle, Megaphone, MessageCircle, Store, Zap, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type InquiryType = "new-submission" | "correction" | "partnership" | "other";

const Contact = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<InquiryType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const inquiryOptions = [
    {
      type: "new-submission" as InquiryType,
      icon: Store,
      title: "New Submission",
      description: "Announce a shop, brand, pop-up or event",
      color: "text-blue-500"
    },
    {
      type: "correction" as InquiryType,
      icon: AlertCircle,
      title: "Report Issue",
      description: "Noticed incorrect info or missing details",
      color: "text-orange-500"
    },
    {
      type: "partnership" as InquiryType,
      icon: Megaphone,
      title: "Partnership",
      description: "Advertising, collaborations, or offers",
      color: "text-green-500"
    },
    {
      type: "other" as InquiryType,
      icon: MessageCircle,
      title: "Other",
      description: "General inquiries or feedback",
      color: "text-purple-500"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error("Please select an inquiry type");
      return;
    }

    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Here you would typically send the form data to your backend
    console.log("Contact form submitted:", { ...formData, type: selectedType });
    
    toast.success("Message sent successfully! We'll get back to you soon.");
    
    // Reset form
    setFormData({ name: "", email: "", subject: "", message: "" });
    setSelectedType(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Contact Us</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {!selectedType ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">How can we help?</h2>
              <p className="text-muted-foreground">Select the option that best describes your inquiry</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inquiryOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.type}
                    className="cursor-pointer hover:scale-[1.02] transition-all hover:border-primary"
                    onClick={() => setSelectedType(option.type)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-muted ${option.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{option.title}</CardTitle>
                          <CardDescription className="mt-1">{option.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setSelectedType(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change inquiry type
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>
                  {inquiryOptions.find(o => o.type === selectedType)?.title}
                </CardTitle>
                <CardDescription>
                  {inquiryOptions.find(o => o.type === selectedType)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="min-h-[150px]"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">
                      Send Message
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Contact;
