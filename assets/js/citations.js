/**
 * Automatic numbered citations for static pages.
 *
 * Usage:
 *   1. Define bibliography once:
 *      <script type="application/json" id="bibliography">
 *      [
 *        {
 *          "key": "katharopoulos2020",
 *          "authors": "Angelos Katharopoulos, et al.",
 *          "title": "Transformers are RNNs...",
 *          "url": "https://arxiv.org/abs/2006.16236",
 *          "venue": "ICML 2020",
 *          "note": "arXiv:2006.16236"
 *        }
 *      ]
 *      </script>
 *
 *   2. Cite inline with:
 *      <cite data-key="katharopoulos2020"></cite>
 *
 *   3. Place an empty references container where the list should appear:
 *      <section class="references" aria-labelledby="references-heading"></section>
 *
 *   4. Include this script:
 *      <script src="/assets/js/citations.js"></script>
 *
 * Optional: pass a custom bibliography via window.CITATIONS.init(entries).
 * Structured fields may be replaced by a raw "html" string for one-off formatting.
 */
(function () {
    "use strict";

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function loadBibliography() {
        if (Array.isArray(window.BIBLIOGRAPHY)) {
            return window.BIBLIOGRAPHY;
        }

        var node =
            document.getElementById("bibliography") ||
            document.querySelector('script[type="application/json"][data-bibliography]');

        if (!node) {
            return [];
        }

        try {
            var parsed = JSON.parse(node.textContent);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("citations.js: failed to parse bibliography JSON", error);
            return [];
        }
    }

    function indexByKey(entries) {
        var map = Object.create(null);
        entries.forEach(function (entry) {
            if (!entry || !entry.key) {
                console.warn("citations.js: skipping bibliography entry without a key", entry);
                return;
            }
            if (map[entry.key]) {
                console.warn("citations.js: duplicate bibliography key", entry.key);
            }
            map[entry.key] = entry;
        });
        return map;
    }

    function formatEntry(entry) {
        if (entry.html) {
            return entry.html;
        }

        var out = "";

        if (entry.authors) {
            out += escapeHtml(entry.authors);
        }

        if (entry.title) {
            var title = entry.url
                ? '<a href="' +
                  escapeHtml(entry.url) +
                  '">' +
                  escapeHtml(entry.title) +
                  "</a>"
                : escapeHtml(entry.title);
            if (out) out += ", ";
            // American-style: comma stays inside the closing quote when more follows.
            out +=
                "“" +
                title +
                (entry.venue || entry.note ? ",”" : "”");
        }

        if (entry.venue) {
            if (out) out += " ";
            out += escapeHtml(entry.venue);
        }

        if (entry.note) {
            if (out) out += ", ";
            out += escapeHtml(entry.note);
        }

        return out ? out + "." : "";
    }

    function ensureReferencesSection(root) {
        var section = root.querySelector(".references");
        if (section) {
            return section;
        }

        section = document.createElement("section");
        section.className = "references";
        section.setAttribute("aria-labelledby", "references-heading");
        root.appendChild(section);
        return section;
    }

    function render(entries) {
        var root =
            document.querySelector("article.content-blog-post") ||
            document.querySelector("article") ||
            document.querySelector(".content") ||
            document.body;

        var bib = indexByKey(entries || loadBibliography());
        var cites = Array.prototype.slice.call(root.querySelectorAll("cite[data-key]"));

        if (!cites.length) {
            return;
        }

        var order = [];
        var numbers = Object.create(null);
        var occurrences = Object.create(null);

        cites.forEach(function (cite) {
            var key = cite.getAttribute("data-key");
            if (!key) {
                return;
            }

            if (!bib[key]) {
                console.warn("citations.js: unknown citation key", key);
                cite.textContent = "[?]";
                cite.classList.add("citation", "citation-missing");
                return;
            }

            if (!numbers[key]) {
                order.push(key);
                numbers[key] = order.length;
                occurrences[key] = 0;
            }

            occurrences[key] += 1;
            var num = numbers[key];
            var occ = occurrences[key];
            var citeId = "cite-" + num + "-" + occ;

            // Promote <cite> to an <a> so citations remain navigable.
            var link = document.createElement("a");
            link.className = "citation";
            link.id = citeId;
            link.setAttribute("href", "#ref-" + num);
            link.setAttribute("aria-label", "See reference " + num);
            link.setAttribute("data-key", key);
            link.textContent = "[" + num + "]";
            cite.replaceWith(link);
        });

        if (!order.length) {
            return;
        }

        var section = ensureReferencesSection(root);
        section.innerHTML =
            '<h3 id="references-heading">References</h3><ol></ol>';

        var list = section.querySelector("ol");

        order.forEach(function (key, index) {
            var num = index + 1;
            var entry = bib[key];
            var li = document.createElement("li");
            li.id = "ref-" + num;
            li.innerHTML = formatEntry(entry);

            var backlinks = document.createElement("span");
            backlinks.className = "reference-backlinks";
            backlinks.setAttribute("aria-label", "Back to citations");

            for (var occ = 1; occ <= occurrences[key]; occ += 1) {
                var back = document.createElement("a");
                back.href = "#cite-" + num + "-" + occ;
                back.setAttribute(
                    "aria-label",
                    "Back to reference " + num + " citation, occurrence " + occ
                );
                back.textContent = "↩︎" + occ;
                backlinks.appendChild(back);
            }

            li.appendChild(document.createTextNode(" "));
            li.appendChild(backlinks);
            list.appendChild(li);
        });
    }

    function init(entries) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
                render(entries);
            });
        } else {
            render(entries);
        }
    }

    window.CITATIONS = {
        init: init,
        render: render,
    };

    init();
})();
