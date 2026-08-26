import { Request } from 'express';
import axios from 'axios';

/**
 * IP Detection Service
 *
 * Extracts the real public IP from incoming requests and detects
 * whether the user is behind a VPN/proxy. Uses free public APIs.
 */

// In-memory cache to avoid repeated API calls for the same IP
const ipCache = new Map<string, { result: IpInfo; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface IpInfo {
  ip: string | null;
  location: string | null;
  isVpn: boolean;
  countryCode?: string;
  city?: string;
  isp?: string;
}

/**
 * Extract the real public IP address from an Express request.
 * Checks headers in order of reliability (set by reverse proxies).
 */
export function extractRealIp(req: Request): string | null {
  // 1. X-Forwarded-For (most common behind proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Can contain multiple IPs: "client, proxy1, proxy2"
    // The first one is the original client IP
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0].trim();
    if (ips && isValidIp(ips)) return ips;
  }

  // 2. X-Real-IP (nginx reverse proxy)
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string' && isValidIp(realIp)) {
    return realIp;
  }

  // 3. CF-Connecting-IP (Cloudflare)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string' && isValidIp(cfIp)) {
    return cfIp;
  }

  // 4. True-Client-IP (Akamai/Cloudflare)
  const trueClientIp = req.headers['true-client-ip'];
  if (trueClientIp && typeof trueClientIp === 'string' && isValidIp(trueClientIp)) {
    return trueClientIp;
  }

  // 5. req.ip (Express built-in, depends on trust proxy setting)
  if (req.ip && isValidIp(req.ip)) {
    return req.ip;
  }

  // 6. Fallback to socket remote address
  const remoteAddress = req.socket?.remoteAddress;
  if (remoteAddress) {
    // Strip IPv6 prefix (::ffff:) if present
    const cleaned = remoteAddress.replace(/^::ffff:/, '');
    if (isValidIp(cleaned)) return cleaned;
  }

  return null;
}

/**
 * Validate that a string is a valid IPv4 or IPv6 address
 */
function isValidIp(ip: string): boolean {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return false; // Skip localhost
  }

  // IPv4 pattern
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    return ip.split('.').every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 pattern (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  if (ipv6Regex.test(ip)) return true;

  return false;
}

/**
 * Detect VPN/proxy status and geolocation for an IP address.
 * Uses ip-api.com (free tier: 45 req/min, no key needed).
 */
async function detectIpInfo(ip: string): Promise<IpInfo> {
  // Check cache first
  const cached = ipCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    // ip-api.com provides: country, city, ISP, proxy/VPN detection
    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,isp,proxy,query`,
      { timeout: 5000 }
    );

    const data = response.data;

    if (data.status === 'success') {
      const location = [data.city, data.country].filter(Boolean).join(', ');
      const result: IpInfo = {
        ip: data.query || ip,
        location: location || null,
        isVpn: !!data.proxy, // ip-api.com marks VPN/proxy/hosting as "proxy"
        countryCode: data.countryCode,
        city: data.city,
        isp: data.isp,
      };

      // Cache the result
      ipCache.set(ip, { result, timestamp: Date.now() });
      return result;
    }

    return { ip, location: null, isVpn: false };
  } catch (error) {
    // If the external API fails, return basic info without VPN detection
    console.warn(`⚠️  IP detection failed for ${ip}:`, error instanceof Error ? error.message : 'Unknown error');
    return { ip, location: null, isVpn: false };
  }
}

/**
 * Full pipeline: extract IP from request + detect VPN + geolocation.
 * Returns IpInfo with all collected data, ready to store in the User model.
 */
export async function detectRegistrationIp(req: Request): Promise<IpInfo> {
  const ip = extractRealIp(req);

  if (!ip) {
    return { ip: null, location: null, isVpn: false };
  }

  return detectIpInfo(ip);
}

/**
 * Batch cleanup of the IP cache (call periodically if needed)
 */
export function cleanupIpCache(): void {
  const now = Date.now();
  for (const [key, value] of ipCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      ipCache.delete(key);
    }
  }
}
