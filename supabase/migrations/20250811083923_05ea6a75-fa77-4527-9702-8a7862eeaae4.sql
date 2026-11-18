-- Update the policy documents email template to match the new format
UPDATE email_templates 
SET content = jsonb_build_object(
  'greeting', 'Hi {{customerName}},',
  'content', 'Congratulations on your new warranty! 🎉 We''re excited to have you covered and ready to enjoy peace of mind.

**Your policy documents are attached to this email for your records. Your policy number is: {{policyNumber}}**

📄 **What''s included in your documents:**

✅ Full warranty terms and conditions
✅ Claims process information  
✅ Coverage details and limitations
✅ Contact information for claims

📋 **Your Policy Details:**

**Vehicle Registration:** {{registrationPlate}}
**Plan Type:** {{planType}}
**Payment Method:** {{paymentType}}

You''ve made a smart choice to safeguard your vehicle and avoid unexpected repair bills. With your new warranty in place, you can drive with complete peace of mind knowing you''re covered when it matters most.

**Need help?**
If you have any questions about your coverage or need to make a claim, please contact us on:
Customer care: 0330 229 5040
Claims line: 0330 229 6547

We recommend keeping these documents safe and accessible - that way you''ll have everything you need right at your fingertips if you ever need to make a claim.

Drive safe and enjoy the confidence your new warranty brings!

Best regards,
The Customer Care Team
Buyawarranty.co.uk'
),
subject = 'Your vehicle warranty is confirmed - Drive with total confidence! 🚗✨',
updated_at = now()
WHERE name = '1st Email - Policy Documents Email as soon as purchase made' AND is_active = true;