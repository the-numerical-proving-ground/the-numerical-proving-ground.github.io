/* Sample thoughts for previewing the wall of record R4 with no service: sc26.js loads this file only when the address of
   the page has ?mock in it (?mock, ?mock=few, ?mock=empty, ?mock=held, ?mock=fail). Every text begins "(Sample)": they are made up,
   about the future of numerical linear algebra, and are nobody's. Nothing is read from or sent to the network. */
(function () {
  'use strict';
  var T = [
    [1, 'Libraries will be written once as a specification and many times as generated code, and the specification will be what we cite.'],
    [2, 'A grade for a kernel should come with the inputs it was earned on.'],
    [0, 'I would like every routine to say, in one line, what it promises when the input has a NaN.'],
    [3, 'Standards will matter more, not less: agents need a fixed target to check against.'],
    [4, 'Ship the proofs next to the binaries.'],
    [5, 'Cheap trial runs will tempt agents to tune on the test matrix. We need held-out matrices that nobody sees.'],
    [1, 'The human expert becomes the person who decides what the library must never do.'],
    [0, 'Mixed precision everywhere, with an error bound that the compiler can check rather than a comment that says "should be fine".'],
    [2, 'Contracts, not letters. A letter hides the one case that fails.'],
    [0, 'Reproducibility across vendors: the same answer to the last bit is too much to ask, the same bound is not.'],
    [4, 'Small kernels, assembled by the user\'s agent, each with its own certificate.'],
    [3, 'What is left to standardize: the meaning of the arguments, and the meaning of failure.'],
    [5, 'Agents will want more compute than we have. The fix is better questions, not more nodes.'],
    [0, 'Randomized methods get a fair hearing once their failure probability is part of the interface.'],
    [1, 'Maintainers will spend their time reviewing, not writing. Let us build tools for review.'],
    [0, 'Sparse and structured problems first: dense LU will take care of itself.'],
    [2, 'A grade that can be recomputed by anyone, from a script, in a minute.'],
    [4, 'Binary size is a poor reason to drop a check. Make the check optional, never silent.'],
    [0, 'I hope the next decade of the field is less about speed records and more about knowing when to trust an answer, and that every library will say, next to each result, how far to trust it.'],
    [3, 'Interfaces should be small enough to hold in your head and strict enough to test against.'],
    [5, 'Use the cheap run to decide what the expensive run should be, and write that decision down.'],
    [1, 'Experts will still be needed to say what the right problem is. Agents are good at the wrong problem, fast.'],
    [0, 'Backward error as the default way to report accuracy, for every routine, in every language.'],
    [4, 'A library that can explain, on request, why it chose this algorithm for this input.'],
    [2, 'Should a grade expire? A kernel proved against last year\'s hardware model is not proved on this year\'s.'],
    [0, 'Machine-checked error bounds for the dozen kernels everybody uses. Not for all of them. Start with the dozen.'],
    [3, 'Let the standard be a test suite that agents must pass and that humans can read.'],
    [0, 'More honest benchmarks: accuracy and speed reported together, on inputs we did not choose.'],
    [5, 'Mathematical analysis tells you where to look; the small experiment tells you whether you were right.'],
    [1, 'The craft of numerical analysis survives as taste: knowing which instability matters.'],
    [0, 'Teach every student to read a stability proof, and no student to fear one.'],
    [4, 'Ship less, and say precisely what is shipped.'],
    [0, 'Interval and probabilistic enclosures as a normal output, next to the point estimate.'],
    [2, 'One letter is a headline. Keep the headline and ship the contract with it.'],
    [3, 'If an agent can port anything in an afternoon, the standard is the thing that makes the port checkable.'],
    [0, 'I expect GPUs, CPUs and whatever comes next to be targets of one description of the algorithm.'],
    [5, 'A shared log of agent runs, so that the field does not pay twice for the same failed experiment.'],
    [1, 'The expert is the one who can say "this will not converge" before anything runs.'],
    [0, 'Rounding-error analysis as a service: paste the kernel, get the bound, get the assumptions.'],
    [4, 'Libraries should ship their assumptions as data that a tool can read.']
  ];
  window.tnpgMock = function (kind) {
    var rev = 0, rows = [], pool = [], next = 1, i, k = kind;
    function row(t, raw) { rev++; var r = { id: next++, text: raw ? t[1] : '(Sample) ' + t[1], tbl: raw ? (t[0] || null) : (t[0] > 1 ? t[0] - 1 : null), rev: rev }; rows.push(r); return r; }   /* the samples are numbered for five breakouts: now four */
    for (i = 0; i < T.length; i++) pool.push(T[i]);
    var start = k === 'empty' ? 0 : (k === 'few' || k === 'held') ? 4 : 30;
    for (i = 0; i < start; i++) row(pool.shift());
    return {
      pollMs: 6000,
      get: function (since) {
        if (k === 'fail') return Promise.reject(new Error('mock failure'));
        if (k === 'full' && pool.length) row(pool.shift());     /* one more thought arrives with each poll */
        var out = [], top = since;
        for (var j = 0; j < rows.length; j++) {
          if (rows[j].rev > since) { out.push({ id: rows[j].id, text: rows[j].text, tbl: rows[j].tbl }); top = Math.max(top, rows[j].rev); }
        }
        return new Promise(function (resolve) { window.setTimeout(function () { resolve({ rev: top, thoughts: out }); }, 120); });
      },
      post: function (body) {
        /* the service shows a clean thought at once and answers {ok, text, id, status: "shown"}; with ?mock=held it holds
           it (its emergency mode: status "held") and shows it a few seconds later, as a person would */
        return new Promise(function (resolve) {
          window.setTimeout(function () {
            if (k === 'held') {
              resolve({ ok: true, text: body.text, id: -1, status: 'held' });
              window.setTimeout(function () { row([body.table || 0, body.text], true); }, 4000);
            } else {
              var r = row([body.table || 0, body.text], true);
              resolve({ ok: true, text: r.text, id: r.id, status: 'shown' });
            }
          }, 500);
        });
      }
    };
  };
})();
