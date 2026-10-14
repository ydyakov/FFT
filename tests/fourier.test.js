// Run: node --test tests/
//
// aforge-golden.json was produced by running the original C# code (AForge.Math
// FourierTransform.DFT/FFT and IndexController.ParceCom) before the server was removed.
const test = require('node:test');
const assert = require('node:assert');
const Fourier = require('../Scripts/fourier.js');
const golden = require('./aforge-golden.json');

const EPS = 1e-9;
const F = Fourier.Direction.Forward;
const B = Fourier.Direction.Backward;

function assertClose(actual, expected, label) {
    assert.strictEqual(actual.length, expected.length, label + ': length');
    actual.forEach((c, i) => {
        assert.ok(Math.abs(c.Re - expected[i][0]) < EPS && Math.abs(c.Im - expected[i][1]) < EPS,
            `${label}[${i}]: got ${c.Re}${c.Im >= 0 ? '+' : ''}${c.Im}i, expected ${expected[i][0]}${expected[i][1] >= 0 ? '+' : ''}${expected[i][1]}i`);
    });
}

const toPairs = (arr) => arr.map((c) => [c.Re, c.Im]);

for (const c of golden.cases) {
    const name = JSON.stringify(c.input);
    const input = c.input.map(Fourier.parseComplex);

    test(`parse ${name}`, () => assertClose(input, c.parsed, 'parsed'));

    test(`dft matches AForge DFT ${name}`, () => {
        assertClose(Fourier.dft(input, F), c.dftF, 'forward');
        assertClose(Fourier.dft(input, B), c.dftB, 'backward');
    });

    test(`fft matches AForge DFT ${name}`, () => {
        assertClose(Fourier.fft(input, F), c.dftF, 'forward');
        assertClose(Fourier.fft(input, B), c.dftB, 'backward');
    });

    // AForge's own FFT used the opposite sign to its DFT (FFT[k] == DFT[N-k]).
    // The server only ever called DFT, so fft() follows DFT; this pins down the difference.
    if (c.fftF) {
        test(`AForge FFT is the frequency-mirrored DFT ${name}`, () => {
            const n = input.length;
            const mirror = (arr) => arr.map((_, k) => arr[(n - k) % n]);
            assertClose(Fourier.fft(input, F), mirror(c.fftF), 'forward');
            assertClose(Fourier.fft(input, B), mirror(c.fftB), 'backward');
        });
    }

    test(`inverse(forward(x)) == x ${name}`, () => {
        assertClose(Fourier.fft(Fourier.fft(input, F), B), toPairs(input), 'fft roundtrip');
        assertClose(Fourier.dft(Fourier.dft(input, F), B), toPairs(input), 'dft roundtrip');
    });
}

test('fft equals dft on a larger power-of-2 input', () => {
    const input = Array.from({ length: 256 }, (_, i) => ({ Re: Math.sin(i * 0.37) * 50 + i, Im: Math.cos(i * 1.3) * 20 }));
    assertClose(Fourier.fft(input, F), toPairs(Fourier.dft(input, F)), 'forward');
});

test('results carry Magnitude and Phase', () => {
    const [c] = Fourier.dft([{ Re: 3, Im: 4 }], B);
    assert.ok(Math.abs(c.Magnitude - 5) < EPS);
    assert.ok(Math.abs(c.Phase - Math.atan2(4, 3)) < EPS);
});

test('parseComplex agrees with the old ParceCom where ParceCom was correct', () => {
    for (const [text, expected] of Object.entries(golden.parse)) {
        if (/^[+-]?[\d.]+i$/.test(text)) continue; // pure imaginary: ParceCom bug, see below
        assertClose([Fourier.parseComplex(text)], [expected], text);
    }
});

test('parseComplex reads pure imaginary numbers (ParceCom returned "2i" as the real 2)', () => {
    assert.deepStrictEqual(golden.parse['2i'], [2, 0]);
    assertClose([Fourier.parseComplex('2i')], [[0, 2]], '2i');
    assertClose([Fourier.parseComplex('-2i')], [[0, -2]], '-2i');
    assertClose([Fourier.parseComplex('i')], [[0, 1]], 'i');
    assertClose([Fourier.parseComplex('3-i')], [[3, -1]], '3-i');
});

test('parseComplex extras', () => {
    assertClose([Fourier.parseComplex('')], [[0, 0]], 'empty');
    assertClose([Fourier.parseComplex(' 1.5 + 2.5i ')], [[1.5, 2.5]], 'spaces');
    assertClose([Fourier.parseComplex('1,5')], [[1.5, 0]], 'decimal comma');
    assertClose([Fourier.parseComplex('1e-3-2i')], [[0.001, -2]], 'exponent');
    assert.throws(() => Fourier.parseComplex('abc'));
});
