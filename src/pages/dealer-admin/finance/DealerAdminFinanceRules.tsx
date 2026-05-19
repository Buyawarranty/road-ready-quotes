import React from 'react';
const DealerAdminFinanceRules: React.FC = () => (
  <div className="space-y-4 max-w-3xl">
    <h1 className="text-2xl font-bold">Underwriting rules</h1>
    <p className="text-sm text-muted-foreground">Editable rule matrix (LTV, age, mileage, income multiples, postcode risk). UI coming in next phase — rules are stored as JSON in <code className="font-mono text-xs">underwriting_rules.rules</code>.</p>
  </div>
);
export default DealerAdminFinanceRules;
