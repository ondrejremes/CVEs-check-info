import axios from 'axios'

const API_KEY = import.meta.env.VITE_API_KEY ?? ''

export const api = axios.create({
  baseURL: '/api',
  headers: { 'X-API-Key': API_KEY },
})

export interface Vendor {
  id: number; name: string; slug: string
  advisory_url?: string; rss_url?: string; notes?: string; created_at: string
}
export interface Product {
  id: number; name: string; vendor_id: number
  version_pattern?: string; cpe_prefix?: string; notes?: string; created_at: string
}
export interface Customer {
  id: number; name: string; email: string; language: string
  contact_person?: string; notes?: string; notify_email: boolean
  created_at: string; products: Product[]
}
export interface CVE {
  id: number; cve_id: string; description?: string
  cvss_score?: number; cvss_version?: string; severity?: string
  vendor_id?: number; source?: string; source_url?: string
  published_at?: string; fetched_at: string
}
export interface CVEAlert {
  id: number; cve_id: number; customer_id: number
  notified: boolean; notified_at?: string; created_at: string; cve: CVE
}
