import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Lightbulb, ThumbsUp, Copy } from "lucide-react";
import { toast } from "sonner";

const opener = `Hi, this is [Your Name] calling from Buy A Warranty regarding the dealer warranty enquiry you submitted. Have I caught you at a good time?`;

const discoveryQuestions = [
  "What type of vehicles do you typically sell?",
  "How many cars do you sell per month on average?",
  "Are you currently offering any warranty product to your customers?",
  "What's the biggest challenge you face when selling warranties?",
  "What would the ideal warranty solution look like for your dealership?",
];

const valueProps = [
  {
    title: "Trusted UK warranty provider",
    detail: "Backed by FCA-regulated processes and Warranties 2000 administration.",
  },
  {
    title: "Flexible plans for every vehicle",
    detail: "Standard, EV, PHEV, motorbike — all covered with tiered claim limits.",
  },
  {
    title: "White-label friendly",
    detail: "Position the warranty under your dealership brand at point of sale.",
  },
  {
    title: "Fast claims handling",
    detail: "Risk-assessed claims processed within 24-48 hours.",
  },
  {
    title: "Transparent pricing",
    detail: "Clear bulk pricing tiers — no hidden fees, no surprises.",
  },
];

const objectionHandlers = [
  {
    objection: "It's too expensive.",
    response:
      "I understand. Compared to a single repair on a modern vehicle (avg £1,200), the warranty pays for itself with one claim. Plus, our bulk dealer pricing makes it 30-40% cheaper than retail.",
  },
  {
    objection: "We already use another provider.",
    response:
      "That's great — you understand the value. May I ask what claim limits you're getting and the labour rate? Most dealers find we beat their current price by £40-£80 per policy at the same coverage level.",
  },
  {
    objection: "Customers don't ask for warranties.",
    response:
      "Right — that's why dealers who succeed with warranties bundle them into the sale. We'll provide pitch scripts and POS materials that lift attach rates by an average of 38%.",
  },
  {
    objection: "I need to think about it.",
    response:
      "Absolutely. To make that easier, would it help if I sent over a one-page summary with sample pricing for the vehicles you sell most? Then we can chat again later this week.",
  },
];

const closingScripts = [
  "Based on what you've told me, the [Plan Name] would be a great fit for your dealership. Shall I get the paperwork started today?",
  "I can have your dealer account active within 24 hours. What email should I send the agreement to?",
  "Would you like to start with a small batch of 10 policies as a trial run?",
];

function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }}
    >
      <Copy className="h-4 w-4" />
    </Button>
  );
}

export default function DealerAdminSalesScript() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" /> Sales Script
        </h1>
        <p className="text-muted-foreground">
          Talking points, discovery questions, and objection handlers for dealer outreach
        </p>
      </div>

      <Tabs defaultValue="opener">
        <TabsList>
          <TabsTrigger value="opener">Opener</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="value">Value Props</TabsTrigger>
          <TabsTrigger value="objections">Objections</TabsTrigger>
          <TabsTrigger value="closing">Closing</TabsTrigger>
        </TabsList>

        <TabsContent value="opener">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" /> Opening Pitch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4 p-4 bg-muted rounded-lg">
                <p className="text-base leading-relaxed">{opener}</p>
                <CopyButton text={opener} />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Tip: Smile while speaking — it changes your tone. Pause after asking if they
                have time.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discovery">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" /> Discovery Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {discoveryQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-4 p-3 border rounded-lg"
                  >
                    <div className="flex gap-3">
                      <Badge variant="outline">{i + 1}</Badge>
                      <span>{q}</span>
                    </div>
                    <CopyButton text={q} />
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="value">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5" /> Key Value Propositions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {valueProps.map((v, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-1">{v.title}</h4>
                    <p className="text-sm text-muted-foreground">{v.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objections">
          <Card>
            <CardHeader>
              <CardTitle>Objection Handlers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {objectionHandlers.map((o, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="destructive">Objection</Badge>
                      <span className="font-medium">{o.objection}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 mt-2 p-3 bg-muted rounded">
                      <div className="flex gap-2 items-start">
                        <Badge variant="default">Response</Badge>
                        <p className="text-sm">{o.response}</p>
                      </div>
                      <CopyButton text={o.response} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closing">
          <Card>
            <CardHeader>
              <CardTitle>Closing Lines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {closingScripts.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-4 p-3 border rounded-lg"
                  >
                    <p>{c}</p>
                    <CopyButton text={c} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
