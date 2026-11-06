#!/usr/bin/env python3
"""Northcrest static build. Run from anywhere:  python3 scripts/build.py   (stdlib only, safe to re-run)

src/pages/<name>.html  ->  <name>.html (site root)
    Optional front matter between two '---' lines (key: value), then the page body.
    Layouts:  public (default: head + utility strip + header + <main id="main"> + body + footer)
              app    (dashboard: head + navy sidebar + app header + <main class="app-content" id="main"> + body)
              auth   (no header/footer: head + body, you write the <main id="main"> yourself)
    See COMPONENTS.md "Build system" for every key and macro.
Also writes data/site-data.js from data/departments.json + data/doctors.json (so pages work from file://).
Missing photos never break the build: tiles fall back to an icon panel, heroes to a plain navy hero (and a warning is printed).
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
_D = json.loads((ROOT / "data" / "departments.json").read_text(encoding="utf-8"))
CATEGORIES = _D["categories"]
DEPT_LIST = _D["departments"]
DOC_LIST = json.loads((ROOT / "data" / "doctors.json").read_text(encoding="utf-8"))["doctors"]
DEPTS = {x["slug"]: x for x in DEPT_LIST}
DOCS = {x["id"]: x for x in DOC_LIST}
CAT_LABEL = {c["key"]: c["label"] for c in CATEGORIES}
esc = html.escape
LAZY = ' loading="lazy" decoding="async"'
MISSING = set()


def inr(n):
    s = str(int(n))
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts + [tail])


def price(n):
    return "₹" + inr(n)


def have(slot, size="800"):
    ok = (ROOT / "images" / ("%s-%s.webp" % (slot, size))).exists()
    if not ok:
        MISSING.add(slot)
    return ok


# ---------------------------------------------------------------- partials
def partial(name):
    p = SRC / "partials" / (name + ".html")
    if not p.exists():
        sys.exit("missing partial: " + name)
    return p.read_text(encoding="utf-8")


def include_partials(text, depth=0):
    def rep(m):
        return include_partials(partial(m.group(1).strip()), depth + 1) if depth < 5 else ""
    return re.sub(r"\{\{>\s*([\w\-]+)\s*\}\}", rep, text)


# ---------------------------------------------------------------- icons
ARROW = '<svg class="flip" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
ICONS = {
    "heart": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M5.5 12h3l1.5-2.5 2 4 1.5-1.5h5"/>',
    "brain": '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/><path d="M10 9H8M14 9h2M10 14H8M14 14h2"/>',
    "bone": '<path d="M7.5 4.5a2.5 2.5 0 0 0-3 3 2.5 2.5 0 0 0 1.2 3.6L13 18.3a2.5 2.5 0 0 0 3.6 1.2 2.5 2.5 0 0 0 3-3 2.5 2.5 0 0 0-1.2-3.6L11.1 5.7a2.5 2.5 0 0 0-3.6-1.2z"/>',
    "ribbon": '<path d="M12 3a4 4 0 0 0-4 4c0 2.6 2 5.6 4 8.2 2-2.6 4-5.6 4-8.2a4 4 0 0 0-4-4z"/><path d="m9.5 12.5-4 8.5 3-1 1.5 2.5 2.5-6.5M14.5 12.5l4 8.5-3-1-1.5 2.5-2.5-6.5"/>',
    "child": '<circle cx="12" cy="5.5" r="2.5"/><path d="M12 8v7M8 10.5l4 1.5 4-1.5M9 21l3-6 3 6"/>',
    "female": '<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>',
    "stomach": '<path d="M9 3v4a3 3 0 0 0 3 3h1a5 5 0 0 1 5 5v0a6 6 0 0 1-6 6H9a4 4 0 0 1-4-4v-1a3 3 0 0 1 3-3h2"/>',
    "lungs": '<path d="M12 4v8M12 12l-3-2M12 12l3-2"/><path d="M8.5 7C6 7 4 11 4 15.5 4 18 5 20 7 20s3-1.5 3-4V9.5A2.5 2.5 0 0 0 8.5 7zM15.5 7C18 7 20 11 20 15.5 20 18 19 20 17 20s-3-1.5-3-4V9.5A2.5 2.5 0 0 1 15.5 7z"/>',
    "kidney": '<path d="M9 4C5.5 4 4 7.5 4 11.5S5.5 20 9 20c2.5 0 3.5-2 3.5-4 0-1.5-1.5-2.5-1.5-4s1.5-2.5 1.5-4c0-2-1.5-4-3.5-4z"/><path d="M12.5 12H16c2 0 3 1 3 3v5"/>',
    "ear": '<path d="M7 9a5 5 0 0 1 10 0c0 3-2.5 4-3 6.5-.4 2.2-1.6 4.5-4 4.5a3 3 0 0 1-3-3"/><path d="M10 9.5a2 2 0 0 1 4 0c0 1.5-1.5 2-1.5 3"/>',
    "skin": '<path d="M12 3c3.5 4 6 7 6 10.5a6 6 0 0 1-12 0C6 10 8.5 7 12 3z"/><circle cx="10" cy="13" r=".8"/><circle cx="13.5" cy="15.5" r=".8"/><circle cx="13" cy="11" r=".8"/>',
    "ambulance": '<path d="M3 16V8a1 1 0 0 1 1-1h10v9M14 10h4l3 3.5V16h-7"/><circle cx="7.5" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M8.5 9.5v3M7 11h3"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "people": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>',
    "check": '<path d="m5 12 5 5 9-10"/>',
    "shield": '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="M12 8.5v6M9 11.5h6"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h3"/>',
    "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    "stethoscope": '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
    "pill": '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
    "file": '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    "bed": '<path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
    "flask": '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    "scan": '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="12" r="3.5"/>',
    "building": '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18"/><path d="M9.5 7v4M7.5 9h4M8 15h3M8 18h3"/>',
    "star": '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    "map": '<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    "lang": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    "card": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    "tooth": '<path d="M7 3c-2 0-3.5 1.6-3.5 4 0 3 1.5 4 2 7 .4 2.6 1 7 2.5 7s1.5-4 2.5-6c.5-1 1.5-1 2 0 1 2 1 6 2.5 6s2.1-4.4 2.5-7c.5-3 2-4 2-7 0-2.4-1.5-4-3.5-4-2 0-3 1-5 1S9 3 7 3z"/>',
}


def icon(name, size=24, cls=""):
    c = ' class="%s"' % cls if cls else ""
    return '<svg%s viewBox="0 0 24 24" width="%d" height="%d" aria-hidden="true">%s</svg>' % (c, size, size, ICONS.get(name, ICONS["shield"]))


def badge_icon(name, extra=""):
    return '<span class="icon-badge%s">%s</span>' % (extra, icon(name))


def img_tag(slot, w, h, alt, size, lazy=True, cls=""):
    c = ' class="%s"' % cls if cls else ""
    return '<img%s src="images/%s-%s.webp" width="%d" height="%d" alt="%s"%s>' % (c, slot, size, w, h, esc(alt), LAZY if lazy else "")


def facts_dl(facts):
    return '<dl class="spec-grid">%s</dl>' % "".join("<div><dt>%s</dt><dd>%s</dd></div>" % (esc(k), esc(v)) for k, v in facts)


# ---------------------------------------------------------------- departments
def pick_depts(arg):
    arg = (arg or "all").strip()
    if arg == "all":
        return DEPT_LIST
    if arg == "detail":
        return [d for d in DEPT_LIST if d.get("detail")]
    if arg == "other":
        return [d for d in DEPT_LIST if not d.get("detail")]
    out = []
    for slug in [a.strip() for a in arg.split(",") if a.strip()]:
        if slug not in DEPTS:
            sys.exit("unknown department: " + slug)
        out.append(DEPTS[slug])
    return out


def dept_href(d):
    return d["page"] if d.get("detail") else "contact.html?dept=%s#appointment" % d["slug"]


def dept_link_text(d):
    return "View department" if d.get("detail") else "Request appointment"


def dept_tile(d, slot, with_id=True):
    """5 rows: media (photo + icon badge, or icon panel) / title / text / meta / link."""
    if slot and have(slot):
        media = '<div class="card-media dept-media">%s%s</div>' % (img_tag(slot, 800, 533, d["imageAlt"], 800), badge_icon(d["icon"], " icon-badge--float"))
    else:
        media = '<div class="card-media card-media--icon dept-media">%s</div>' % badge_icon(d["icon"], " icon-badge--lg")
    ident = ' id="dept-%s"' % d["slug"] if with_id else ""
    return ('<article class="card card--rows-5 dept-tile"%s data-group="%s" data-dept="%s">\n'
            '  %s\n  <h3 class="card-title"><a href="%s">%s</a></h3>\n  <p class="card-text">%s</p>\n'
            '  <ul class="meta"><li>%s%d consultants</li><li>%s%s</li></ul>\n'
            '  <a class="link" href="%s">%s %s</a>\n</article>'
            % (ident, " ".join(d["categories"]), d["slug"], media, dept_href(d), esc(d["name"]), esc(d["tagline"]),
               icon("people", 16), d["consultants"], icon("clock", 16), esc(d["opd"]), dept_href(d), dept_link_text(d), ARROW))


def macro_dept_tiles(arg, ctx):
    """{{dept_tiles all}}                    -> 12 tiles with dept-<slug> photos, id="dept-<slug>", data-group=categories (Departments page)
       {{dept_tiles a,b,c major}}            -> chosen tiles with major-<slug> photos (Home 1)
       {{dept_tiles a,b,c none}}             -> chosen tiles with icon panels, no photo (any page; never repeats a photo)"""
    parts = (arg or "all").split()
    sel = parts[0]
    mode = parts[1] if len(parts) > 1 else "dept"
    out = []
    for d in pick_depts(sel):
        slot = None if mode == "none" else (d["image"] if mode == "dept" else "%s-%s" % (mode, d["slug"]))
        out.append(dept_tile(d, slot, with_id=(mode == "dept")))
    return "\n".join(out)


def macro_dept_links(arg, ctx):
    """compact text tiles (icon badge + name + short + link), no photo. {{dept_links detail}} or slugs; 'except-current' skips the page's dept."""
    parts = (arg or "all").split()
    items = pick_depts(parts[0])
    cur = (ctx.get("_dept") or {}).get("slug")
    if "except-current" in parts:
        items = [d for d in items if d["slug"] != cur]
    out = ['<li><a class="dept-link" href="%s">%s<span class="dept-link-text"><strong>%s</strong><span>%s</span></span>%s</a></li>'
           % (dept_href(d), badge_icon(d["icon"], " icon-badge--sm"), esc(d["name"]), esc(d["short"]), ARROW) for d in items]
    return '<ul class="dept-links">%s</ul>' % "".join(out)


