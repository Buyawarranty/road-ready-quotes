import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'
import { z } from 'npm:zod@3.24.1'
import { BRANDS } from '../_shared/brand.ts'

/**
 * Forwards a dealer-submitted warranty claim into the Buy A Warranty claims
 * queue. Panda Protect does not triage warranty claims in its own dashboard
 * (see AGENTS.md), so the desk that works them lives on the Buy A Warranty
 * project. Their public claims intake (submit-claim) is the bridge: it saves
 * the claim, alerts their team and confirms to the contact.
 */

const BAW_INTAKE_URL =
  Deno.env.get('BAW_CLAIM_INTAKE_URL') ??
  'https://mzlpuxzwyrcyrgrongeb.supabase.co/functions/v1/submit-claim'

const ATTACHMENT_BUCKET = 'dealer-admin-claims'
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024
const LINKED_FILE_TTL_SECONDS = 60 * 60 * 24 * 14

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  claimId: z.string().uuid(),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(40).default(''),
  registrationPlate: z.string().min(2).max(20),
  vehicleMake: z.string().max(120).default(''),
  vehicleModel: z.string().max(120).default(''),
  mileage: z.number().int().nonnegative().default(0),
  occurredOn: z.string().max(40).default(''),
  whenHappens: z.string().max(60).default(''),
  faultDescription: z.string().min(1).max(4000),
  otherDetails: z.string().max(4000).default(''),
  driveable: z.boolean().default(true),
  repairStarted: z.boolean().default(false),
  repairGarage: z.string().max(200).default(''),
  warrantyPlan: z.string().max(120).default(''),
  dealerName: z.string().max(200).default(''),
})

type ClaimFile = { name: string; type: string; data: string }
type StoredAttachment = { name?: string; path?: string; url?: string; type?: string; size?: number }

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function collectAttachments(admin: ReturnType<typeof createClient>, rows: StoredAttachment[]) {
  const files: ClaimFile[] = []
  const links: string[] = []
  const skipped: string[] = []
  let total = 0

  for (const row of rows) {
    const path = typeof row.path === 'string' && row.path.length > 0 ? row.path : null
    const name = typeof row.name === 'string' && row.name.length > 0 ? row.name : (path ?? 'attachment')

    if (!path) {
      if (typeof row.url === 'string' && row.url.length > 0) links.push(row.url)
      continue
    }

    const { data: blob, error } = await admin.storage.from(ATTACHMENT_BUCKET).download(path)
    if (error || !blob) {
      skipped.push(name)
      continue
    }

    const buffer = await blob.arrayBuffer()
    if (total + buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      const { data: signed } = await admin.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(path, LINKED_FILE_TTL_SECONDS)
      if (signed?.signedUrl) links.push(signed.signedUrl)
      else skipped.push(name)
      continue
    }

    total += buffer.byteLength
    files.push({
      name,
      type: typeof row.type === 'string' && row.type.length > 0 ? row.type : 'application/octet-stream',
      data: toBase64(buffer),
    })
  }

  return { files, links, skipped }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = parsed.data

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Backend not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Only a signed-in dealer (or staff member) may push a claim to the desk.
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Sign in required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: claim, error: claimError } = await admin
    .from('dealer_admin_claims')
    .select('id, claim_reference, dealer_id, forward_status, baw_submission_id, attachments')
    .eq('id', body.claimId)
    .maybeSingle()

  if (claimError || !claim) {
    return new Response(JSON.stringify({ error: 'Claim not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (claim.forward_status === 'sent') {
    return new Response(
      JSON.stringify({ ok: true, alreadySent: true, bawSubmissionId: claim.baw_submission_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (claim.dealer_id) {
    const callerEmail = (userData.user.email ?? '').toLowerCase()
    const { data: dealerRow } = await admin
      .from('dealer_admins')
      .select('id, email')
      .eq('id', claim.dealer_id)
      .maybeSingle()
    const isStaff = await admin
      .from('admin_users')
      .select('id')
      .eq('email', callerEmail)
      .maybeSingle()
      .then((r) => Boolean(r.data))
    if (!isStaff && dealerRow?.email?.toLowerCase() !== callerEmail) {
      return new Response(JSON.stringify({ error: 'Not allowed for this claim' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const panda = BRANDS.pandaprotect
  const attachmentRows = Array.isArray(claim.attachments) ? (claim.attachments as StoredAttachment[]) : []
  const { files, links, skipped } = await collectAttachments(admin, attachmentRows)

  const notes = [
    `**${panda.name.toUpperCase()} — dealer-submitted warranty claim. Please log and handle at the Buy A Warranty claims desk.**`,
    '',
    `Dealer: ${body.dealerName || 'Not provided'}`,
    `Claim reference: ${claim.claim_reference}`,
    `Warranty plan: ${body.warrantyPlan || 'Not provided'}`,
    `Vehicle: ${[body.vehicleMake, body.vehicleModel].filter(Boolean).join(' ') || 'Not provided'}`,
    `Current mileage: ${body.mileage ? `${body.mileage.toLocaleString()} miles` : 'Not provided'}`,
    `Fault first occurred: ${body.occurredOn || 'Not provided'}`,
    `When the fault occurs: ${body.whenHappens || 'Not provided'}`,
    `Vehicle driveable: ${body.driveable ? 'Yes' : 'No'}`,
    `Repair already started: ${body.repairStarted ? `Yes${body.repairGarage ? ` at ${body.repairGarage}` : ''}` : 'No'}`,
    body.otherDetails ? `Further details: ${body.otherDetails}` : null,
    files.length > 0 ? `Photos/documents: ${files.length} file(s) attached to this claim.` : null,
    links.length > 0 ? `Photos/documents (links, valid 14 days): ${links.join('\n')}` : null,
    skipped.length > 0 ? `Could not transfer: ${skipped.join(', ')}` : null,
    `Questions? ${body.contactEmail}${body.contactPhone ? ` / ${body.contactPhone}` : ''}`,
  ].filter((line): line is string => line !== null)

  const payload = {
    name: body.contactName,
    email: body.contactEmail,
    phone: body.contactPhone,
    vehicleReg: body.registrationPlate,
    currentMileage: body.mileage ? String(body.mileage) : '',
    faultDescription: body.faultDescription,
    dateOccurred: body.occurredOn,
    faultDetails: body.otherDetails,
    issueTiming: body.whenHappens,
    additionalInfo: notes.join('\n'),
    files,
  }

  const mark = async (status: string, submissionId: string | null, errorText: string | null) => {
    await admin
      .from('dealer_admin_claims')
      .update({
        forward_status: status,
        baw_submission_id: submissionId,
        forwarded_at: new Date().toISOString(),
        forward_error: errorText,
      })
      .eq('id', body.claimId)
  }

  try {
    const response = await fetch(BAW_INTAKE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: `https://${panda.domain}`,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    let result: { success?: boolean; submissionId?: string; id?: string; error?: string } = {}
    try {
      result = JSON.parse(text)
    } catch {
      /* their intake replied with something that was not JSON */
    }

    const deskRef = result.submissionId ?? result.id ?? null

    if (!response.ok || result.success === false) {
      const reason = result.error ?? `Claims desk replied ${response.status}`
      await mark('failed', null, reason)
      return new Response(JSON.stringify({ ok: false, error: reason }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await mark('sent', deskRef, null)
    return new Response(
      JSON.stringify({ ok: true, bawSubmissionId: deskRef, filesSent: files.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error'
    await mark('failed', null, reason)
    return new Response(JSON.stringify({ ok: false, error: reason }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
