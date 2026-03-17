export const baseUrl = process.env.BASE_URL ?? 'http://localhost:5001';

export async function j(method, path, body, { headers = {}, expectedStatus = null } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (expectedStatus !== null) {
        if (res.status !== expectedStatus) {
            throw new Error(`${method} ${path} expected ${expectedStatus}, got ${res.status}: ${JSON.stringify(data)}`);
        }
        return data;
    }

    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
    return data;
}

export async function createAuthContext(prefix = 'SMOKE') {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const name = `${prefix}-ADMIN-${stamp}`;
    const email = `${prefix.toLowerCase()}-${stamp}@example.com`;
    const password = 'SmokePass123!';

    const reg = await j('POST', '/api/auth/register', { name, email, password });
    const token = reg.token;
    const headers = { Authorization: `Bearer ${token}` };

    return {
        token,
        headers,
        user: reg.user,
        j: (method, path, body, opts = {}) => j(method, path, body, { ...opts, headers: { ...headers, ...(opts.headers ?? {}) } })
    };
}
