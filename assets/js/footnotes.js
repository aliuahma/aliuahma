/**
 * Expand compact footnote markup into Tufte-style sidenotes.
 *
 * Usage:
 *   <span class="footnote">Aside text goes here.</span>
 *
 * Becomes label + checkbox toggle + .sidenote (mobile-expandable).
 * Numbering stays CSS-driven via .sidenote-number / .sidenote counters.
 *
 * Wide display math that overhangs into the margin will push overlapping
 * sidenotes up; short equations leave sidenotes alone.
 *
 * Include:
 *   <script src="/assets/js/footnotes.js"></script>
 */
(function () {
    "use strict";

    var GAP = 8;

    function expand(root) {
        var scope = root || document;
        var notes = Array.prototype.slice.call(
            scope.querySelectorAll(".footnote:not([data-footnote-expanded])")
        );

        notes.forEach(function (note, index) {
            var id = note.id || "fn-" + (index + 1);
            var content = note.innerHTML;

            var label = document.createElement("label");
            label.className = "margin-toggle sidenote-number";
            label.setAttribute("for", id);
            label.setAttribute("aria-label", "Show footnote");

            var input = document.createElement("input");
            input.type = "checkbox";
            input.id = id;
            input.className = "margin-toggle";
            input.setAttribute("aria-label", "Show footnote");

            var sidenote = document.createElement("span");
            sidenote.className = "sidenote";
            sidenote.innerHTML = content;

            var fragment = document.createDocumentFragment();
            fragment.appendChild(label);
            fragment.appendChild(input);
            fragment.appendChild(sidenote);
            sidenote.setAttribute("data-anchor", id);
            input.addEventListener("change", layoutNotes);

            note.replaceWith(fragment);
        });
    }

    function restore(note) {
        var input = document.getElementById(note.getAttribute("data-anchor"));
        note.classList.remove("is-open");
        note.style.display = "";
        if (input && note.previousElementSibling !== input) {
            input.after(note);
        }
    }

    /*
     * A block-level note splits the line where it sits in the markup. On a
     * narrow window, move an open note to the end of the marker's line so
     * the rest of that line stays above the note.
     */
    function findEndOfLine(anchor) {
        var block = anchor.closest("p, li, blockquote, dd, figcaption") || anchor.parentElement;
        if (!block) {
            return null;
        }

        var anchorRect = anchor.getBoundingClientRect();
        var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (node.parentElement && node.parentElement.closest(".sidenote")) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });

        var lineTop = null;
        var last = null;

        while (walker.nextNode()) {
            var node = walker.currentNode;
            if (!(anchor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                continue;
            }

            var text = node.textContent;
            for (var i = 0; i < text.length; i++) {
                var range = document.createRange();
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                var rect = range.getClientRects()[0];
                if (!rect || rect.height === 0) {
                    continue;
                }

                if (lineTop === null) {
                    if (rect.top > anchorRect.bottom + 4) {
                        return null;
                    }
                    lineTop = rect.top;
                }

                if (rect.top > lineTop + 3) {
                    return last;
                }

                last = { node: node, offset: i + 1 };
            }
        }

        return last;
    }

    function layoutNotes() {
        var narrow = window.matchMedia("(max-width: 1200px)").matches;
        var notes = Array.prototype.slice.call(document.querySelectorAll(".sidenote[data-anchor]"));
        var open = [];

        notes.forEach(function (note) {
            var input = document.getElementById(note.getAttribute("data-anchor"));
            if (input && input.checked && narrow) {
                open.push(note);
            }
            restore(note);
        });

        if (!open.length) {
            return;
        }

        // The checked rule would show the note at the marker and split the
        // line. Hide it so the measurement sees the unbroken line.
        open.forEach(function (note) {
            note.style.display = "none";
        });
        document.body.getBoundingClientRect();

        var placements = open.map(function (note) {
            var input = document.getElementById(note.getAttribute("data-anchor"));
            var label = input && input.previousElementSibling;
            return {
                note: note,
                spot: label && findEndOfLine(label),
            };
        });

        placements.reverse().forEach(function (item) {
            item.note.style.display = "";
            if (item.spot) {
                var range = document.createRange();
                range.setStart(item.spot.node, item.spot.offset);
                range.collapse(true);
                range.insertNode(item.note);
            }
            item.note.classList.add("is-open");
        });
    }

    var layoutFrame = 0;

    function scheduleLayout() {
        window.cancelAnimationFrame(layoutFrame);
        layoutFrame = window.requestAnimationFrame(layoutNotes);
    }

    function overlaps(a, b) {
        return !(
            a.bottom <= b.top ||
            a.top >= b.bottom ||
            a.right <= b.left ||
            a.left >= b.right
        );
    }

    /**
     * If a display-math block overhangs the main column and intersects a
     * sidenote, shift that sidenote up so the equation keeps its place.
     */
    function resolveMathCollisions() {
        var column =
            document.querySelector("article.content-blog-post") ||
            document.querySelector(".content-blog-post");
        if (!column) {
            return;
        }

        var columnWidth = column.getBoundingClientRect().width;
        var notes = Array.prototype.slice.call(column.querySelectorAll(".sidenote"));
        var maths = Array.prototype.slice.call(
            column.querySelectorAll(".display-math, .equation")
        );

        notes.forEach(function (note) {
            note.style.transform = "";
        });

        notes.forEach(function (note) {
            var noteRect = note.getBoundingClientRect();
            var shift = 0;

            maths.forEach(function (math) {
                var mathRect = math.getBoundingClientRect();
                var overhangs = mathRect.width > columnWidth + 1;
                if (!overhangs) {
                    return;
                }

                var adjusted = {
                    top: noteRect.top + shift,
                    bottom: noteRect.bottom + shift,
                    left: noteRect.left,
                    right: noteRect.right,
                };

                if (overlaps(adjusted, mathRect)) {
                    shift -= adjusted.bottom - mathRect.top + GAP;
                }
            });

            if (shift) {
                note.style.transform = "translateY(" + shift + "px)";
            }
        });
    }

    function scheduleResolve() {
        window.requestAnimationFrame(resolveMathCollisions);
    }

    function afterMathJax(callback) {
        if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
            MathJax.startup.promise.then(callback).catch(callback);
            return;
        }
        callback();
    }

    function init() {
        function run() {
            expand();
            scheduleLayout();
            scheduleResolve();
            afterMathJax(scheduleResolve);
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", run);
        } else {
            run();
        }

        window.addEventListener("resize", function () {
            scheduleLayout();
            scheduleResolve();
        });
    }

    window.FOOTNOTES = {
        init: init,
        expand: expand,
        resolveMathCollisions: resolveMathCollisions,
    };

    init();
})();
