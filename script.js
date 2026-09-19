/**
 * particle-field.js: dense two-layer canvas 2D particle background.
 * Plain JavaScript, no dependencies, no build step.
 *
 * Usage:
 *   <div class="bg" data-particle-field></div>
 *   <script src="particle-field.js" defer></script>
 *
 * Every element with a data-particle-field attribute is filled automatically.
 * Manual control:
 *   const stop = ParticleField.mount(element);  // returns a cleanup function
 *   stop();
 *
 * The host element must be positioned (relative / absolute / fixed) and have a
 * size. The canvas is transparent, so give the host its own background colour.
 */
(function () {
    "use strict";

    /* ---------------- tuning ---------------- */

    var SEED = 0x1f2e3d4c; // same field on every load

    var REF_AREA = 1440 * 810;

    var DUST_REF = 4800; // count at REF_AREA
    var DUST_MIN = 900; // floor, so a phone still has a field
    var DUST_MAX = 9000; // ceiling for very large screens
    var NODE_REF = 130;
    var NODE_MIN = 48;
    var NODE_MAX = 170;

    var MARGIN = 64; // wrap margin, px (must stay larger than PARALLAX_DUST)
    var DUST_DRIFT = 0.9; // initial +/- px per frame
    var NODE_DRIFT = 0.5; // +/- px per frame
    var FIELD_GAIN = 0.02;
    var DAMP = 0.985;

    var PARALLAX_DUST = 45; // px, max offset of the front (dust) layer
    var PARALLAX_NODE = PARALLAX_DUST / 1.9; // dust moves ~1.9x further
    var PARALLAX_EASE = 0.065; // per 60Hz frame (higher = snappier)

    // Mouse "stir": moving the pointer drags nearby dust along with it.
    // Set STIR_GAIN to 0 to turn it off and keep parallax only.
    var STIR_RADIUS = 230; // px, how far from the cursor dust is affected
    var STIR_GAIN = 0.004; // how strongly it drags (higher = stronger)
    var STIR_MAX = 30; // px/frame cap on the pointer speed that counts

    var BUCKETS = 8;
    var DUST_ALPHA_MAX = 0.9;
    var LINK_DIST = 150; // px
    var LINK_ALPHA_MAX = 0.34;
    var SEG_CAP = 2048; // max link segments per alpha bucket

    var VIOLET = [167, 139, 250];
    var ORANGE = [255, 156, 84];
    var VIOLET_SHARE = 0.82;
    var NODE_STYLE = ["rgba(205,192,255,0.92)", "rgba(255,190,130,0.92)"];

    var TAU = Math.PI * 2;
    var BUCKET_SCALE = BUCKETS / DUST_ALPHA_MAX;
    var L2 = LINK_DIST * LINK_DIST;

    function rgba(c, a) {
        return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")";
    }

    // Precomputed strings: one style change per (colour, bucket) group.
    var DUST_STYLES = [];
    [VIOLET, ORANGE].forEach(function (c) {
        for (var b = 0; b < BUCKETS; b++) {
            DUST_STYLES.push(rgba(c, ((b + 0.5) / BUCKETS) * DUST_ALPHA_MAX));
        }
    }); // index = colour * BUCKETS + bucket
    var LINK_STYLES = [];
    for (var lb = 0; lb < BUCKETS; lb++) {
        LINK_STYLES.push(rgba(VIOLET, ((lb + 0.5) / BUCKETS) * LINK_ALPHA_MAX));
    }

    /* ---------------- helpers ---------------- */

    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6d2b79f5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : v > hi ? hi : v;
    }

    /** Build a fresh field for a CSS-pixel box. Same box, same field. */
    function build(w, h) {
        var area = w * h;
        var nd = clamp(Math.round((DUST_REF * area) / REF_AREA), DUST_MIN, DUST_MAX);
        var nn = clamp(Math.round((NODE_REF * area) / REF_AREA), NODE_MIN, NODE_MAX);
        var spanW = w + MARGIN * 2;
        var spanH = h + MARGIN * 2;
        var i;

        var rd = mulberry32(SEED);
        var dust = {
            n: nd,
            x: new Float32Array(nd),
            y: new Float32Array(nd),
            vx: new Float32Array(nd),
            vy: new Float32Array(nd),
            base: new Float32Array(nd),
            rate: new Float32Array(nd),
            phase: new Float32Array(nd),
            size: new Uint8Array(nd),
            color: new Uint8Array(nd),
            groups: [],
            counts: new Int32Array(2 * BUCKETS),
        };
        for (i = 0; i < 2 * BUCKETS; i++) dust.groups.push(new Int32Array(nd));
        for (i = 0; i < nd; i++) {
            dust.x[i] = -MARGIN + rd() * spanW;
            dust.y[i] = -MARGIN + rd() * spanH;
            dust.vx[i] = (rd() * 2 - 1) * DUST_DRIFT;
            dust.vy[i] = (rd() * 2 - 1) * DUST_DRIFT;
            dust.base[i] = DUST_ALPHA_MAX * (0.3 + 0.7 * rd());
            dust.rate[i] = 0.7 + rd() * 2.6; // rad/s
            dust.phase[i] = rd() * TAU;
            dust.size[i] = rd() < 0.72 ? 1 : 2;
            dust.color[i] = rd() < VIOLET_SHARE ? 0 : 1;
        }

        var rn = mulberry32(SEED ^ 0x5bd1e995);
        var nodes = {
            n: nn,
            x: new Float32Array(nn),
            y: new Float32Array(nn),
            vx: new Float32Array(nn),
            vy: new Float32Array(nn),
            r: new Float32Array(nn),
            color: new Uint8Array(nn),
            segs: [],
            segCount: new Int32Array(BUCKETS),
        };
        for (i = 0; i < BUCKETS; i++) nodes.segs.push(new Float32Array(SEG_CAP * 4));
        for (i = 0; i < nn; i++) {
            nodes.x[i] = -MARGIN + rn() * spanW;
            nodes.y[i] = -MARGIN + rn() * spanH;
            nodes.vx[i] = (rn() * 2 - 1) * NODE_DRIFT;
            nodes.vy[i] = (rn() * 2 - 1) * NODE_DRIFT;
            nodes.r[i] = 1.7 + rn() * 1.3;
            nodes.color[i] = rn() < VIOLET_SHARE ? 0 : 1;
        }

        return { dust: dust, nodes: nodes };
    }

    /* ---------------- mount ---------------- */

    function mount(host) {
        // Wrapper is decoration only: hidden from screen readers, ignores clicks.
        var wrap = document.createElement("div");
        wrap.setAttribute("aria-hidden", "true");
        wrap.style.cssText =
            "position:absolute;inset:0;overflow:hidden;pointer-events:none;";
        var canvas = document.createElement("canvas");
        canvas.style.cssText = "display:block;width:100%;height:100%;";
        wrap.appendChild(canvas);
        host.appendChild(wrap);

        var ctx = canvas.getContext("2d");
        if (!ctx) return function () { };

        var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        var reduced = mq.matches;
        var onScreen = true;
        var disposed = false;
        var raf = 0;
        var last = 0;
        var t = 0; // seconds of simulated time

        // Per-instance state. Whether to rebuild is decided by "do I have
        // particles?" and the CSS size, never by the canvas width/height
        // attributes, which another instance may already have set.
        var field = null;
        var cssW = 0;
        var cssH = 0;
        var dpr = 1;

        // Pointer parallax in unit space (-1..1), eased toward the target.
        var tx = 0;
        var ty = 0;
        var px = 0;
        var py = 0;

        // Pointer tracking for the stir effect (canvas CSS px).
        var mx = 0;
        var my = 0;
        var pdx = 0; // pointer movement accumulated since the last frame
        var pdy = 0;
        var svx = 0; // smoothed pointer velocity, px per 60Hz frame
        var svy = 0;
        var hasPrev = false;

        /* ---- simulation + drawing ---- */

        function render(dt) {
            var f = field;
            if (!f) return;
            var w = cssW;
            var h = cssH;
            var k = dt * 60; // frame-rate independent: 1 at 60Hz, 0 for a static frame
            var damp = Math.pow(DAMP, k);
            var ease = 1 - Math.pow(1 - PARALLAX_EASE, k);
            t += dt;
            px += (tx - px) * ease;
            py += (ty - py) * ease;

            // Pointer velocity, smoothed so it decays when the mouse stops.
            if (k > 0) {
                svx += (clamp(pdx / k, -STIR_MAX, STIR_MAX) - svx) * 0.3;
                svy += (clamp(pdy / k, -STIR_MAX, STIR_MAX) - svy) * 0.3;
                pdx = 0;
                pdy = 0;
            }
            var stir = k > 0 && STIR_GAIN > 0 && svx * svx + svy * svy > 0.04;
            var stirK = STIR_GAIN * k;
            var stirR2 = STIR_RADIUS * STIR_RADIUS;

            ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
            ctx.clearRect(0, 0, w, h);

            var spanW = w + MARGIN * 2;
            var spanH = h + MARGIN * 2;
            var maxX = w + MARGIN;
            var maxY = h + MARGIN;
            var i, j, g, b, c, o, X, Y;

            /* dust: advance, twinkle, bin by (colour, alpha bucket) */
            var d = f.dust;
            var dx = d.x, dy = d.y, dvx = d.vx, dvy = d.vy;
            var base = d.base, rate = d.rate, phase = d.phase;
            var size = d.size, color = d.color;
            var groups = d.groups, counts = d.counts;
            counts.fill(0);
            var ta = t * 0.34;
            var tb = t * 0.29;
            var gain = FIELD_GAIN * k;
            var pox = px * PARALLAX_DUST; // where dust is actually drawn
            var poy = py * PARALLAX_DUST;

            for (i = 0; i < d.n; i++) {
                X = dx[i];
                Y = dy[i];
                // Standing-wave flow field, then damp so it can't run away.
                var AX = dvx[i] + Math.sin(Y * 0.0045 + ta) * gain;
                var AY = dvy[i] + Math.cos(X * 0.0052 - tb) * gain;
                if (stir) {
                    // Drag dust near the cursor in the direction the cursor is moving.
                    var sx = X + pox - mx;
                    var sy = Y + poy - my;
                    var s2 = sx * sx + sy * sy;
                    if (s2 < stirR2) {
                        var wgt = 1 - s2 / stirR2;
                        wgt = wgt * wgt * stirK;
                        AX += svx * wgt;
                        AY += svy * wgt;
                    }
                }
                var VX = AX * damp;
                var VY = AY * damp;
                X += VX * k;
                Y += VY * k;
                if (X < -MARGIN) X += spanW;
                else if (X > maxX) X -= spanW;
                if (Y < -MARGIN) Y += spanH;
                else if (Y > maxY) Y -= spanH;
                dx[i] = X;
                dy[i] = Y;
                dvx[i] = VX;
                dvy[i] = VY;

                var a = base[i] * (0.62 + 0.38 * Math.sin(t * rate[i] + phase[i]));
                b = (a * BUCKET_SCALE) | 0;
                if (b >= BUCKETS) b = BUCKETS - 1;
                g = color[i] * BUCKETS + b;
                groups[g][counts[g]++] = i;
            }

            // One fillStyle per group, then hundreds of rects under it.
            var dox = px * PARALLAX_DUST;
            var doy = py * PARALLAX_DUST;
            for (g = 0; g < groups.length; g++) {
                c = counts[g];
                if (!c) continue;
                var arr = groups[g];
                ctx.fillStyle = DUST_STYLES[g];
                for (j = 0; j < c; j++) {
                    i = arr[j];
                    var s = size[i];
                    ctx.fillRect(dx[i] + dox, dy[i] + doy, s, s);
                }
            }

            /* nodes: advance, collect links per alpha bucket */
            var n = f.nodes;
            var nx = n.x, ny = n.y, nvx = n.vx, nvy = n.vy;
            for (i = 0; i < n.n; i++) {
                X = nx[i] + nvx[i] * k;
                Y = ny[i] + nvy[i] * k;
                if (X < -MARGIN) X += spanW;
                else if (X > maxX) X -= spanW;
                if (Y < -MARGIN) Y += spanH;
                else if (Y > maxY) Y -= spanH;
                nx[i] = X;
                ny[i] = Y;
            }

            var segs = n.segs, segCount = n.segCount;
            segCount.fill(0);
            for (i = 0; i < n.n; i++) {
                var xi = nx[i];
                var yi = ny[i];
                for (j = i + 1; j < n.n; j++) {
                    var ddx = nx[j] - xi;
                    var ddy = ny[j] - yi;
                    var d2 = ddx * ddx + ddy * ddy;
                    if (d2 >= L2) continue;
                    b = ((1 - Math.sqrt(d2) / LINK_DIST) * BUCKETS) | 0;
                    if (b >= BUCKETS) b = BUCKETS - 1;
                    c = segCount[b];
                    if (c >= SEG_CAP) continue;
                    o = c * 4;
                    var sg = segs[b];
                    sg[o] = xi;
                    sg[o + 1] = yi;
                    sg[o + 2] = nx[j];
                    sg[o + 3] = ny[j];
                    segCount[b] = c + 1;
                }
            }

            var nox = px * PARALLAX_NODE;
            var noy = py * PARALLAX_NODE;

            // One beginPath/stroke per bucket.
            ctx.lineWidth = 1;
            for (b = 0; b < BUCKETS; b++) {
                c = segCount[b];
                if (!c) continue;
                var sb = segs[b];
                ctx.strokeStyle = LINK_STYLES[b];
                ctx.beginPath();
                for (var q = 0; q < c; q++) {
                    o = q * 4;
                    ctx.moveTo(sb[o] + nox, sb[o + 1] + noy);
                    ctx.lineTo(sb[o + 2] + nox, sb[o + 3] + noy);
                }
                ctx.stroke();
            }

            // Node dots on top: one path + fill per colour.
            for (var col = 0; col < 2; col++) {
                ctx.fillStyle = NODE_STYLE[col];
                ctx.beginPath();
                for (i = 0; i < n.n; i++) {
                    if (n.color[i] !== col) continue;
                    X = nx[i] + nox;
                    Y = ny[i] + noy;
                    var r = n.r[i];
                    ctx.moveTo(X + r, Y);
                    ctx.arc(X, Y, r, 0, TAU);
                }
                ctx.fill();
            }
        }

        /* ---- loop control ---- */

        function shouldRun() {
            return !reduced && onScreen && !document.hidden && field !== null;
        }

        function loop(now) {
            raf = 0;
            if (!shouldRun()) return;
            var dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
            last = now;
            render(dt);
            raf = requestAnimationFrame(loop);
        }

        function update() {
            if (disposed) return;
            if (shouldRun()) {
                if (!raf) {
                    last = performance.now();
                    raf = requestAnimationFrame(loop);
                }
            } else if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        }

        /* ---- sizing ---- */

        function measure() {
            if (disposed) return;
            var w = canvas.clientWidth;
            var h = canvas.clientHeight;
            // Layout may not have happened yet; the ResizeObserver calls back
            // as soon as the box has a real size.
            if (!w || !h) return;

            var nextDpr = Math.min(window.devicePixelRatio || 1, 2);
            if (field && w === cssW && h === cssH && nextDpr === dpr) return;

            var bw = Math.round(w * nextDpr);
            var bh = Math.round(h * nextDpr);
            if (canvas.width !== bw) canvas.width = bw; // assigning clears the bitmap
            if (canvas.height !== bh) canvas.height = bh;
            dpr = nextDpr;

            // Rebuild if this instance has no particles, or the CSS box changed.
            if (!field || w !== cssW || h !== cssH) {
                cssW = w;
                cssH = h;
                field = build(w, h);
            }

            render(0); // draw immediately: never leave the cleared canvas empty
            update();
        }

        /* ---- events ---- */

        function onMotionChange() {
            reduced = mq.matches;
            if (reduced) {
                tx = ty = px = py = 0; // no parallax at all under reduced motion
                svx = svy = pdx = pdy = 0; // and no stir
            }
            render(0); // a clean static frame; the loop starts/stops below
            update();
        }

        function onPointerMove(e) {
            if (reduced || e.pointerType === "touch") return;
            var r = canvas.getBoundingClientRect();
            if (!r.width || !r.height) return;
            var cx = e.clientX - r.left;
            var cy = e.clientY - r.top;
            if (hasPrev) {
                pdx += cx - mx;
                pdy += cy - my;
            }
            mx = cx;
            my = cy;
            hasPrev = true;
            // The field shifts AWAY from the pointer.
            tx = -clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
            ty = -clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
        }

        function onPointerLeave() {
            tx = 0;
            ty = 0;
            hasPrev = false;
            pdx = 0;
            pdy = 0;
        }

        function onVisibility() {
            update();
        }

        var ro = new ResizeObserver(measure);
        var io = new IntersectionObserver(function (entries) {
            onScreen = entries[entries.length - 1].isIntersecting;
            update();
        });

        mq.addEventListener("change", onMotionChange);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onPointerLeave);

        measure(); // first frame right now if the box is already laid out
        ro.observe(canvas);
        io.observe(canvas);

        return function destroy() {
            if (disposed) return;
            disposed = true;
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            ro.disconnect();
            io.disconnect();
            mq.removeEventListener("change", onMotionChange);
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pointermove", onPointerMove);
            document.documentElement.removeEventListener("pointerleave", onPointerLeave);
            field = null;
            if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        };
    }

    window.ParticleField = { mount: mount };

    /* ---------------- auto-mount ---------------- */

    function autoMount() {
        var hosts = document.querySelectorAll("[data-particle-field]");
        for (var i = 0; i < hosts.length; i++) {
            if (!hosts[i].__particleFieldStop) {
                hosts[i].__particleFieldStop = mount(hosts[i]);
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoMount);
    } else {
        autoMount();
    }
})();


