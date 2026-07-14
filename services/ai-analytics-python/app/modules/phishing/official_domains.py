"""Default Bangladesh government / agency allow-list (seed).

Operators can extend via POST /api/v1/phishing/register or /register/defaults.
Comparisons use the *registrable* domain (e.g. bangladesh.gov.bd), not full paths.

`gov.bd` in the domain set means any ``*.gov.bd`` host is treated as verified
for CLEAN checks; the URL list is used to harvest HTML digital signatures.
"""

from __future__ import annotations

from urllib.parse import urlparse

# Comprehensive official entry points — ministries, directorates, portals, SOEs.
DEFAULT_OFFICIAL_URLS: list[str] = [
    # —— National portals & constitutional ——
    "https://bangladesh.gov.bd",
    "https://www.bangladesh.gov.bd",
    "https://bangabhaban.gov.bd",
    "https://cabinet.gov.bd",
    "https://pmo.gov.bd",
    "https://cao.gov.bd",
    "https://www.parliament.gov.bd",
    "https://parliament.gov.bd",
    "https://mopa.gov.bd",
    # —— Identity / e-services ——
    "https://nidw.gov.bd",
    "https://www.nidw.gov.bd",
    "https://www.mygov.bd",
    "https://forms.gov.bd",
    "https://www.forms.gov.bd",
    "https://www.eprocure.gov.bd",
    "https://www.e-service.gov.bd",
    "https://services.portal.gov.bd",
    "https://a2i.gov.bd",
    "https://ictd.gov.bd",
    "https://bcc.gov.bd",
    # —— Finance / tax / banking ——
    "https://mof.gov.bd",
    "https://nbr.gov.bd",
    "https://www.nbr.gov.bd",
    "https://www.bb.org.bd",
    "https://www.bangladeshbank.org.bd",
    "https://cga.gov.bd",
    "https://www.nsm.gov.bd",
    "https://www.sof.gov.bd",
    # —— Land ——
    "https://land.gov.bd",
    "https://www.land.gov.bd",
    "https://mutation.gov.bd",
    "https://www.settlement.gov.bd",
    # —— Home / police / passport ——
    "https://mha.gov.bd",
    "https://www.police.gov.bd",
    "https://police.gov.bd",
    "https://www.passport.gov.bd",
    "https://www.immi.gov.bd",
    "https://rabs.gov.bd",
    "https://www.prisons.gov.bd",
    # —— Foreign / diaspora ——
    "https://mofa.gov.bd",
    "https://www.mofa.gov.bd",
    # —— Education ——
    "https://moedu.gov.bd",
    "https://www.moedu.gov.bd",
    "https://www.dshe.gov.bd",
    "https://www.ugc.gov.bd",
    "https://www.nu.ac.bd",
    "https://www.du.ac.bd",
    "https://www.buet.ac.bd",
    "https://banbeis.gov.bd",
    "https://nctb.gov.bd",
    # —— Health ——
    "https://mohfw.gov.bd",
    "https://www.mohfw.gov.bd",
    "https://dghs.gov.bd",
    "https://www.dghs.gov.bd",
    "https://www.dgda.gov.bd",
    # —— Agriculture / food ——
    "https://moa.gov.bd",
    "https://www.moa.gov.bd",
    "https://dae.gov.bd",
    "https://www.bari.gov.bd",
    "https://www.brri.gov.bd",
    "https://dgfood.gov.bd",
    "https://www.food.gov.bd",
    # —— Disaster / environment ——
    "https://modmr.gov.bd",
    "https://www.ddm.gov.bd",
    "https://www.bmd.gov.bd",
    "https://www.ffwc.gov.bd",
    "https://moef.gov.bd",
    "https://doe.gov.bd",
    # —— Local government / admin ——
    "https://lgd.gov.bd",
    "https://www.lgd.gov.bd",
    "https://dhaka.gov.bd",
    "https://chittagong.gov.bd",
    "https://chattogram.gov.bd",
    "https://rajshahi.gov.bd",
    "https://khulna.gov.bd",
    "https://barisal.gov.bd",
    "https://barishal.gov.bd",
    "https://sylhet.gov.bd",
    "https://rangpur.gov.bd",
    "https://mymensingh.gov.bd",
    # —— Planning / statistics ——
    "https://plandiv.gov.bd",
    "https://www.imed.gov.bd",
    "https://bbs.gov.bd",
    "https://www.bbs.gov.bd",
    # —— Law / justice ——
    "https://lawmin.gov.bd",
    "https://www.supremecourt.gov.bd",
    "https://www.judiciary.org.bd",
    # —— ICT / telecom / energy ——
    "https://www.btrc.gov.bd",
    "https://www.bpdb.gov.bd",
    "https://www.pgcb.gov.bd",
    "https://www.desco.org.bd",
    "https://www.sreda.gov.bd",
    # —— Transport / works ——
    "https://www.rhd.gov.bd",
    "https://www.biwta.gov.bd",
    "https://www.brta.gov.bd",
    "https://www.railway.gov.bd",
    "https://www.caa.gov.bd",
    # —— Trade / industry / investment ——
    "https://mincom.gov.bd",
    "https://www.bida.gov.bd",
    "https://www.beza.gov.bd",
    "https://www.epb.gov.bd",
    "https://www.bscic.gov.bd",
    "https://www.dpp.gov.bd",
    # —— Elections / information ——
    "https://www.ecs.gov.bd",
    "https://moi.gov.bd",
    "https://www.pressinform.gov.bd",
    # —— Social / labour / women ——
    "https://mss.gov.bd",
    "https://www.mole.gov.bd",
    "https://mowca.gov.bd",
    "https://www.dyd.gov.bd",
    # —— Defence / armed forces (public sites) ——
    "https://www.afd.gov.bd",
    "https://www.army.mil.bd",
    "https://www.navy.mil.bd",
    "https://www.airforce.mil.bd",
]


def _hostname_from_url(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _registrable(host: str) -> str:
    parts = host.split(".")
    if len(parts) >= 3 and parts[-2] in {"gov", "org", "ac", "edu", "mil"} and parts[-1] == "bd":
        return ".".join(parts[-3:])
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host


def build_default_official_domains(urls: list[str] = DEFAULT_OFFICIAL_URLS) -> frozenset[str]:
    domains: set[str] = {
        "gov.bd",  # any *.gov.bd treated verified under national policy
        "mil.bd",
    }
    for url in urls:
        host = _hostname_from_url(url)
        if not host:
            continue
        domains.add(host)
        domains.add(_registrable(host))
    return frozenset(domains)


DEFAULT_OFFICIAL_DOMAINS: frozenset[str] = build_default_official_domains()