def macro_dept_chips(arg, ctx):
    target = (arg or "#deptGrid").strip()
    chips = ['<button class="chip" type="button" data-filter="all" aria-pressed="true">All departments</button>']
    chips += ['<button class="chip" type="button" data-filter="%s" aria-pressed="false">%s</button>' % (c["key"], esc(c["label"])) for c in CATEGORIES]
    return '<div class="chips" role="group" aria-label="Filter departments by category" data-filter-group="%s">%s</div>' % (target, "".join(chips))


def macro_dept_options(arg, ctx):
    """<option> list of all departments (value = slug). {{dept_options}}"""
    return "".join('<option value="%s">%s</option>' % (d["slug"], esc(d["name"])) for d in DEPT_LIST)


# ---------------------------------------------------------------- doctors
STATUS = {"available": ("Available today", "ok"), "busy": ("Few slots left", "warn"), "away": ("Next OPD tomorrow", "muted")}


def pick_docs(arg):
    arg = (arg or "all").strip()
    if arg == "all":
        return DOC_LIST
    if arg in DEPTS:
        return [d for d in DOC_LIST if d["department"] == arg]
    out = []
    for i in [a.strip() for a in arg.split(",") if a.strip()]:
        if i not in DOCS:
            sys.exit("unknown doctor: " + i)
        out.append(DOCS[i])
    return out


