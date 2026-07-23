import { COMPANY_NAME, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config.js';

let clientPromise = null;
let authSubscription = null;

function loadScript(source) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-supabase-source="${source}"]`);
    if (existing) {
      if (globalThis.supabase?.createClient) resolve();
      else existing.addEventListener('load', resolve, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = source;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.supabaseSource = source;

    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error(`Timed out loading ${source}`));
    }, 15000);

    script.addEventListener('load', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });

    script.addEventListener('error', () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error(`Could not load ${source}`));
    }, { once: true });

    document.head.appendChild(script);
  });
}

async function loadSupabaseLibrary() {
  if (globalThis.supabase?.createClient) return globalThis.supabase;

  const sources = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2',
  ];

  const failures = [];
  for (const source of sources) {
    try {
      await loadScript(source);
      if (globalThis.supabase?.createClient) return globalThis.supabase;
      failures.push(`${source}: library loaded without createClient`);
    } catch (error) {
      failures.push(`${source}: ${error?.message || 'unknown error'}`);
    }
  }

  throw new Error(`Cloud library could not load. ${failures.join(' | ')}`);
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = loadSupabaseLibrary().then(({ createClient }) => createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    ));
  }
  return clientPromise;
}

function mapRowToEstimate(row) {
  const data = row?.estimate_data && typeof row.estimate_data === 'object'
    ? row.estimate_data
    : {};

  return {
    ...data,
    id: row.id,
    estimateNumber: row.estimate_number || data.estimateNumber || '',
    estimateName: row.estimate_name || data.estimateName || 'Untitled Estimate',
    clientName: row.client_name || data.clientName || '',
    siteAddress: row.site_address || data.siteAddress || '',
    season: row.season || data.season || '',
    preparedBy: row.prepared_by || data.preparedBy || '',
    squareFootage: Number(row.square_footage ?? data.squareFootage ?? 0),
    status: row.status || data.status || 'draft',
    total: Number(row.total || 0),
    createdAt: row.created_at || data.createdAt || null,
    updatedAt: row.updated_at || data.updatedAt || null,
    archivedAt: row.archived_at || data.archivedAt || null,
  };
}

async function currentUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

export const cloud = {
  async init() {
    const client = await getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async onAuthStateChange(callback) {
    const client = await getClient();
    authSubscription?.unsubscribe?.();
    const { data } = client.auth.onAuthStateChange((event, session) => callback(event, session));
    authSubscription = data.subscription;
    return authSubscription;
  },

  async signIn(email, password) {
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },

  async sendMagicLink(email) {
    const client = await getClient();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://84kgvfhwbp-sys.github.io/Summer-Estimate/',
        shouldCreateUser: false,
      },
    });
    if (error) throw error;
  },

  async signOut() {
    const client = await getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async bootstrapWorkspace() {
    const client = await getClient();
    let { data: memberships, error } = await client
      .from('company_members')
      .select('company_id, role')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;

    if (!memberships?.length) {
      const { data: companyId, error: bootstrapError } = await client.rpc('bootstrap_company', {
        company_name: COMPANY_NAME,
      });
      if (bootstrapError) throw bootstrapError;
      memberships = [{ company_id: companyId, role: 'owner' }];
    }

    const membership = memberships[0];
    const { data: company, error: companyError } = await client
      .from('companies')
      .select('id, name')
      .eq('id', membership.company_id)
      .single();
    if (companyError) throw companyError;

    return {
      company,
      role: membership.role,
    };
  },

  async listEstimates(companyId) {
    const client = await getClient();
    const { data, error } = await client
      .from('estimates')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRowToEstimate);
  },

  async saveEstimate(companyId, estimate, calculatedTotal) {
    const client = await getClient();
    const user = await currentUser(client);
    const now = new Date().toISOString();
    const payload = {
      id: estimate.id,
      company_id: companyId,
      estimate_number: estimate.estimateNumber || null,
      estimate_name: estimate.estimateName || 'Untitled Estimate',
      client_name: estimate.clientName || null,
      site_address: estimate.siteAddress || null,
      season: estimate.season || null,
      prepared_by: estimate.preparedBy || null,
      square_footage: Number(estimate.squareFootage || 0),
      status: estimate.status || 'draft',
      estimate_data: {
        ...estimate,
        total: calculatedTotal,
        updatedAt: now,
      },
      subtotal: calculatedTotal,
      tax_rate: 0,
      tax_total: 0,
      total: calculatedTotal,
      updated_by: user?.id || null,
      updated_at: now,
    };

    const { data, error } = await client
      .from('estimates')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) throw error;
    return mapRowToEstimate(data);
  },

  async deleteEstimate(id) {
    const client = await getClient();
    const { error } = await client.from('estimates').delete().eq('id', id);
    if (error) throw error;
  },

  async loadRateSettings(companyId) {
    const client = await getClient();
    const { data, error } = await client
      .from('rate_settings')
      .select('settings')
      .eq('company_id', companyId)
      .single();
    if (error) throw error;
    return data?.settings && typeof data.settings === 'object' ? data.settings : {};
  },

  async saveRateSettings(companyId, settings) {
    const client = await getClient();
    const user = await currentUser(client);
    const { error } = await client
      .from('rate_settings')
      .update({
        settings,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId);
    if (error) throw error;
  },
};
