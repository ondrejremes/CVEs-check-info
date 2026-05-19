"""
Known security vendor database.
Maps vendor names to their advisory URLs, RSS feeds, and CPE slugs.
"""

VENDOR_DB: list[dict] = [
    {
        "name": "Cisco",
        "slug": "cisco",
        "advisory_url": "https://sec.cloudapps.cisco.com/security/center/publicationListing.x",
        "rss_url": "https://sec.cloudapps.cisco.com/security/center/eventResponses.x?channel=rss",
        "cpe_vendor": "cisco",
    },
    {
        "name": "Fortinet",
        "slug": "fortinet",
        "advisory_url": "https://www.fortiguard.com/psirt",
        "rss_url": "https://www.fortiguard.com/rss/psirt.xml",
        "cpe_vendor": "fortinet",
    },
    {
        "name": "Palo Alto Networks",
        "slug": "paloalto",
        "advisory_url": "https://security.paloaltonetworks.com/",
        "rss_url": "https://security.paloaltonetworks.com/rss.xml",
        "cpe_vendor": "paloaltonetworks",
    },
    {
        "name": "Juniper Networks",
        "slug": "juniper",
        "advisory_url": "https://supportportal.juniper.net/s/article/Juniper-SIRT-Advisories",
        "rss_url": "https://kb.juniper.net/InfoCenter/index?page=prcnt&channel=SIRT&rss=true",
        "cpe_vendor": "juniper",
    },
    {
        "name": "Microsoft",
        "slug": "microsoft",
        "advisory_url": "https://msrc.microsoft.com/update-guide/",
        "rss_url": "https://api.msrc.microsoft.com/update-guide/rss",
        "cpe_vendor": "microsoft",
    },
    {
        "name": "VMware",
        "slug": "vmware",
        "advisory_url": "https://www.vmware.com/security/advisories.html",
        "rss_url": "https://www.vmware.com/security/advisories/rss_feed.xml",
        "cpe_vendor": "vmware",
    },
    {
        "name": "Broadcom",
        "slug": "broadcom",
        "advisory_url": "https://support.broadcom.com/web/ecx/security-advisory",
        "rss_url": None,
        "cpe_vendor": "broadcom",
    },
    {
        "name": "Check Point",
        "slug": "checkpoint",
        "advisory_url": "https://advisories.checkpoint.com/",
        "rss_url": None,
        "cpe_vendor": "checkpoint",
    },
    {
        "name": "F5",
        "slug": "f5",
        "advisory_url": "https://my.f5.com/manage/s/article/K4602",
        "rss_url": "https://support.f5.com/csp/article/K4602?rss",
        "cpe_vendor": "f5",
    },
    {
        "name": "SonicWall",
        "slug": "sonicwall",
        "advisory_url": "https://psirt.global.sonicwall.com/vuln-list",
        "rss_url": "https://psirt.global.sonicwall.com/vuln-list.rss",
        "cpe_vendor": "sonicwall",
    },
    {
        "name": "Aruba Networks",
        "slug": "aruba",
        "advisory_url": "https://www.arubanetworks.com/support-services/security-bulletins/",
        "rss_url": "https://www.arubanetworks.com/support-services/security-bulletins/feed/",
        "cpe_vendor": "arubanetworks",
    },
    {
        "name": "Netgear",
        "slug": "netgear",
        "advisory_url": "https://kb.netgear.com/app/answers/detail/a_id/62765",
        "rss_url": None,
        "cpe_vendor": "netgear",
    },
    {
        "name": "ASUS",
        "slug": "asus",
        "advisory_url": "https://www.asus.com/content/ASUS-Product-Security-Advisory/",
        "rss_url": None,
        "cpe_vendor": "asus",
    },
    {
        "name": "Dell",
        "slug": "dell",
        "advisory_url": "https://www.dell.com/support/security/en-us",
        "rss_url": "https://www.dell.com/support/security/en-us/rss",
        "cpe_vendor": "dell",
    },
    {
        "name": "HP",
        "slug": "hp",
        "advisory_url": "https://support.hp.com/us-en/security/security-bulletin",
        "rss_url": None,
        "cpe_vendor": "hp",
    },
    {
        "name": "HPE",
        "slug": "hpe",
        "advisory_url": "https://support.hpe.com/hpesc/public/home/result?lang=en_US&cc=us&docType=SECURITY_BULLETIN",
        "rss_url": None,
        "cpe_vendor": "hp",
    },
    {
        "name": "Red Hat",
        "slug": "redhat",
        "advisory_url": "https://access.redhat.com/security/security-updates/",
        "rss_url": "https://access.redhat.com/rss/errata.xml",
        "cpe_vendor": "redhat",
    },
    {
        "name": "Ubuntu",
        "slug": "ubuntu",
        "advisory_url": "https://ubuntu.com/security/notices",
        "rss_url": "https://ubuntu.com/security/notices/rss.xml",
        "cpe_vendor": "canonical",
    },
    {
        "name": "Debian",
        "slug": "debian",
        "advisory_url": "https://www.debian.org/security/",
        "rss_url": "https://www.debian.org/security/dsa.en.rdf",
        "cpe_vendor": "debian",
    },
    {
        "name": "Apache",
        "slug": "apache",
        "advisory_url": "https://httpd.apache.org/security/vulnerabilities_24.html",
        "rss_url": None,
        "cpe_vendor": "apache",
    },
    {
        "name": "Nginx",
        "slug": "nginx",
        "advisory_url": "https://nginx.org/en/security_advisories.html",
        "rss_url": None,
        "cpe_vendor": "nginx",
    },
    {
        "name": "OpenSSL",
        "slug": "openssl",
        "advisory_url": "https://openssl.org/news/vulnerabilities.html",
        "rss_url": None,
        "cpe_vendor": "openssl",
    },
    {
        "name": "Citrix",
        "slug": "citrix",
        "advisory_url": "https://support.citrix.com/article/CTX218787",
        "rss_url": "https://support.citrix.com/feed/products/securitybulletins.rss",
        "cpe_vendor": "citrix",
    },
    {
        "name": "Ivanti",
        "slug": "ivanti",
        "advisory_url": "https://forums.ivanti.com/s/topic/0TO3m000000hEBNGA2/security-advisories",
        "rss_url": None,
        "cpe_vendor": "ivanti",
    },
    {
        "name": "Zyxel",
        "slug": "zyxel",
        "advisory_url": "https://www.zyxel.com/global/en/support/security-advisories.shtml",
        "rss_url": None,
        "cpe_vendor": "zyxel",
    },
    {
        "name": "MikroTik",
        "slug": "mikrotik",
        "advisory_url": "https://mikrotik.com/products/security",
        "rss_url": None,
        "cpe_vendor": "mikrotik",
    },
    {
        "name": "Ubiquiti",
        "slug": "ubiquiti",
        "advisory_url": "https://community.ui.com/releases",
        "rss_url": None,
        "cpe_vendor": "ubiquiti",
    },
    {
        "name": "Trend Micro",
        "slug": "trendmicro",
        "advisory_url": "https://www.trendmicro.com/en_us/business/products/hybrid-cloud/security-updates.html",
        "rss_url": None,
        "cpe_vendor": "trendmicro",
    },
    {
        "name": "Sophos",
        "slug": "sophos",
        "advisory_url": "https://www.sophos.com/en-us/security-advisories",
        "rss_url": "https://www.sophos.com/en-us/rss/security-advisories.xml",
        "cpe_vendor": "sophos",
    },
    {
        "name": "Barracuda",
        "slug": "barracuda",
        "advisory_url": "https://www.barracuda.com/company/legal/trust-center/vulnerability-response",
        "rss_url": None,
        "cpe_vendor": "barracuda",
    },
]


def lookup_vendor(query: str) -> list[dict]:
    """Return matching vendors for a query string (case-insensitive substring match)."""
    q = query.strip().lower()
    if not q:
        return []
    return [
        v for v in VENDOR_DB
        if q in v["name"].lower() or q in v["slug"].lower()
    ]