def doctor_card(x):
    """6 rows: portrait + status dot / name / degree chips / department + experience / meta (languages, OPD, rating) / actions."""
    dept = DEPTS[x["department"]]
    label, tone = STATUS.get(x.get("status", "available"), STATUS["available"])
    if have(x["id"]):
        media = '<div class="card-media card-media--portrait doc-media">%s<span class="avail avail--%s"><span class="avail-dot" aria-hidden="true"></span>%s</span></div>' % (
            img_tag(x["id"], 800, 800, "%s, %s" % (x["name"], dept["name"]), 800), tone, label)
    else:
        initials = "".join(w[0] for w in x["name"].replace("Dr ", "").split()[:2])
        media = '<div class="card-media card-media--portrait card-media--icon doc-media"><span class="doc-initials" aria-hidden="true">%s</span><span class="avail avail--%s"><span class="avail-dot" aria-hidden="true"></span>%s</span></div>' % (initials, tone, label)
    search = " ".join([x["name"], dept["name"], dept["short"], x["title"]] + x["qualifications"]).lower()
    return ('<article class="card card--rows-6 doctor-card" id="{id}" data-group="{dept}" data-search="{search}">\n'
            '  {media}\n'
            '  <h3 class="card-title">{name}</h3>\n'
            '  <ul class="degree-chips" aria-label="Qualifications">{chips}</ul>\n'
            '  <p class="card-sub"><a href="{dhref}">{dname}</a> <span aria-hidden="true">·</span> <span class="ltr-num">{yrs}</span> years experience</p>\n'
            '  <ul class="meta"><li>{i_lang}{langs}</li><li>{i_cal}OPD {opd}</li><li class="rating">{i_star}<span class="ltr-num">{rating}</span> ({reviews})</li></ul>\n'
            '  <div class="card-actions"><button class="btn btn-secondary" type="button" data-doctor-profile="{id}">View profile</button><a class="btn btn-primary" href="dashboard-appointments.html?doctor={id}">Book appointment</a></div>\n'
            '</article>').format(
        id=x["id"], dept=x["department"], search=esc(search), media=media, name=esc(x["name"]),
        chips="".join("<li>%s</li>" % esc(c) for c in x["chips"]), dhref=dept_href(dept), dname=esc(dept["name"]), yrs=x["experience"],
        i_lang=icon("lang", 16), langs=esc(", ".join(x["languages"][:3])), i_cal=icon("calendar", 16), opd=esc(", ".join(x["opd"])),
        i_star=icon("star", 16), rating=x["rating"], reviews=inr(x["reviews"]))


