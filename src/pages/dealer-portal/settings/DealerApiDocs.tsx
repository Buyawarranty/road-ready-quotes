import React, { useState } from 'react';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Copy, ExternalLink, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const PROJECT_ID = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID || 'mzlpuxzwyrcyrgrongeb';
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/dealer-api-v1`;

const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success('Copied'); };

const Code: React.FC<{ children: string; lang?: string }> = ({ children }) => (
  <div className="relative group">
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed">
      <code>{children}</code>
    </pre>
    <button
      onClick={() => copy(children)}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs flex items-center gap-1"
    >
      <Copy className="h-3 w-3" /> Copy
    </button>
  </div>
);

interface EndpointProps {
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  body?: object;
  response: object;
}

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border-blue-200',
};

const Endpoint: React.FC<EndpointProps> = ({ method, path, title, description, body, response }) => (
  <div className="border rounded-lg bg-white overflow-hidden">
    <div className="p-4 border-b bg-gray-50">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <span className={`px-2 py-1 rounded text-xs font-bold border ${methodColors[method]}`}>{method}</span>
        <code className="text-sm font-mono text-gray-800">{path}</code>
        <span className="text-sm text-gray-600">— {title}</span>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Example request</p>
        <Code>{`curl -X ${method} '${BASE}${path}' \\
  -H 'Authorization: Bearer YOUR_API_KEY'${body ? ` \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(body, null, 2)}'` : ''}`}</Code>
      </div>
      {body && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Request body</p>
          <Code>{JSON.stringify(body, null, 2)}</Code>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Response 200</p>
        <Code>{JSON.stringify(response, null, 2)}</Code>
      </div>
    </div>
  </div>
);

const DealerApiDocs: React.FC = () => {
  const [tab, setTab] = useState('warranties');

  return (
    <DealerLayout>
      <div className="max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dealer REST API</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Integrate Panda Protect warranties directly into your DMS or in-house system.
            Authenticate with an API key and call our REST endpoints to create quotes,
            register warranties, and pull customer data.
          </p>
          <div className="mt-4 flex gap-3 flex-wrap">
            <Link to="/dealer-portal/settings/api">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Key className="h-4 w-4 mr-2" /> Manage API keys
              </Button>
            </Link>
          </div>
        </div>

        {/* Base URL */}
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-2">Base URL</h2>
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm bg-gray-100 px-3 py-2 rounded flex-1 break-all">{BASE}</code>
            <Button size="sm" variant="outline" onClick={() => copy(BASE)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </section>

        {/* Auth */}
        <section className="bg-white border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Authentication</h2>
          <p className="text-sm text-gray-600">
            Pass your API key as a Bearer token in the <code className="bg-gray-100 px-1 rounded">Authorization</code> header.
            Keys start with <code className="bg-gray-100 px-1 rounded">lvf_</code>. Create or revoke keys in the{' '}
            <Link to="/dealer-portal/settings/api" className="text-orange-600 underline">API keys page</Link>.
          </p>
          <Code>{`Authorization: Bearer lvf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
          <p className="text-sm text-gray-600">
            Quick check that your key works:
          </p>
          <Code>{`curl '${BASE}/me' \\
  -H 'Authorization: Bearer YOUR_API_KEY'`}</Code>
        </section>

        {/* Responses */}
        <section className="bg-white border rounded-lg p-5 space-y-2">
          <h2 className="font-semibold text-gray-900">Responses</h2>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li><b>200/201</b> — success, JSON body</li>
            <li><b>400</b> — validation error (missing/invalid fields)</li>
            <li><b>401</b> — missing, invalid, or revoked API key</li>
            <li><b>404</b> — resource not found or unknown endpoint</li>
            <li><b>500</b> — server error</li>
          </ul>
          <p className="text-sm text-gray-600 mt-2">
            All errors follow the shape <code className="bg-gray-100 px-1 rounded">{`{ "error": "message" }`}</code>.
          </p>
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Endpoints</h2>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 max-w-md">
              <TabsTrigger value="warranties">Warranties</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="claims">Claims</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>

            <TabsContent value="warranties" className="space-y-4 mt-4">
              <Endpoint
                method="GET"
                path="/warranties"
                title="List warranties"
                description="Returns warranties belonging to your dealership. Supports ?limit= (max 200) and ?offset= for pagination."
                response={{ warranties: [{ id: 'uuid', customer_name: 'John Smith', vehicle_reg: 'AB12 CDE', plan_type: 'gold', status: 'active' }], total: 142, limit: 50, offset: 0 }}
              />
              <Endpoint
                method="GET"
                path="/warranties/:id"
                title="Get warranty"
                description="Retrieve a single warranty by ID."
                response={{ warranty: { id: 'uuid', customer_name: 'John Smith', vehicle_reg: 'AB12 CDE', plan_type: 'gold', warranty_duration: '24', status: 'active' } }}
              />
              <Endpoint
                method="POST"
                path="/warranties"
                title="Create warranty"
                description="Register a new warranty against your dealer account."
                body={{
                  customer_name: 'John Smith',
                  customer_email: 'john@example.com',
                  customer_phone: '07700900000',
                  vehicle_reg: 'AB12 CDE',
                  vehicle_make: 'Ford',
                  vehicle_model: 'Focus',
                  mileage: '52000',
                  plan_type: 'gold',
                  warranty_duration: '24',
                  price: 399,
                }}
                response={{ warranty: { id: 'uuid', status: 'pending' } }}
              />
            </TabsContent>

            <TabsContent value="quotes" className="space-y-4 mt-4">
              <Endpoint
                method="GET"
                path="/quotes"
                title="List quotes"
                description="Returns quotes for your dealership."
                response={{ quotes: [{ id: 'uuid', customer_name: 'Jane Doe', price: 299, status: 'draft' }], total: 25, limit: 50, offset: 0 }}
              />
              <Endpoint
                method="GET"
                path="/quotes/:id"
                title="Get quote"
                description="Retrieve a single quote by ID."
                response={{ quote: { id: 'uuid', customer_name: 'Jane Doe', vehicle_reg: 'XY13 ZAB', price: 299 } }}
              />
              <Endpoint
                method="POST"
                path="/quotes"
                title="Create quote"
                description="Generate a quote you can later convert to a warranty."
                body={{
                  customer_name: 'Jane Doe',
                  customer_email: 'jane@example.com',
                  vehicle_reg: 'XY13 ZAB',
                  vehicle_make: 'BMW',
                  vehicle_model: '320i',
                  mileage: '48000',
                  warranty_duration: '12',
                  plan_type: 'basic',
                  price: 199,
                }}
                response={{ quote: { id: 'uuid', status: 'draft' } }}
              />
            </TabsContent>

            <TabsContent value="claims" className="space-y-4 mt-4">
              <Endpoint
                method="GET"
                path="/claims"
                title="List claims"
                description="Returns claims raised against your warranties. Supports ?status= and pagination."
                response={{ claims: [{ id: 'uuid', claim_reference: 'CL-XXXX-XXXX', customer_name: 'John Smith', registration_plate: 'AB12 CDE', status: 'new' }], total: 12, limit: 50, offset: 0 }}
              />
              <Endpoint
                method="GET"
                path="/claims/:id"
                title="Get claim"
                description="Retrieve a single claim by ID."
                response={{ claim: { id: 'uuid', claim_reference: 'CL-XXXX-XXXX', status: 'in_review', repair_estimate: 850 } }}
              />
              <Endpoint
                method="POST"
                path="/claims"
                title="Submit claim"
                description="Open a new claim from your DMS. We auto-assign a claim reference and trigger the claim.created webhook."
                body={{
                  customer_name: 'John Smith',
                  customer_email: 'john@example.com',
                  customer_phone: '07700900000',
                  registration_plate: 'AB12 CDE',
                  vehicle_make: 'Ford',
                  vehicle_model: 'Focus',
                  fault_description: 'Gearbox grinding in 3rd gear',
                  repair_garage: 'Smith Motors Ltd',
                  repair_estimate: 850,
                }}
                response={{ claim: { id: 'uuid', claim_reference: 'CL-XXXX-XXXX', status: 'new' } }}
              />
            </TabsContent>

            <TabsContent value="customers" className="space-y-4 mt-4">
              <Endpoint
                method="GET"
                path="/customers"
                title="List customers"
                description="Returns active (non-archived) customers belonging to your dealership."
                response={{ customers: [{ id: 'uuid', first_name: 'John', last_name: 'Smith', email: 'john@example.com', registration_plate: 'AB12 CDE' }], total: 87, limit: 50, offset: 0 }}
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* Node example */}
        <section className="bg-white border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Node.js example</h2>
          <Code>{`const API_KEY = process.env.PANDA_API_KEY;
const BASE = '${BASE}';

async function createWarranty(payload) {
  const res = await fetch(BASE + '/warranties', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

const result = await createWarranty({
  customer_name: 'John Smith',
  vehicle_reg: 'AB12 CDE',
  plan_type: 'gold',
  warranty_duration: '24',
  price: 399,
});
console.log(result.warranty.id);`}</Code>
        </section>

        {/* Sandbox */}
        <section className="bg-white border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Sandbox mode</h2>
          <p className="text-sm text-gray-600">
            Test your integration without affecting production data. In the{' '}
            <Link to="/dealer-portal/settings/api" className="text-orange-600 underline">API keys page</Link>{' '}
            choose <b>Sandbox</b> when generating a key — it will be prefixed with{' '}
            <code className="bg-gray-100 px-1 rounded">lvf_test_</code>.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Warranties and quotes created with a sandbox key are flagged <code className="bg-gray-100 px-1 rounded">is_test=true</code> and stay isolated from live data.</li>
            <li>Sandbox requests do <b>not</b> trigger webhooks.</li>
            <li>List endpoints with a sandbox key only return test records; live keys only return live records.</li>
            <li>The <code className="bg-gray-100 px-1 rounded">/me</code> response includes a <code className="bg-gray-100 px-1 rounded">mode</code> field so you can confirm which environment you're hitting.</li>
          </ul>
        </section>

        {/* Webhooks */}
        <section className="bg-white border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Webhooks</h2>
          <p className="text-sm text-gray-600">
            Register a URL in the <Link to="/dealer-portal/settings/api" className="text-orange-600 underline">API keys page</Link>{' '}
            and we'll POST a signed JSON payload when events happen on your account.
          </p>
          <p className="text-sm font-semibold text-gray-700 mt-2">Event types</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li><code className="bg-gray-100 px-1 rounded">warranty.created</code></li>
            <li><code className="bg-gray-100 px-1 rounded">warranty.activated</code></li>
            <li><code className="bg-gray-100 px-1 rounded">warranty.cancelled</code></li>
            <li><code className="bg-gray-100 px-1 rounded">quote.created</code></li>
            <li><code className="bg-gray-100 px-1 rounded">quote.updated</code></li>
            <li><code className="bg-gray-100 px-1 rounded">claim.created</code> / <code className="bg-gray-100 px-1 rounded">claim.updated</code></li>
          </ul>
          <p className="text-sm font-semibold text-gray-700 mt-2">Payload</p>
          <Code>{`POST https://your-site.com/webhooks/panda
Headers:
  X-Panda-Event: warranty.created
  X-Panda-Signature: t=1717000000,v1=<hex-hmac-sha256>

{
  "event": "warranty.created",
  "created": 1717000000,
  "data": { "id": "uuid", "customer_name": "...", "status": "pending", ... }
}`}</Code>
          <p className="text-sm font-semibold text-gray-700 mt-2">Verifying the signature</p>
          <Code>{`import crypto from 'crypto';

function verify(rawBody, header, secret) {
  const [tPart, sigPart] = header.split(',');
  const t = tPart.split('=')[1];
  const v1 = sigPart.split('=')[1];
  const expected = crypto
    .createHmac('sha256', secret)
    .update(t + '.' + rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}`}</Code>
          <p className="text-sm text-gray-600">
            Deliveries are logged in the API keys page — you can see status codes and response bodies for the last 20 attempts.
            We treat any 2xx response as a successful delivery.
          </p>
          <p className="text-sm font-semibold text-gray-700 mt-2">Automatic retries</p>
          <p className="text-sm text-gray-600">
            Failed deliveries (non-2xx, timeouts, network errors) are retried automatically with exponential backoff:
            1 min → 5 min → 15 min → 1 hr → 6 hrs → 24 hrs. After 6 attempts the delivery is marked{' '}
            <code className="bg-gray-100 px-1 rounded">abandoned</code>. Each retry is logged with{' '}
            <code className="bg-gray-100 px-1 rounded">X-Panda-Retry: &lt;attempt&gt;</code> so you can detect replays.
          </p>
        </section>


        {/* Help */}
        <section className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Need help integrating?</h2>
          <p className="text-sm text-gray-700 mb-3">
            Our team can help you connect your DMS, set up webhooks, or migrate from Warranties 2000.
          </p>
          <Link to="/contact-us">
            <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
              Contact support <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </section>
      </div>
    </DealerLayout>
  );
};

export default DealerApiDocs;
