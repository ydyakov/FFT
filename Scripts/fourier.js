// Discrete and Fast Fourier Transform in plain JavaScript.
//
// Conventions match the AForge.NET implementation the site used to call on the server:
//   Forward:  X[k] = (1/N) * sum_j x[j] * e^(-2*pi*i*j*k/N)
//   Backward: x[j] =         sum_k X[k] * e^(+2*pi*i*j*k/N)
// i.e. the 1/N scaling is applied on the FORWARD transform.
//
// Complex numbers are plain objects { Re, Im } (the same shape the old server JSON had).
// Results also carry Magnitude and Phase, which the drawing code reads.

(function (root) {
    'use strict';

    var Direction = { Forward: 1, Backward: -1 };

    function complex(re, im) {
        return {
            Re: re,
            Im: im,
            Magnitude: Math.sqrt(re * re + im * im),
            Phase: Math.atan2(im, re)
        };
    }

    function toComplexArray(data) {
        return data.map(function (c) {
            return { Re: +c.Re || 0, Im: +c.Im || 0 };
        });
    }

    function finish(re, im, direction) {
        var n = re.length;
        var scale = direction === Direction.Forward ? 1 / n : 1;
        var result = new Array(n);
        for (var i = 0; i < n; i++) {
            result[i] = complex(re[i] * scale, im[i] * scale);
        }
        return result;
    }

    // O(N^2) DFT, works for any length.
    function dft(data, direction) {
        direction = direction || Direction.Forward;
        var src = toComplexArray(data);
        var n = src.length;
        var re = new Array(n);
        var im = new Array(n);

        for (var k = 0; k < n; k++) {
            var sumRe = 0, sumIm = 0;
            var arg = -direction * 2 * Math.PI * k / n;
            for (var j = 0; j < n; j++) {
                var cos = Math.cos(j * arg);
                var sin = Math.sin(j * arg);
                sumRe += src[j].Re * cos - src[j].Im * sin;
                sumIm += src[j].Re * sin + src[j].Im * cos;
            }
            re[k] = sumRe;
            im[k] = sumIm;
        }
        return finish(re, im, direction);
    }

    function isPowerOf2(n) {
        return n > 0 && (n & (n - 1)) === 0;
    }

    // Iterative radix-2 Cooley-Tukey FFT, O(N log N).
    // Lengths that are not a power of 2 fall back to dft().
    function fft(data, direction) {
        direction = direction || Direction.Forward;
        var n = data.length;
        if (n < 2 || !isPowerOf2(n)) {
            return dft(data, direction);
        }

        var src = toComplexArray(data);
        var re = new Array(n);
        var im = new Array(n);

        // bit-reversal permutation
        var bits = Math.round(Math.log(n) / Math.LN2);
        for (var i = 0; i < n; i++) {
            var r = 0;
            for (var b = 0, v = i; b < bits; b++, v >>= 1) {
                r = (r << 1) | (v & 1);
            }
            re[r] = src[i].Re;
            im[r] = src[i].Im;
        }

        // butterflies
        for (var size = 2; size <= n; size <<= 1) {
            var half = size >> 1;
            var angle = -direction * 2 * Math.PI / size;
            for (var k = 0; k < half; k++) {
                var wRe = Math.cos(k * angle);
                var wIm = Math.sin(k * angle);
                for (var even = k; even < n; even += size) {
                    var odd = even + half;
                    var tRe = re[odd] * wRe - im[odd] * wIm;
                    var tIm = re[odd] * wIm + im[odd] * wRe;
                    re[odd] = re[even] - tRe;
                    im[odd] = im[even] - tIm;
                    re[even] += tRe;
                    im[even] += tIm;
                }
            }
        }
        return finish(re, im, direction);
    }

    var NUM = '(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?';
    var PURE_IMAG = new RegExp('^([+-]?)(' + NUM + ')?i$');
    var GENERAL = new RegExp('^([+-]?' + NUM + ')(?:([+-])(' + NUM + ')?i)?$');

    // Parses "3", "-2.5", "4i", "-i", "3+2i", "3-2.5i", "1e-3-2i" into { Re, Im }.
    // Empty input is 0. Throws on anything else.
    function parseComplex(text) {
        var s = String(text == null ? '' : text).replace(/\s+/g, '').replace(/,/g, '.').toLowerCase();
        if (s === '') {
            return { Re: 0, Im: 0 };
        }

        var m = PURE_IMAG.exec(s);
        if (m) {
            var mag = m[2] === undefined ? 1 : parseFloat(m[2]);
            return { Re: 0, Im: m[1] === '-' ? -mag : mag };
        }

        m = GENERAL.exec(s);
        if (m) {
            var imag = 0;
            if (m[2]) {
                imag = m[3] === undefined ? 1 : parseFloat(m[3]);
                if (m[2] === '-') {
                    imag = -imag;
                }
            }
            return { Re: parseFloat(m[1]), Im: imag };
        }

        throw new Error('Invalid complex number: "' + text + '"');
    }

    var Fourier = {
        Direction: Direction,
        dft: dft,
        fft: fft,
        parseComplex: parseComplex
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Fourier;
    } else {
        root.Fourier = Fourier;
    }
})(this);