def macro_doctor_cards(arg, ctx):
    return "\n".join(doctor_card(x) for x in pick_docs(arg))


def doc_row(x):
    dept = DEPTS[x["department"]]
    return ('<li class="doc-row"><a href="doctors.html#{id}"><span class="doc-row-name">{name}</span><span class="doc-row-meta">{title} · {quals}</span></a>'
            '<span class="doc-row-opd">{i}OPD {opd}, {time}</span></li>').format(
        id=x["id"], name=esc(x["name"]), title=esc(x["title"]), quals=esc(", ".join(x["chips"])), i=icon("calendar", 16), opd=esc(", ".join(x["opd"])), time=esc(x["opdTime"]))


def macro_doctor_list(arg, ctx):
    """text list (no photos) of doctors linking to doctors.html#doc-N. {{doctor_list cardiology}} or {{doctor_list doc-1,doc-4}}; inside a department page plain {{doctor_list}}"""
    sel = (arg or "").strip() or (ctx.get("_dept") or {}).get("slug") or "all"
    docs = pick_docs(sel)
    if not docs:
        return '<p class="note">Consultants for this department are listed at the OPD desk. <a href="contact.html#appointment">Request an appointment</a>.</p>'
    return '<ul class="doc-list">%s</ul>' % "".join(doc_row(x) for x in docs)


# ---------------------------------------------------------------- department detail (template: department)
def need_dept(ctx):
    d = ctx.get("_dept")
    if not d or not d.get("detail"):
        sys.exit("%s: department macro used but no detail 'department:' key in front matter" % ctx["_name"])
    return d


def macro_d_facts(arg, ctx):
    d = need_dept(ctx)
    return ('<aside class="panel panel--accent" id="facts" aria-labelledby="facts-title"><h2 id="facts-title">At a glance</h2>%s'
            '<ul class="icon-list panel-list"><li>%s<span>OPD: %s</span></li><li>%s<span>%s</span></li></ul></aside>'
            % (facts_dl(d["facts"]), icon("clock", 20), esc(d["opd"]), icon("map", 20), esc(d["floor"])))


def macro_d_conditions(arg, ctx):
    d = need_dept(ctx)
    return '<ul class="condition-grid">%s</ul>' % "".join("<li>%s<span>%s</span></li>" % (icon("check", 18), esc(c)) for c in d["conditions"])


def _icon_cards(items, icon_name):
    return "\n".join('<article class="card card--rows-3 info-card">%s<h3 class="card-title">%s</h3><p class="card-text">%s</p></article>'
                     % (badge_icon(icon_name), esc(a), esc(b)) for a, b in items)


def macro_d_procedures(arg, ctx):
    return '<div class="cards cards--4">%s</div>' % _icon_cards(need_dept(ctx)["procedures"], "stethoscope")


def macro_d_technology(arg, ctx):
    return '<div class="cards cards--trio">%s</div>' % _icon_cards(need_dept(ctx)["technology"], "scan")


