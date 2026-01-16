from pathlib import Path
import json


def inject_ui(out: Path, people_meta: dict):
    """Inject UI, CSS, and JS into generated HTML."""
    html = out.read_text(encoding="utf-8")

    # Use external assets (CSS/JS) and a tiny bootstrap instead of large inline JS.

    # Add title and external assets (Tom Select, CSS, JS)
    if "<head>" in html and "<title>" not in html:
        html = html.replace("<head>", "<head>\n        <title>Interdisciplinary Mapping — Active People & Publications</title>", 1)
    if "</head>" in html and "tom-select.complete.min.js" not in html:
        ts_assets = (
            "\n        <link rel=\"stylesheet\" href=\"lib/tom-select/tom-select.css\">\n"
            "        <script src=\"lib/tom-select/tom-select.complete.min.js\"></script>\n"
        )
        html = html.replace("</head>", ts_assets + "        </head>", 1)
    if "</head>" in html and "assets/vis_styles.css" not in html:
        html = html.replace(
            "</head>",
            "\n        <link rel=\"stylesheet\" href=\"assets/vis_styles.css\">\n        </head>",
            1,
        )
    if "</head>" in html and "assets/vis_ui.js" not in html:
        html = html.replace(
            "</head>",
            "\n        <script src=\"assets/vis_ui.js\"></script>\n        </head>",
            1,
        )

    # External CSS handles styling; no inline CSS needed.

    # Header
    marker = '<div class="card" style="width: 100%">'
    if marker in html and "class=\"header\"" not in html:
        header_html = (
            '<div class="header">\n'
            '  <h1>Interdisciplinary Mapping</h1>\n'
            '  <div class="sub">Active people with publications</div>\n'
            '  <div class="legend">\n'
            '    <span class="hint">Click a node to highlight neighbors</span>\n'
            '  </div>\n'
            '</div>'
        )
        html = html.replace(marker, header_html + "\n" + marker, 1)

    # Panels and floating controls
    network_marker = '<div id="mynetwork" class="card-body"></div>'
    if network_marker in html and 'id="floating_controls"' not in html:
        controls_html = (
            '<div id="floating_controls" '
            '     style="position:fixed; bottom:16px; right:16px; z-index:1000; '
            '            background:rgba(255,255,255,0.95); padding:8px; '
            '            border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08);">'
            '  <div class="fc-header" style="display:flex; align-items:center; justify-content:flex-end; gap:6px; margin-bottom:6px;">'
            '    <button id="fc_toggle" title="Collapse" style="width:24px; height:24px; line-height:20px; text-align:center;">▼</button>'
            '  </div>'
              '  <div class="fc-body" style="display:flex; flex-direction:column; gap:6px; width:180px;">'
            '    <button id="centerGraph" style="width:100%;">Center graph</button>'
            '    <button id="toggleLabels" style="width:100%;">Labels: All</button>'
            '    <div id="filter_controls" style="border-top:1px solid #eee; margin-top:6px; padding-top:6px; width:100%;">'
            '      <div style="font-weight:600; font-size:13px; margin-bottom:4px;">Filter</div>'
            '      <label style="display:block; font-size:13px;"><input type="checkbox" id="flt_discover" checked> Discover</label>'
            '      <label style="display:block; font-size:13px;"><input type="checkbox" id="flt_direct" checked> Direct</label>'
            '      <label style="display:block; font-size:13px;"><input type="checkbox" id="flt_develop" checked> Develop</label>'
            '      <label style="display:block; font-size:13px;"><input type="checkbox" id="flt_pis"> PIs</label>'
            '      <div style="margin-top:6px;">'
            '        <div style="font-weight:600; font-size:13px; margin-bottom:4px;">People</div>'
            '        <select id="people_select" multiple size="6" style="width:100%; min-width:160px; max-width:320px;"></select>'
            '      </div>'
            '      <div style="margin-top:6px; display:flex; gap:6px;">'
            '        <button id="flt_apply" style="flex:1;">Apply</button>'
            '        <button id="flt_clear" style="flex:1;">Show all</button>'
            '      </div>'
            '    </div>'
            '    <button id="ap_toggle" style="width:100%;">Add Publication</button>'
            '  </div>'
            '</div>'
        )
        html = html.replace(network_marker, controls_html + "\n" + network_marker, 1)

    # Add a fixed legend box (top-left)
    if network_marker in html and 'id="legend_box"' not in html:
        legend_html = (
            '<div id="legend_box">'
            '  <div style="font-weight:600; margin-bottom:6px; font-size:13px;">Legend</div>'
            '  <div class="legend">'
            '    <span class="box person"></span> Person'
            '    <span class="box pub"></span> Publication'
            '    <span class="box pub_pi"></span> Pub (2+ PIs)'
            '  </div>'
            '</div>'
        )
        html = html.replace(network_marker, legend_html + "\n" + network_marker, 1)

    if network_marker in html and 'id="addPubPanel"' not in html:
        add_panel = (
            '<div id="addPubPanel" class="panel" style="margin:8px 0; display:none;">'
            '  <div style="font-weight:600;margin-bottom:6px;">Add Publication (quick entry)</div>'
            '  <div class="row">'
            '    <input id="ap_title" placeholder="Title" style="flex:1;min-width:240px;">'
            '    <input id="ap_short" placeholder="Short title" style="width:240px;">'
            '    <input id="ap_team" placeholder="Team" value="Discover" style="width:160px;">'
            '    <input id="ap_type" placeholder="Type (Journal, Conference...)" style="width:200px;">'
            '    <input id="ap_date" placeholder="Date (YYYY-MM-DD)" style="width:160px;">'
            '    <input id="ap_project_year" placeholder="Project Year (1,2,3...)" style="width:180px;">'
            '    <input id="ap_venue" placeholder="Venue" style="flex:1;min-width:240px;">'
            '    <input id="ap_doi" placeholder="DOI URL" style="flex:1;min-width:240px;">'
            '    <select id="ap_authors_sel" multiple size="8" style="flex:1;min-width:280px;">'
            '    </select>'
            '  </div>'
            '  <div class="row" style="margin-top:8px; gap:8px; align-items:center;">'
            '    <button id="ap_preview">Preview in graph</button>'
            '    <button id="ap_generate">Generate NDJSON</button>'
            '    <span id="ap_msg" style="color:#666;"></span>'
            '  </div>'
            '  <textarea id="ap_ndjson" rows="3" style="width:100%;margin-top:6px;display:none;"></textarea>'
            '</div>'
        )
        html = html.replace(network_marker, add_panel + "\n" + network_marker, 1)

    if network_marker in html and 'id="infoBox"' not in html:
        info_html = (
            '<div id="infoBox" class="info-box" style="padding:12px;border:1px solid #e0e0e0;background:#fafafa;margin:0 0 8px 0;">'
            '  <div class="info-title" style="font-weight:600;margin-bottom:4px;">Click a node to see details here</div>'
            '</div>'
        )
        html = html.replace(network_marker, info_html + "\n" + network_marker, 1)

    # Info box styled via external CSS.

    # Replace post-draw bootstrap: set AP_PEOPLE and call external initializer
    if "drawGraph();" in html:
        ap_people = json.dumps([
            {"id": pid, "name": meta.get("name", "")}
            for pid, meta in people_meta.items()
            if bool(meta.get("active", False))
        ])
        bootstrap = (
            """
// --- Copilot injected: bootstrap external UI ---
window.AP_PEOPLE = __AP_PEOPLE_JSON__;
if (window.IM_initUI) { try { window.IM_initUI(); } catch (e) { console && console.warn && console.warn('IM_initUI failed', e); } }
// --- End bootstrap ---
"""
        ).replace("__AP_PEOPLE_JSON__", ap_people)
        html = html.replace("drawGraph();", "drawGraph();\n" + bootstrap, 1)

    out.write_text(html, encoding="utf-8")