new Typed("#typed", {
  strings: ["Text.", "Emojis.", "Characters.", "Numbers."],
  typeSpeed: 150,
  backSpeed: 80,
  backDelay: 1500,
  loop: true
});



let button1 = document.getElementById("Working")
let text1 = "The message is converted into its binary representation. The application then modifies the least significant bit of the image's pixel bytes to store the message.\nSince only the least significant bit is modified, the changes are visually negligible to the human eye.\n\n•HTML\n•CSS\n•Javascript\n•Rust"
let interval = null;
button1.addEventListener("mouseover", () => {
    document.querySelector(".para").innerText = ""
    document.querySelector("#Working").style.border = "0.2vw solid #a19db8";
    document.querySelector("#Architecture").style.border = "none";
    document.querySelector("#Limitations").style.border = "none";
    let i = 0;
    interval = setInterval(() => {
        document.querySelector(".para").innerText += text1[i];
        i++;
        if (i >= text1.length) clearInterval(interval);
    }, 30);
})
button1.addEventListener("mouseleave", () => {
    clearInterval(interval);
    document.querySelector(".para").innerText = "Hide text messages inside Images";
});
button1.addEventListener("click", () => {
    clearInterval(interval);
    document.querySelector(".para").innerText = text1;
});


let text2 = "This project works on:\n\n\n• HTML + CSS + Javascript — User interface and file handling\n• Rust + Webassembly — Steganography engine and byte-level processing\n\nThe uploaded BMP image is passed from Javascript to Rust as raw bytes. Rust performs the encoding or decoding and returns the resulting data back to Javascript."
let button2 = document.getElementById("Architecture")
button2.addEventListener("mouseover", () => {
    document.querySelector(".para").innerText = ""
    document.querySelector("#Working").style.border = "none";
    document.querySelector("#Architecture").style.border = "0.2vw solid #a19db8";
    document.querySelector("#Limitations").style.border = "none";
    let i = 0;
    interval = setInterval(() => {
        document.querySelector(".para").innerText += text2[i];
        i++;
        if (i >= text2.length) clearInterval(interval);
    }, 30);
})
button2.addEventListener("mouseleave", () => {
    clearInterval(interval);
    document.querySelector(".para").innerText = "Hide text messages inside Images";
});
button2.addEventListener("click", () => {
    clearInterval(interval);
    document.querySelector(".para").innerText = text2;
});




let text3 = "• Currently supports BMP images.\n\n• The hidden message must fit within the available image capacity.\n\n• This project is intended for educational purposes and should not be considered a secure encryption system."
let button3 = document.getElementById("Limitations")
button3.addEventListener("mouseover", () => {
    document.querySelector(".para").innerText = ""
    document.querySelector("#Working").style.border = "none";
    document.querySelector("#Architecture").style.border = "none";
    document.querySelector("#Limitations").style.border = "0.2vw solid #a19db8";
    let i = 0;
    interval = setInterval(() => {
        document.querySelector(".para").innerText += text3[i];
        i++;
        if (i >= text3.length) clearInterval(interval);
    }, 30);
})
button3.addEventListener("mouseleave", () => {
    clearInterval(interval);
    document.querySelector(".para").innerText = "Hide text messages inside Images";
});
button3.addEventListener("click", () => {
    clearInterval(interval);
    document.querySelector(".para").innerText = text3;
});