def faq_html(pairs, group):
    items = "".join('<details class="faq-item" name="faq-%s"><summary>%s</summary><div class="faq-answer"><p>%s</p></div></details>' % (group, esc(q), esc(a)) for q, a in pairs)
    return '<div class="faq"><div class="faq-list">%s</div></div>' % items


def macro_d_faq(arg, ctx):
    d = need_dept(ctx)
    return faq_html(d["faqs"], d["slug"])


MACROS = {
    "dept_tiles": macro_dept_tiles, "dept_links": macro_dept_links, "dept_chips": macro_dept_chips, "dept_options": macro_dept_options,
    "doctor_cards": macro_doctor_cards, "doctor_list": macro_doctor_list,
    "d_facts": macro_d_facts, "d_conditions": macro_d_conditions, "d_procedures": macro_d_procedures,
    "d_technology": macro_d_technology, "d_faq": macro_d_faq,
    "icon_arrow": lambda arg, ctx: ARROW,
    "icon": lambda arg, ctx: icon((arg or "shield").split()[0], int((arg or "x 24").split()[1]) if len((arg or "").split()) > 1 else 24),
    "badge": lambda arg, ctx: badge_icon((arg or "shield").split()[0], "".join(" icon-badge--" + m for m in (arg or "").split()[1:])),
}


def srcset(slot):
    s = "images/{s}-800.webp 800w, images/{s}-1600.webp 1600w".format(s=slot)
    if slot.startswith("hero-"):
        s += ", images/{s}-2000.webp 2000w".format(s=slot)
    return s


def page_hero(fm):
    slot = fm.get("hero")
    if not slot:
        return ""
    crumbs = [c.strip() for c in fm.get("crumbs", "").split("|") if c.strip()]
    nav = ""
    if crumbs:
        parts = ['<a href="index.html">Home</a>']
        for i, c in enumerate(crumbs):
            if "=" in c and i < len(crumbs) - 1:
                label, href = c.split("=", 1)
                parts.append('<a href="%s">%s</a>' % (href, esc(label)))
            else:
                parts.append('<span aria-current="page">%s</span>' % esc(c.split("=")[0]))
        nav = '<nav class="crumbs" aria-label="Breadcrumb">' + '<span aria-hidden="true">/</span>'.join(parts) + "</nav>\n      "
    eyebrow = '<p class="eyebrow">%s</p>\n      ' % esc(fm["eyebrow"]) if fm.get("eyebrow") else ""
    lead = '\n      <p>%s</p>' % fm["lead"] if fm.get("lead") else ""
    if have(slot, "1600"):
        bg = '<img class="page-hero-bg" src="images/{s}-1600.webp" srcset="{ss}" sizes="100vw" width="1600" height="1067" alt="{alt}" fetchpriority="high">\n    '.format(s=slot, ss=srcset(slot), alt=esc(fm.get("hero_alt", "")))
        cls = "page-hero"
    else:
        bg, cls = "", "page-hero page-hero--plain"
    return ('<section class="{cls}" aria-labelledby="hero-title">\n'
            '    {bg}<div class="hero-shade" aria-hidden="true"></div>\n'
            '    <div class="container page-hero-content">\n'
            '      {nav}{eyebrow}<h1 id="hero-title">{h1}</h1>{lead}\n'
            '    </div>\n  </section>\n').format(cls=cls, bg=bg, nav=nav, eyebrow=eyebrow, h1=fm.get("h1", ""), lead=lead)


# ---------------------------------------------------------------- front matter
def parse(text):
    fm = {}
    body = text
    if text.startswith("---"):
        parts = text.split("\n---", 1)
        head = parts[0][3:]
        body = parts[1].lstrip("\n") if len(parts) > 1 else ""
        for line in head.splitlines():
            if ":" in line and not line.strip().startswith("#"):
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip()
    return fm, body


NAV_HOME = {"home1", "home2"}
APP_NAV = [""]


def apply_nav(text, nav):
    text = re.sub(r'data-nav="(\w+)"', lambda m: 'aria-current="page"' if m.group(1) == nav else "", text)
    text = re.sub(r' data-app="([\w\-]+)"', lambda m: ' aria-current="page"' if m.group(1) == APP_NAV[0] else "", text)
    return text


