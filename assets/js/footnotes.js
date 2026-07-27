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

            note.replaceWith(fragment);
        });
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
            scheduleResolve();
            afterMathJax(scheduleResolve);
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", run);
        } else {
            run();
        }

        window.addEventListener("resize", scheduleResolve);
    }

    window.FOOTNOTES = {
        init: init,
        expand: expand,
        resolveMathCollisions: resolveMathCollisions,
    };

    init();
})();
