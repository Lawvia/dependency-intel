const API_BASE = '/api';

export async function scanManifest(content, format) {
  const res = await fetch(`${API_BASE}/scan/manifest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, format: format || '' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function scanPackage(name, version, ecosystem) {
  const res = await fetch(`${API_BASE}/scan/package`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, version, ecosystem }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function getPackageInfo(ecosystem, name) {
  const res = await fetch(`${API_BASE}/package/${ecosystem}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

export async function getPackageVulns(ecosystem, name, version) {
  const res = await fetch(`${API_BASE}/package/${ecosystem}/${encodeURIComponent(name)}/${version}/vulns`);
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}