def render_vars(text, ctx):
    def macro(m):
        name, arg = m.group(1), (m.group(2) or "").strip()
        if name in MACROS:
            return MACROS[name](arg, ctx)
        return m.group(0)
    text = re.sub(r"\{\{(\w+)(?:\s+([^}]*))?\}\}", macro, text)

    def var(m):
        key = m.group(1)
        if key.startswith("d."):
            dv = ctx.get("_dept") or {}
            val = dv.get(key[2:])
            return "" if val is None else esc(str(val))
        if key in ctx:
            return str(ctx[key])
        print("  warning: %s: unknown placeholder {{%s}}" % (ctx["_name"], key))
        return ""
    return re.sub(r"\{\{([\w\.\-]+)\}\}", var, text)


def build_page(path):
    name = path.stem
    fm, body = parse(path.read_text(encoding="utf-8"))
    if "template" in fm:
        t = SRC / "templates" / (fm["template"] + ".html")
        tfm, tbody = parse(t.read_text(encoding="utf-8"))
        fm = {**tfm, **fm}
        body = tbody
    layout = fm.get("layout", "public")
    dept = None
    if fm.get("department"):
        if fm["department"] not in DEPTS:
            sys.exit("%s: unknown department %s" % (name, fm["department"]))
        dept = DEPTS[fm["department"]]
        fm.setdefault("hero", dept.get("hero", ""))
        fm.setdefault("hero_alt", dept.get("heroAlt", ""))
        fm.setdefault("crumbs", "Departments=departments.html|" + dept["short"])
        fm.setdefault("eyebrow", "Department")
        fm.setdefault("h1", dept["name"])
        fm.setdefault("lead", esc(dept["tagline"]))
        fm.setdefault("title", "%s | Northcrest Multispeciality Hospital" % dept["name"])
        fm.setdefault("description", dept["summary"])
    nav = fm.get("nav", "")
    APP_NAV[0] = fm.get("app_nav", "")
    ctx = {"_name": name, "title": fm.get("title", "Northcrest Multispeciality Hospital | " + name),
           "description": fm.get("description", "Northcrest Multispeciality Hospital, Bengaluru: 12 specialities, 24/7 emergency care and a patient portal."),
           "css": fm.get("css", name), "js": fm.get("js", name), "body_class": fm.get("body_class", ""),
           "home_current": " is-current" if nav in NAV_HOME else "", "app_title": fm.get("app_title", ""), "year": "2026"}
    for k, v in fm.items():
        if k not in ctx:
            ctx[k] = v
    if dept:
        ctx["_dept"] = dept
    for k in ("title", "description"):
        ctx[k] = render_vars(ctx[k], ctx) if "{{" in ctx[k] else ctx[k]
    pre = fm.get("preload") or fm.get("hero")
    ctx["preload_tag"] = ('  <link rel="preload" as="image" href="images/{p}-1600.webp" imagesrcset="{ss}" imagesizes="100vw" fetchpriority="high">\n'.format(p=pre, ss=srcset(pre)) if pre and have(pre, "1600") else "")
    body = body.rstrip() + "\n"
    head = partial("head")
    if layout == "public":
        out = head + partial("header") + '  <main id="main">\n  ' + page_hero(fm) + body + "  </main>\n" + partial("footer")
    elif layout == "app":
        out = head + partial("app-top") + body + partial("app-bottom")
    elif layout == "auth":
        out = head + body + "</body>\n</html>\n"
    else:
        sys.exit("%s: unknown layout %s" % (name, layout))
    out = include_partials(out)
    out = render_vars(out, ctx)
    out = apply_nav(out, nav if layout == "public" else "")
    (ROOT / (name + ".html")).write_text(out, encoding="utf-8")
    return name


def main():
    js = ("/* generated by scripts/build.py from data/departments.json and data/doctors.json: do not edit */\n"
          "window.NORTHCREST_CATEGORIES = " + json.dumps(CATEGORIES, ensure_ascii=False) + ";\n"
          "window.NORTHCREST_DEPARTMENTS = " + json.dumps(DEPT_LIST, ensure_ascii=False) + ";\n"
          "window.NORTHCREST_DOCTORS = " + json.dumps(DOC_LIST, ensure_ascii=False) + ";\n")
    (ROOT / "data" / "site-data.js").write_text(js, encoding="utf-8")
    names = [build_page(p) for p in sorted((SRC / "pages").glob("*.html"))]
    print("built %d pages: %s" % (len(names), ", ".join(names)))
    if MISSING:
        print("  note: photos not in images/ yet (fallbacks used): " + ", ".join(sorted(MISSING)))


if __name__ == "__main__":
    main()
