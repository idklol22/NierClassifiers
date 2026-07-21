/* LearnLoop: a complete browser demo of the adaptive learning loop.
 * The storage adapter is intentionally small and replaceable: the UI talks to
 * this model through methods, so a REST/SQLite adapter can be introduced later
 * without changing the learning or teacher views.
 */

const STORAGE_KEY = 'learnloop-data-v2';
const SESSION_KEY = 'learnloop-session-v2';
const INK = '#1a1a2e';
const PURPLE = '#6d5ef7';
const GREEN = '#12b886';
const RED = '#ef6b62';
const AMBER = '#f59e0b';

const TOPICS = [
  { id: 'algebra', label: 'Algebra & equations', short: 'Algebra', color: '#6d5ef7', blurb: 'Equations, sequences, logarithms and algebraic structure.' },
  { id: 'functions', label: 'Functions', short: 'Functions', color: '#2563eb', blurb: 'Composite and inverse functions, graphs and transformations.' },
  { id: 'trigonometry', label: 'Trigonometry', short: 'Trigonometry', color: '#db2777', blurb: 'Identities, equations, radians and triangle geometry.' },
  { id: 'calculus', label: 'Calculus', short: 'Calculus', color: '#0891b2', blurb: 'Differentiation, integration, tangents and optimization.' },
  { id: 'geometry', label: 'Coordinate geometry & vectors', short: 'Geometry', color: '#16a34a', blurb: 'Lines, circles, vectors and geometric reasoning.' },
  { id: 'probability', label: 'Probability & statistics', short: 'Probability', color: '#ea580c', blurb: 'Distributions, conditional probability and expected value.' },
  { id: 'matrices', label: 'Matrices & complex numbers', short: 'Matrices', color: '#7c3aed', blurb: 'Matrix transformations, determinants and complex arithmetic.' }
];

const TAG_BY_ID = Object.fromEntries(TOPICS.map(topic => [topic.id, topic]));

const q = (id, title, prompt, options, answer, tags, skills, difficulty, explanation, diagnosis) => ({
  id, title, prompt, options, answer, tags, skills, difficulty, explanation, diagnosis
});

// Curated upper-high-school questions. Each item has topic tags, subskills,
// distractor diagnoses, and an explanation so the teacher sees the reasoning
// signal rather than a bare right/wrong flag.
const QUESTION_BANK = [
  q('alg-01', 'Quadratic roots', 'Solve x² − 5x + 6 = 0.', [{ id: 'a', text: 'x = 1 or x = 6' }, { id: 'b', text: 'x = 2 or x = 3' }, { id: 'c', text: 'x = −2 or x = −3' }, { id: 'd', text: 'x = 5 or x = 6' }], 'b', ['algebra'], ['factoring quadratics', 'zero-product property'], 2, 'Factor the quadratic as (x − 2)(x − 3) = 0, so x = 2 or x = 3.', { a: 'The factors were not checked by multiplying them back out.', c: 'The signs were reversed when forming the factors.', d: 'The constant and coefficient were read as roots.' }),
  q('alg-02', 'Logarithm equation', 'Solve log₂(x) + log₂(x − 2) = 3.', [{ id: 'a', text: 'x = 2' }, { id: 'b', text: 'x = 4' }, { id: 'c', text: 'x = 1 + √9' }, { id: 'd', text: 'x = 1 + √11' }], 'd', ['algebra'], ['logarithm laws', 'domain restrictions'], 4, 'Combine the logs: log₂[x(x − 2)] = 3, giving x² − 2x = 8. The domain x > 2 selects x = 1 + √11.', { a: 'The domain x > 2 was not checked.', b: 'The logarithms were combined but the quadratic was solved incorrectly.', c: 'The constant 8 was confused with the discriminant.' }),
  q('alg-03', 'Arithmetic sequence', 'An arithmetic sequence has first term 7 and common difference 4. What is its 20th term?', [{ id: 'a', text: '80' }, { id: 'b', text: '83' }, { id: 'c', text: '87' }, { id: 'd', text: '91' }], 'b', ['algebra'], ['arithmetic sequences', 'nth term'], 2, 'Use aₙ = a₁ + (n − 1)d = 7 + 19(4) = 83.', { a: 'The difference was multiplied by n instead of n − 1.', c: 'The first term was counted twice.', d: 'The sequence was continued one extra step.' }),
  q('alg-04', 'Binomial coefficient', 'What is the coefficient of x³ in (2 + x)⁵?', [{ id: 'a', text: '10' }, { id: 'b', text: '20' }, { id: 'c', text: '40' }, { id: 'd', text: '80' }], 'c', ['algebra'], ['binomial expansion', 'combinations'], 3, 'The x³ term is C(5,3)·2²·x³ = 10·4x³, so the coefficient is 40.', { a: 'The combination count was omitted.', b: 'The power of 2 was reduced incorrectly.', d: 'The coefficient was doubled after the expansion.' }),
  q('fun-01', 'Composite functions', 'Given f(x) = 2x − 1 and g(x) = x² + 3, find f(g(2)).', [{ id: 'a', text: '10' }, { id: 'b', text: '13' }, { id: 'c', text: '17' }, { id: 'd', text: '21' }], 'b', ['functions', 'algebra'], ['composition', 'substitution'], 2, 'g(2) = 7, then f(7) = 2(7) − 1 = 13.', { a: 'The outer function was applied before evaluating the inner function.', c: 'The substitution was carried out as f(2) + g(2).', d: 'The −1 sign was lost.' }),
  q('fun-02', 'Inverse functions', 'If f(x) = (3x − 4)/2, what is f⁻¹(5)?', [{ id: 'a', text: '2' }, { id: 'b', text: '3' }, { id: 'c', text: '14/3' }, { id: 'd', text: '6' }], 'c', ['functions', 'algebra'], ['inverse functions', 'linear equations'], 3, 'Set y = (3x − 4)/2. Solving 2y = 3x − 4 gives x = (2y + 4)/3, so f⁻¹(5) = 14/3.', { a: 'The inverse operation order was reversed.', b: 'The numerator was not isolated before dividing.', d: 'The denominator 2 was multiplied instead of divided.' }),
  q('fun-03', 'Graph transformations', 'The graph of y = |x| is translated 3 units right and 2 units down. Which equation results?', [{ id: 'a', text: 'y = |x + 3| + 2' }, { id: 'b', text: 'y = |x − 3| − 2' }, { id: 'c', text: 'y = |x − 2| − 3' }, { id: 'd', text: 'y = |x + 3| − 2' }], 'b', ['functions'], ['transformations', 'absolute value graphs'], 2, 'A right shift replaces x with x − 3; moving down subtracts 2.', { a: 'Horizontal direction was reversed and the vertical shift was reversed.', c: 'The horizontal and vertical shifts were swapped.', d: 'The horizontal direction was reversed.' }),
  q('fun-04', 'Asymptotes', 'What is the vertical asymptote of h(x) = (x + 1)/(x − 4)?', [{ id: 'a', text: 'x = −1' }, { id: 'b', text: 'x = 0' }, { id: 'c', text: 'y = 1' }, { id: 'd', text: 'x = 4' }], 'd', ['functions'], ['rational functions', 'asymptotes'], 3, 'The denominator is zero at x = 4 while the numerator is nonzero, so x = 4 is the vertical asymptote.', { a: 'The numerator zero was mistaken for the vertical asymptote.', b: 'The origin was selected without checking the denominator.', c: 'The horizontal asymptote was identified instead.' }),
  q('trig-01', 'Exact trigonometry', 'What is the exact value of sin(π/6) + cos(π/3)?', [{ id: 'a', text: '0' }, { id: 'b', text: '1/2' }, { id: 'c', text: '1' }, { id: 'd', text: '√3/2' }], 'c', ['trigonometry'], ['exact values', 'radians'], 2, 'Both sin(π/6) and cos(π/3) equal 1/2, so the sum is 1.', { a: 'The two exact values were subtracted.', b: 'Only one of the two terms was evaluated.', d: '√3/2 belongs to the 30° cosine value, not these two values.' }),
  q('trig-02', 'Trig equation', 'For 0° ≤ θ ≤ 360°, solve 2sin θ = √3.', [{ id: 'a', text: 'θ = 60° only' }, { id: 'b', text: 'θ = 60°, 120°' }, { id: 'c', text: 'θ = 30°, 150°' }, { id: 'd', text: 'θ = 120°, 300°' }], 'b', ['trigonometry'], ['trig equations', 'quadrants'], 3, 'sin θ = √3/2 at the reference angle 60° in quadrants I and II.', { a: 'The second-quadrant solution was missed.', c: 'The reference angle for √3/2 was confused with 1/2.', d: 'The quadrant signs for sine were not applied.' }),
  q('trig-03', 'Identity reasoning', 'Which expression is equivalent to (1 − cos²x)/sin x, where sin x ≠ 0?', [{ id: 'a', text: 'sin x' }, { id: 'b', text: 'cos x' }, { id: 'c', text: 'tan x' }, { id: 'd', text: 'sec x' }], 'a', ['trigonometry'], ['Pythagorean identities', 'simplification'], 3, 'Since 1 − cos²x = sin²x, divide by sin x to obtain sin x.', { b: 'The identity was used without dividing by sin x.', c: 'sin²x/cos x was confused with sin x/cos x.', d: 'The reciprocal identity was selected.' }),
  q('trig-04', 'Sine rule', 'In a triangle, A = 30°, a = 8 and B = 45°. Find b.', [{ id: 'a', text: '4√2' }, { id: 'b', text: '8√2' }, { id: 'c', text: '16' }, { id: 'd', text: '16√2' }], 'b', ['trigonometry', 'geometry'], ['sine rule', 'triangle geometry'], 3, 'Use b/sin45° = 8/sin30°. Thus b = 8(sin45°/sin30°) = 8√2.', { a: 'The ratio was inverted.', c: 'The factor of sin45° was omitted.', d: 'The denominator sin30° was doubled incorrectly.' }),
  q('cal-01', 'Derivative from first principles', 'Differentiate f(x) = x³ − 4x.', [{ id: 'a', text: '3x² − 4' }, { id: 'b', text: 'x² − 4' }, { id: 'c', text: '3x − 4' }, { id: 'd', text: '3x² − 4x' }], 'a', ['calculus', 'algebra'], ['power rule', 'polynomial differentiation'], 2, 'Apply the power rule term by term: f′(x) = 3x² − 4.', { b: 'The exponent was reduced but not multiplied down.', c: 'The power rule was applied as if the exponent were 1.', d: 'The original x term was kept after differentiating.' }),
  q('cal-02', 'Tangent gradient', 'The gradient of y = x² − 3x + 2 at x = 4 is:', [{ id: 'a', text: '3' }, { id: 'b', text: '4' }, { id: 'c', text: '5' }, { id: 'd', text: '8' }], 'c', ['calculus'], ['derivative evaluation', 'gradient'], 2, 'y′ = 2x − 3, so y′(4) = 8 − 3 = 5.', { a: 'The −3 was applied after substituting incorrectly.', b: 'The original function value was confused with the gradient.', d: 'The constant term was carried into the derivative.' }),
  q('cal-03', 'Definite integration', 'Evaluate ∫₀² (3x² + 1) dx.', [{ id: 'a', text: '6' }, { id: 'b', text: '8' }, { id: 'c', text: '10' }, { id: 'd', text: '12' }], 'c', ['calculus'], ['definite integration', 'area'], 3, 'An antiderivative is x³ + x. Evaluate [x³ + x]₀² = 8 + 2 = 10.', { a: 'The +x term was omitted.', b: 'The upper limit was substituted before integrating.', d: 'The power rule for integration was misapplied.' }),
  q('cal-04', 'Optimization', 'A rectangle has perimeter 20. Which dimensions maximize its area?', [{ id: 'a', text: '1 by 9' }, { id: 'b', text: '2 by 8' }, { id: 'c', text: '4 by 6' }, { id: 'd', text: '5 by 5' }], 'd', ['calculus', 'geometry'], ['optimization', 'quadratic models'], 3, 'If one side is x, the other is 10 − x and A = x(10 − x), maximized at x = 5.', { a: 'The perimeter was treated as area.', b: 'The square-property of the maximum was not recognized.', c: 'The vertex of the area quadratic was not found.' }),
  q('geo-01', 'Circle equation', 'Find the center of (x − 2)² + (y + 5)² = 16.', [{ id: 'a', text: '(2, 5)' }, { id: 'b', text: '(−2, 5)' }, { id: 'c', text: '(2, −5)' }, { id: 'd', text: '(−2, −5)' }], 'c', ['geometry'], ['circles', 'coordinate geometry'], 2, 'The standard form is (x − h)² + (y − k)² = r², so the center is (2, −5).', { a: 'The sign inside the y bracket was not reversed.', b: 'Both coordinate signs were reversed incorrectly.', d: 'The sign inside the x bracket was also reversed.' }),
  q('geo-02', 'Perpendicular vectors', 'If u = (2, 3) and v = (k, 4) are perpendicular, find k.', [{ id: 'a', text: '−6' }, { id: 'b', text: '−3' }, { id: 'c', text: '3' }, { id: 'd', text: '6' }], 'a', ['geometry'], ['dot product', 'vectors'], 3, 'Perpendicular vectors have dot product zero: 2k + 12 = 0, hence k = −6.', { b: 'Only one component was used in the dot product.', c: 'The sign of the constant term was reversed.', d: 'The zero-dot-product condition was not applied.' }),
  q('geo-03', 'Line intersection', 'Where do y = 2x + 1 and y = −x + 7 intersect?', [{ id: 'a', text: '(1, 3)' }, { id: 'b', text: '(2, 5)' }, { id: 'c', text: '(3, 7)' }, { id: 'd', text: '(4, 9)' }], 'b', ['geometry', 'algebra'], ['simultaneous equations', 'line intersections'], 2, 'Set the equations equal: 2x + 1 = −x + 7, so x = 2 and y = 5.', { a: 'The x-value was found but the wrong equation was used for y.', c: 'The equations were added instead of equated.', d: 'The intercept was substituted without solving for x.' }),
  q('geo-04', 'Vector magnitude', 'What is the magnitude of the vector (6, 8)?', [{ id: 'a', text: '7' }, { id: 'b', text: '10' }, { id: 'c', text: '14' }, { id: 'd', text: '48' }], 'b', ['geometry'], ['vector magnitude', 'Pythagoras'], 1, 'Magnitude = √(6² + 8²) = √100 = 10.', { a: 'The components were averaged.', c: 'The components were added instead of using Pythagoras.', d: 'The components were multiplied.' }),
  q('prob-01', 'Conditional probability', 'A class has 12 girls and 8 boys. Four girls and two boys wear glasses. Given that a randomly chosen student wears glasses, what is the probability the student is a girl?', [{ id: 'a', text: '1/3' }, { id: 'b', text: '1/2' }, { id: 'c', text: '2/3' }, { id: 'd', text: '3/4' }], 'c', ['probability'], ['conditional probability', 'two-way tables'], 3, 'There are 6 glasses-wearers, 4 of whom are girls, so P(girl | glasses) = 4/6 = 2/3.', { a: 'The total class size was used as the denominator.', b: 'The girl and glasses counts were not conditioned on the event.', d: 'The non-glasses students were included.' }),
  q('prob-02', 'Binomial probability', 'If X ~ Bin(4, 0.5), what is P(X = 2)?', [{ id: 'a', text: '1/16' }, { id: 'b', text: '1/4' }, { id: 'c', text: '3/8' }, { id: 'd', text: '1/2' }], 'c', ['probability'], ['binomial distribution', 'combinations'], 3, 'P(X=2) = C(4,2)(0.5)²(0.5)² = 6/16 = 3/8.', { a: 'The combination count was left out.', b: 'Only two particular arrangements were counted.', d: 'All four outcomes were treated as equally favorable.' }),
  q('prob-03', 'Expected value', 'A game pays $10 with probability 0.2 and loses $3 otherwise. What is the expected profit?', [{ id: 'a', text: '$0.20' }, { id: 'b', text: '$−0.40' }, { id: 'c', text: '$1.40' }, { id: 'd', text: '$2.00' }], 'b', ['probability'], ['expected value', 'weighted means'], 2, 'E = 0.2(10) + 0.8(−3) = 2 − 2.4 = −0.4.', { a: 'Only the winning outcome was weighted.', c: 'The sign of the loss was handled incorrectly.', d: 'The losing probability was omitted.' }),
  q('prob-04', 'Independent events', 'If P(A) = 0.4, P(B) = 0.25 and A and B are independent, find P(A ∩ B).', [{ id: 'a', text: '0.10' }, { id: 'b', text: '0.15' }, { id: 'c', text: '0.40' }, { id: 'd', text: '0.65' }], 'a', ['probability'], ['independence', 'intersection'], 2, 'For independent events, P(A ∩ B) = P(A)P(B) = 0.4 × 0.25 = 0.10.', { b: 'The probabilities were subtracted.', c: 'P(A) was copied instead of combining the events.', d: 'The union rule was used.' }),
  q('mat-01', 'Matrix determinant', 'Find det([[3, 2], [1, 4]]).', [{ id: 'a', text: '8' }, { id: 'b', text: '10' }, { id: 'c', text: '12' }, { id: 'd', text: '14' }], 'b', ['matrices'], ['determinants', '2x2 matrices'], 2, 'For [[a,b],[c,d]], det = ad − bc = 3(4) − 2(1) = 10.', { a: 'The off-diagonal product was added instead of subtracted.', c: 'Only the diagonal product 3×4 was used.', d: 'All four entries were added.' }),
  q('mat-02', 'Matrix transformation', 'The matrix [[0, −1], [1, 0]] transforms (1, 2) to:', [{ id: 'a', text: '(−2, 1)' }, { id: 'b', text: '(2, −1)' }, { id: 'c', text: '(1, −2)' }, { id: 'd', text: '(−1, 2)' }], 'a', ['matrices', 'geometry'], ['matrix multiplication', 'rotations'], 3, 'Multiply: (0·1 + −1·2, 1·1 + 0·2) = (−2, 1), a 90° anticlockwise rotation.', { b: 'The rotation direction was reversed.', c: 'The matrix was applied componentwise.', d: 'The rows and columns were mixed.' }),
  q('mat-03', 'Complex numbers', 'Simplify (3 + 2i)(1 − i).', [{ id: 'a', text: '1 − i' }, { id: 'b', text: '5 − i' }, { id: 'c', text: '5 + i' }, { id: 'd', text: '1 + 5i' }], 'b', ['matrices'], ['complex multiplication', 'i²'], 2, 'Expand to 3 − 3i + 2i − 2i² = 5 − i because i² = −1.', { a: 'The i² term was not simplified.', c: 'The sign on the imaginary term was lost.', d: 'Real and imaginary parts were combined incorrectly.' }),
  q('mat-04', 'Matrix equations', 'If A = [[1, 2], [0, 1]], what is A²?', [{ id: 'a', text: '[[1, 2], [0, 1]]' }, { id: 'b', text: '[[1, 4], [0, 1]]' }, { id: 'c', text: '[[2, 4], [0, 2]]' }, { id: 'd', text: '[[1, 0], [2, 1]]' }], 'b', ['matrices'], ['matrix multiplication', 'powers'], 3, 'A² = [[1·1+2·0, 1·2+2·1], [0, 1]] = [[1,4],[0,1]].', { a: 'A was copied instead of multiplied.', c: 'The diagonal entries were doubled.', d: 'The matrix was transposed.' }),
  q('stat-01', 'Normal distribution', 'For a normal distribution with mean 70 and standard deviation 5, what z-score corresponds to x = 80?', [{ id: 'a', text: '1' }, { id: 'b', text: '2' }, { id: 'c', text: '5' }, { id: 'd', text: '10' }], 'b', ['probability'], ['standardization', 'normal distribution'], 2, 'z = (x − μ)/σ = (80 − 70)/5 = 2.', { a: 'The difference was divided by the wrong scale.', c: 'The standard deviation was not used as a divisor.', d: 'The raw difference was reported as the z-score.' }),
  q('stat-02', 'Correlation', 'A correlation coefficient of r = −0.92 indicates:', [{ id: 'a', text: 'A weak positive relationship' }, { id: 'b', text: 'A strong positive relationship' }, { id: 'c', text: 'A weak negative relationship' }, { id: 'd', text: 'A strong negative relationship' }], 'd', ['probability'], ['correlation', 'data interpretation'], 1, 'The magnitude is close to 1 (strong) and the sign is negative.', { a: 'Both strength and direction were reversed.', b: 'The negative sign was ignored.', c: 'The direction was recognized but the magnitude was underestimated.' }),
  q('stat-03', 'Sampling', 'Which sampling method gives every student on a register an equal chance of selection?', [{ id: 'a', text: 'Convenience sampling' }, { id: 'b', text: 'Simple random sampling' }, { id: 'c', text: 'Quota sampling' }, { id: 'd', text: 'Snowball sampling' }], 'b', ['probability'], ['sampling methods', 'bias'], 1, 'A simple random sample selects from the full register with equal probability.', { a: 'Ease of access was confused with equal probability.', c: 'A target quota does not guarantee equal selection chance.', d: 'Referrals do not give each student equal probability.' }),
  q('alg-05', 'Inequality', 'Solve 3x − 7 < 11.', [{ id: 'a', text: 'x < 6' }, { id: 'b', text: 'x < 4/3' }, { id: 'c', text: 'x > 6' }, { id: 'd', text: 'x > 4/3' }], 'a', ['algebra'], ['linear inequalities', 'inverse operations'], 1, 'Add 7 and divide by 3: 3x < 18, so x < 6.', { b: 'The constant was divided before being moved.', c: 'The inequality direction was reversed without multiplying by a negative.', d: 'Both the value and direction were changed.' }),
  q('fun-05', 'Function domain', 'What is the domain of f(x) = √(2x − 6)?', [{ id: 'a', text: 'x > 3' }, { id: 'b', text: 'x ≥ 3' }, { id: 'c', text: 'x ≤ 3' }, { id: 'd', text: 'All real x' }], 'b', ['functions'], ['domain restrictions', 'radicals'], 2, 'The radicand must be nonnegative: 2x − 6 ≥ 0, so x ≥ 3.', { a: 'The endpoint was excluded even though zero is allowed.', c: 'The inequality was reversed.', d: 'The square-root restriction was ignored.' }),
  q('cal-05', 'Chain rule', 'Differentiate y = (3x² + 1)⁴.', [{ id: 'a', text: '4(3x² + 1)³' }, { id: 'b', text: '24x(3x² + 1)³' }, { id: 'c', text: '12x(3x² + 1)⁴' }, { id: 'd', text: '(3x² + 1)³' }], 'b', ['calculus'], ['chain rule', 'composite functions'], 3, 'Differentiate the outer power and multiply by the inner derivative: 4(3x²+1)³·6x.', { a: 'The inner derivative 6x was omitted.', c: 'The exponent was applied to the derivative incorrectly.', d: 'Only the inner expression was reduced.' }),
  q('trig-05', 'Radians and arc length', 'A circle has radius 6. What is the arc length for a central angle of π/3?', [{ id: 'a', text: '2π' }, { id: 'b', text: 'π' }, { id: 'c', text: '3π' }, { id: 'd', text: '6π' }], 'a', ['trigonometry', 'geometry'], ['arc length', 'radians'], 2, 'Arc length s = rθ = 6·π/3 = 2π.', { b: 'The radius was divided by the angle.', c: 'The radius was multiplied by the denominator.', d: 'The full circumference was used.' }),
  q('geo-05', 'Midpoint', 'Find the midpoint of A(−2, 5) and B(6, −1).', [{ id: 'a', text: '(2, 2)' }, { id: 'b', text: '(4, 4)' }, { id: 'c', text: '(−4, 6)' }, { id: 'd', text: '(2, −2)' }], 'a', ['geometry'], ['midpoint', 'coordinate geometry'], 1, 'Average the coordinates: ((−2+6)/2, (5−1)/2) = (2,2).', { b: 'The coordinates were added without dividing by 2.', c: 'The coordinate differences were used instead of averages.', d: 'The y-coordinate sign was lost.' })
];

const QUESTION_BY_ID = Object.fromEntries(QUESTION_BANK.map(question => [question.id, question]));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString();

function seedAttempts(userId, pattern) {
  const plan = pattern === 'calculus' ? ['calculus', 'calculus', 'trigonometry', 'functions', 'geometry', 'probability'] : pattern === 'algebra' ? ['algebra', 'algebra', 'functions', 'matrices', 'calculus', 'trigonometry'] : ['trigonometry', 'probability', 'algebra', 'functions', 'calculus', 'geometry'];
  return plan.map((topicId, index) => {
    const question = QUESTION_BANK.find(item => item.tags.includes(topicId) && item.id.endsWith(String((index % 5) + 1).padStart(2, '0'))) || QUESTION_BANK.find(item => item.tags.includes(topicId));
    const correct = pattern === 'calculus' ? index % 3 !== 0 : pattern === 'algebra' ? index % 2 === 0 : index % 4 !== 1;
    const wrong = question.options.find(option => option.id !== question.answer);
    const selected = correct ? question.options.find(option => option.id === question.answer) : wrong;
    return {
      id: uid('attempt-seed'), userId, questionId: question.id, questionSnapshot: question,
      selectedOptionId: selected.id, selectedOptionText: selected.text, correct,
      confidence: correct ? 4 : 2, timestamp: new Date(Date.now() - (plan.length - index) * 86400000).toISOString(),
      tags: question.tags, skills: question.skills, diagnosis: correct ? 'Correct application of the target method.' : question.diagnosis[selected.id], diagnosisSkill: question.skills[0]
    };
  });
}

function buildSubskills(attempts = []) {
  const grouped = {};
  attempts.forEach(attempt => {
    (attempt.skills || (attempt.diagnosisSkill ? [attempt.diagnosisSkill] : [])).forEach(skill => {
      const current = grouped[skill] || { skill, attempts: 0, correct: 0, score: 0.5, lastDiagnosis: '' };
      current.attempts += 1;
      current.correct += attempt.correct ? 1 : 0;
      current.score = current.correct / current.attempts;
      if (!attempt.correct && attempt.diagnosis) current.lastDiagnosis = attempt.diagnosis;
      grouped[skill] = current;
    });
  });
  return Object.values(grouped);
}

function defaultStore() {
  const teacher = { id: 'teacher-demo', role: 'teacher', name: 'Dr. Rivera', email: 'teacher@learnloop.demo', password: 'teacher123', classIds: ['class-advanced'], interventions: [] };
  const students = [
    { id: 'student-demo', role: 'student', name: 'Maya Chen', email: 'student@learnloop.demo', password: 'student123', classIds: ['class-advanced'], xp: 420, streak: 4, attempts: [], mastery: {}, subskills: [], profile: { favorite: 'Problem solving', theme: 'violet' } },
    { id: 'student-jordan', role: 'student', name: 'Jordan Patel', email: 'jordan@learnloop.demo', password: 'student123', classIds: ['class-advanced'], xp: 610, streak: 8, attempts: [], mastery: {}, subskills: [], profile: { favorite: 'Patterns', theme: 'blue' } },
    { id: 'student-aisha', role: 'student', name: 'Aisha Osei', email: 'aisha@learnloop.demo', password: 'student123', classIds: ['class-advanced'], xp: 280, streak: 2, attempts: [], mastery: {}, subskills: [], profile: { favorite: 'Challenge', theme: 'pink' } },
    { id: 'student-liam', role: 'student', name: 'Liam Brooks', email: 'liam@learnloop.demo', password: 'student123', classIds: ['class-advanced'], xp: 740, streak: 14, attempts: [], mastery: {}, subskills: [], profile: { favorite: 'Speed', theme: 'green' } },
    { id: 'student-sofia', role: 'student', name: 'Sofia Ramirez', email: 'sofia@learnloop.demo', password: 'student123', classIds: ['class-advanced'], xp: 350, streak: 5, attempts: [], mastery: {}, subskills: [], profile: { favorite: 'Visuals', theme: 'orange' } },
    { id: 'student-ethan', role: 'student', name: 'Ethan Wu', email: 'ethan@learnloop.demo', password: 'student123', classIds: ['class-advanced'], xp: 190, streak: 1, attempts: [], mastery: {}, subskills: [], profile: { favorite: 'Curiosity', theme: 'violet' } }
  ];
  students.forEach((student, index) => {
    const pattern = index === 1 || index === 3 ? 'calculus' : index === 2 || index === 5 ? 'algebra' : 'mixed';
    student.attempts = seedAttempts(student.id, pattern);
    student.attempts.forEach(attempt => {
      attempt.tags.forEach(tag => {
        const current = student.mastery[tag] || { score: 0.5, attempts: 0, correct: 0, lastUpdated: attempt.timestamp };
        current.attempts += 1; current.correct += attempt.correct ? 1 : 0; current.score = clamp((current.score * (current.attempts - 1) + (attempt.correct ? 1 : 0)) / current.attempts, 0, 1); current.lastUpdated = attempt.timestamp; student.mastery[tag] = current;
      });
    });
  });
  return { version: 2, classes: [{ id: 'class-advanced', name: 'Upper Maths · Section A', teacherIds: [teacher.id], studentIds: students.map(student => student.id) }], users: [teacher, ...students] };
}

class LearnLoop {
  constructor() {
    this.store = this.loadStore();
    this.store.users.filter(user => user.role === 'student').forEach(student => {
      student.subskills = buildSubskills(student.attempts);
    });
    this.persist();
    this.state = { appView: 'auth', authMode: 'login', authRole: 'student', authError: '', authMessage: '', authName: '', authEmail: '', currentUserId: null, currentQuestion: null, selectedOption: null, checked: false, result: null, confidence: 3, hintShown: false, selectedTopic: 'all', selectedStudentId: null, selectedDiagnostic: null, interventionMessage: '', toast: '' };
    const session = this.safeGet(SESSION_KEY);
    if (session && this.store.users.some(user => user.id === session.userId)) {
      this.startSession(session.userId);
    }
  }

  safeGet(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
  loadStore() {
    const saved = this.safeGet(STORAGE_KEY);
    if (saved?.version === 2 && Array.isArray(saved.users)) return saved;
    const fresh = defaultStore();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch { /* memory fallback */ }
    return fresh;
  }
  persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store)); } catch { /* memory fallback */ } }
  get user() { return this.store.users.find(user => user.id === this.state.currentUserId) || null; }
  get teacher() { return this.user?.role === 'teacher' ? this.user : null; }
  get student() { return this.user?.role === 'student' ? this.user : null; }
  get topicIds() { return TOPICS.map(topic => topic.id); }
  escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
  hexA(hex, alpha) { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`; }
  setState(patch) { this.state = { ...this.state, ...patch }; this.render(); }
  getMastery(user, topicId) { return user?.mastery?.[topicId] || { score: 0.5, attempts: 0, correct: 0 }; }
  masteryPercent(user, topicId) { return Math.round(this.getMastery(user, topicId).score * 100); }
  getQuestion(id) { return QUESTION_BY_ID[id] || (this.student?.attempts || []).find(attempt => attempt.questionId === id)?.questionSnapshot || null; }

  startSession(userId) {
    const user = this.store.users.find(item => item.id === userId);
    if (!user) return;
    this.state = { ...this.state, currentUserId: userId, authRole: user.role, authName: user.name, authEmail: user.email, appView: user.role === 'teacher' ? 'teacher-dashboard' : 'student-home', authError: '', authMessage: '', currentQuestion: null, selectedOption: null, checked: false, result: null, selectedStudentId: null, selectedDiagnostic: null, interventionMessage: '' };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ userId })); } catch { /* memory fallback */ }
    this.render();
  }

  handleAuthLogin = () => this.setState({ authMode: 'login', authError: '', authMessage: '' });
  handleAuthSignup = () => this.setState({ authMode: 'signup', authError: '', authMessage: '' });
  handleAuthRoleStudent = () => this.setState({ authRole: 'student', authError: '' });
  handleAuthRoleTeacher = () => this.setState({ authRole: 'teacher', authError: '' });
  handleDemoLogin = role => {
    this.setState({ authEmail: role === 'teacher' ? 'teacher@learnloop.demo' : 'student@learnloop.demo', authPassword: role === 'teacher' ? 'teacher123' : 'student123', authRole: role });
    setTimeout(() => this.submitAuthValues(role === 'teacher' ? 'teacher@learnloop.demo' : 'student@learnloop.demo', role === 'teacher' ? 'teacher123' : 'student123', ''), 0);
  };
  submitAuthValues(email, password, name) {
    const normalized = email.trim().toLowerCase();
    if (this.state.authMode === 'signup') {
      if (name.trim().length < 2) return this.setState({ authError: 'Enter a name with at least 2 characters.' });
      if (!/^\S+@\S+\.\S+$/.test(normalized)) return this.setState({ authError: 'Enter a valid email address.' });
      if (password.length < 6) return this.setState({ authError: 'Use a password with at least 6 characters.' });
      if (this.store.users.some(user => user.email === normalized)) return this.setState({ authError: 'That email already has an account. Try logging in.' });
      const user = { id: uid(this.state.authRole), role: this.state.authRole, name: name.trim().slice(0, 80), email: normalized, password, classIds: this.state.authRole === 'student' ? ['class-advanced'] : [], xp: 0, streak: 0, attempts: [], mastery: {}, subskills: [], profile: { favorite: 'Problem solving', theme: 'violet' }, interventions: [] };
      this.store.users.push(user);
      const classData = this.store.classes[0];
      if (user.role === 'student' && classData && !classData.studentIds.includes(user.id)) classData.studentIds.push(user.id);
      this.persist(); this.startSession(user.id); return;
    }
    const user = this.store.users.find(item => item.email === normalized && item.password === password && item.role === this.state.authRole);
    if (!user) return this.setState({ authError: 'We could not match those details. Check the role, email and password.' });
    this.startSession(user.id);
  }
  handleSubmitAuth = event => {
    event?.preventDefault();
    const name = document.getElementById('auth-name')?.value || '';
    const email = document.getElementById('auth-email')?.value || '';
    const password = document.getElementById('auth-password')?.value || '';
    this.submitAuthValues(email, password, name);
  };
  handleLogout = () => { try { localStorage.removeItem(SESSION_KEY); } catch { /* memory fallback */ } this.setState({ appView: 'auth', currentUserId: null, currentQuestion: null, selectedOption: null, checked: false, result: null, authError: '', authMessage: 'You are logged out.' }); };

  weakestTopics(user) { return [...TOPICS].sort((a, b) => this.getMastery(user, a.id).score - this.getMastery(user, b.id).score || this.getMastery(user, a.id).attempts - this.getMastery(user, b.id).attempts); }
  createGeneratedQuestion(topicId) {
    const stamp = Date.now();
    if (topicId === 'algebra') {
      const a = 2 + Math.floor(Math.random() * 5), x = 2 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 8), c = a * x + b;
      return q(`gen-${stamp}`, 'Fresh linear equation', `Solve ${a}x + ${b} = ${c}.`, [{ id: 'a', text: `x = ${x - 1}` }, { id: 'b', text: `x = ${x}` }, { id: 'c', text: `x = ${x + 1}` }, { id: 'd', text: `x = ${c}` }], 'b', ['algebra'], ['inverse operations', 'linear equations'], 2, `Subtract ${b}, then divide by ${a}: x = (${c} − ${b})/${a} = ${x}.`, { a: 'The constant was subtracted incorrectly.', c: 'The final division was off by one.', d: 'The right-hand side was reported as x.' });
    }
    if (topicId === 'functions') {
      const m = 2 + Math.floor(Math.random() * 4), shift = 1 + Math.floor(Math.random() * 4), x = 2 + Math.floor(Math.random() * 4), answer = m * x + shift;
      return q(`gen-${stamp}`, 'Fresh function evaluation', `If f(x) = ${m}x + ${shift}, find f(${x}).`, [{ id: 'a', text: `${answer - m}` }, { id: 'b', text: `${answer}` }, { id: 'c', text: `${answer + m}` }, { id: 'd', text: `${m + shift}` }], 'b', ['functions', 'algebra'], ['function evaluation', 'substitution'], 1, `Substitute ${x}: f(${x}) = ${m}(${x}) + ${shift} = ${answer}.`, { a: 'One copy of the coefficient was missed.', c: 'The coefficient was added instead of applied.', d: 'The input x was not substituted.' });
    }
    if (topicId === 'trigonometry') {
      const angle = [30, 45, 60][Math.floor(Math.random() * 3)];
      const values = { 30: ['1/2', '√3/2'], 45: ['√2/2', '√2/2'], 60: ['√3/2', '1/2'] };
      const answer = values[angle][0];
      return q(`gen-${stamp}`, 'Fresh exact trig value', `What is sin(${angle}°)?`, [{ id: 'a', text: answer }, { id: 'b', text: values[angle][1] }, { id: 'c', text: `−${answer}` }, { id: 'd', text: '1' }], 'a', ['trigonometry'], ['exact values', 'special angles'], 1, `From the special-angle triangle, sin(${angle}°) = ${answer}.`, { b: 'Sine and cosine were swapped.', c: 'The reference value was given a wrong sign.', d: 'The angle was treated as 90°.' });
    }
    if (topicId === 'calculus') {
      const coefficient = 2 + Math.floor(Math.random() * 5), power = 2 + Math.floor(Math.random() * 3), answer = `${coefficient * power}x${power - 1}`;
      return q(`gen-${stamp}`, 'Fresh derivative', `Differentiate y = ${coefficient}x^${power}.`, [{ id: 'a', text: `${coefficient}x${power - 1}` }, { id: 'b', text: answer }, { id: 'c', text: `${coefficient * (power + 1)}x${power}` }, { id: 'd', text: `${power}x${coefficient - 1}` }], 'b', ['calculus', 'algebra'], ['power rule', 'polynomial differentiation'], 2, `Multiply by the power and reduce it by one: y′ = ${answer}.`, { a: 'The exponent was reduced but not multiplied down.', c: 'The exponent was increased instead of reduced.', d: 'The coefficient and power were mixed.' });
    }
    if (topicId === 'geometry') {
      const a = 3 + Math.floor(Math.random() * 5), b = 4 + Math.floor(Math.random() * 5), answer = Math.sqrt(a * a + b * b);
      return q(`gen-${stamp}`, 'Fresh vector magnitude', `Find the magnitude of (${a}, ${b}).`, [{ id: 'a', text: `${a + b}` }, { id: 'b', text: `${answer}` }, { id: 'c', text: `${a * b}` }, { id: 'd', text: `${Math.abs(b - a)}` }], 'b', ['geometry'], ['vector magnitude', 'Pythagoras'], 1, `Use √(${a}² + ${b}²) = ${answer}.`, { a: 'The vector components were added.', c: 'The components were multiplied.', d: 'The difference was used instead of Pythagoras.' });
    }
    if (topicId === 'probability') {
      const favorable = 2 + Math.floor(Math.random() * 4), total = favorable + 2 + Math.floor(Math.random() * 5);
      return q(`gen-${stamp}`, 'Fresh probability', `A bag has ${favorable} red counters and ${total - favorable} blue counters. What is P(red)?`, [{ id: 'a', text: `${favorable}/${total}` }, { id: 'b', text: `${total}/${favorable}` }, { id: 'c', text: `${favorable}/${total - favorable}` }, { id: 'd', text: `${total - favorable}/${total}` }], 'a', ['probability'], ['theoretical probability', 'fractions'], 1, `Probability = favorable outcomes / total outcomes = ${favorable}/${total}.`, { b: 'The probability fraction was inverted.', c: 'Only the blue count was used as the denominator.', d: 'The blue probability was selected.' });
    }
    return QUESTION_BANK.find(question => question.tags.includes(topicId)) || QUESTION_BANK[0];
  }
  selectNextQuestion(user) {
    const weakest = this.weakestTopics(user).find(topic => this.getMastery(user, topic.id).score < 0.8) || this.weakestTopics(user)[0];
    const recent = new Set((user.attempts || []).slice(-8).map(attempt => attempt.questionId));
    const candidates = QUESTION_BANK.filter(question => question.tags.includes(weakest.id) && !recent.has(question.id));
    if (!candidates.length || (this.getMastery(user, weakest.id).attempts >= 2 && Math.random() < 0.45)) return this.createGeneratedQuestion(weakest.id);
    return [...candidates].sort((a, b) => Math.abs(a.difficulty - (this.getMastery(user, weakest.id).score < 0.45 ? 2 : 3)) - Math.abs(b.difficulty - (this.getMastery(user, weakest.id).score < 0.45 ? 2 : 3)))[0];
  }
  startPractice = () => { const question = this.selectNextQuestion(this.student); this.setState({ appView: 'practice', currentQuestion: question, selectedOption: null, checked: false, result: null, hintShown: false, confidence: 3 }); };
  chooseOption = id => { if (!this.state.checked) this.setState({ selectedOption: id }); };
  showHint = () => this.setState({ hintShown: true });
  setConfidence = value => this.setState({ confidence: clamp(Number(value), 1, 5) });
  checkAnswer = () => {
    const question = this.state.currentQuestion, selected = this.state.selectedOption;
    if (!question || !selected || this.state.checked) return;
    const correct = selected === question.answer;
    const selectedOption = question.options.find(option => option.id === selected);
    const diagnosis = correct ? 'Correct application of the target method.' : question.diagnosis[selected] || 'The method needs another look.';
    const student = this.student;
    const attempt = { id: uid('attempt'), userId: student.id, questionId: question.id, questionSnapshot: question, selectedOptionId: selected, selectedOptionText: selectedOption.text, correct, confidence: this.state.confidence, hintUsed: this.state.hintShown, timestamp: today(), tags: question.tags, skills: question.skills, diagnosis, diagnosisSkill: question.skills[0] };
    student.attempts = [...(student.attempts || []), attempt];
    question.tags.forEach(tag => {
      const previous = student.mastery[tag] || { score: 0.5, attempts: 0, correct: 0 };
      const updatedAttempts = previous.attempts + 1;
      const updatedScore = clamp(previous.score * 0.7 + (correct ? 1 : 0) * 0.3, 0, 1);
      student.mastery[tag] = { score: updatedScore, attempts: updatedAttempts, correct: previous.correct + (correct ? 1 : 0), lastUpdated: attempt.timestamp };
    });
    question.skills.forEach(skill => {
      const existing = student.subskills.find(item => item.skill === skill) || { skill, attempts: 0, correct: 0, score: 0.5, lastDiagnosis: '' };
      existing.attempts += 1; existing.correct += correct ? 1 : 0; existing.score = clamp(existing.score * 0.7 + (correct ? 1 : 0) * 0.3, 0, 1); existing.lastDiagnosis = diagnosis; existing.lastUpdated = attempt.timestamp;
      student.subskills = [...student.subskills.filter(item => item.skill !== skill), existing];
    });
    student.xp = (student.xp || 0) + (correct ? 12 : 3); student.streak = correct ? (student.streak || 0) + 1 : student.streak || 0;
    this.persist();
    this.setState({ checked: true, result: { correct, diagnosis, selectedText: selectedOption.text, explanation: question.explanation } });
  };
  nextQuestion = () => { const question = this.selectNextQuestion(this.student); this.setState({ currentQuestion: question, selectedOption: null, checked: false, result: null, hintShown: false, confidence: 3 }); };
  backToStudentHome = () => this.setState({ appView: 'student-home', currentQuestion: null, checked: false, result: null });
  openTeacherStudent = studentId => this.setState({ appView: 'teacher-student', selectedStudentId: studentId, selectedDiagnostic: null, interventionMessage: '' });
  openDiagnostic = diagnostic => this.setState({ selectedDiagnostic: diagnostic });
  backToTeacherDashboard = () => this.setState({ appView: 'teacher-dashboard', selectedStudentId: null, selectedDiagnostic: null, interventionMessage: '' });
  assignIntervention = () => {
    const student = this.store.users.find(user => user.id === this.state.selectedStudentId);
    const note = document.getElementById('intervention-note')?.value.trim();
    if (!student || !note) return this.setState({ interventionMessage: 'Add a short note before assigning the follow-up.' });
    this.teacher.interventions = [...(this.teacher.interventions || []), { id: uid('intervention'), studentId: student.id, note, createdAt: today() }]; this.persist(); this.setState({ interventionMessage: `Follow-up saved for ${student.name}.` });
  };

  classStudents() {
    const classIds = this.teacher?.classIds || [];
    return this.store.users.filter(user => user.role === 'student' && user.classIds?.some(id => classIds.includes(id)));
  }
  getClassDiagnostics() {
    const grouped = {};
    this.classStudents().forEach(student => (student.attempts || []).filter(attempt => !attempt.correct).forEach(attempt => {
      const key = `${attempt.diagnosisSkill}|${attempt.diagnosis}`;
      if (!grouped[key]) grouped[key] = { key, skill: attempt.diagnosisSkill, diagnosis: attempt.diagnosis, topicIds: attempt.tags, count: 0, studentIds: new Set(), examples: [] };
      grouped[key].count += 1; grouped[key].studentIds.add(student.id); if (grouped[key].examples.length < 3) grouped[key].examples.push({ student, attempt });
    }));
    return Object.values(grouped).map(item => ({ ...item, students: [...item.studentIds].length })).sort((a, b) => b.count - a.count);
  }
  classTopicSummary() {
    const students = this.classStudents();
    return TOPICS.map(topic => { const scores = students.map(student => this.getMastery(student, topic.id).score); const attempts = students.reduce((sum, student) => sum + this.getMastery(student, topic.id).attempts, 0); return { ...topic, score: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5, attempts }; });
  }
  classStats() {
    const students = this.classStudents(), attempts = students.flatMap(student => student.attempts || []), scores = students.flatMap(student => TOPICS.map(topic => this.getMastery(student, topic.id).score));
    return { students: students.length, active: students.filter(student => student.attempts?.length).length, attempts: attempts.length, mastery: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) : 0, support: students.filter(student => this.weakestTopics(student)[0] && this.getMastery(student, this.weakestTopics(student)[0].id).score < 0.55).length };
  }

  render() {
    const root = document.getElementById('root'); if (!root) return;
    root.innerHTML = this.renderApp();
    document.title = `LearnLoop · ${this.state.appView === 'teacher-dashboard' || this.state.appView === 'teacher-student' ? 'Teacher workspace' : 'Adaptive maths'}`;
    this.attachEventListeners();
  }
  button(label, id, style = '', disabled = false) { return `<button type="button" id="${id}" ${disabled ? 'disabled' : ''} style="${style}">${label}</button>`; }
  renderApp() { if (this.state.appView === 'auth') return this.renderAuth(); if (this.state.appView === 'student-home') return this.renderStudentHome(); if (this.state.appView === 'practice') return this.renderPractice(); if (this.state.appView === 'teacher-student') return this.renderTeacherStudent(); return this.renderTeacherDashboard(); }

  renderAuth() {
    const signup = this.state.authMode === 'signup';
    return `<main class="auth-shell"><form id="auth-form" class="auth-card" novalidate><div class="brand-mark">LearnLoop</div><p class="auth-kicker">Adaptive upper-school maths practice</p><div class="auth-tabs"><button type="button" id="auth-login-btn" class="auth-tab ${!signup ? 'active' : ''}">Log in</button><button type="button" id="auth-signup-btn" class="auth-tab ${signup ? 'active' : ''}">Create account</button></div><div class="role-picker"><button type="button" id="auth-student-btn" class="role-btn ${this.state.authRole === 'student' ? 'active' : ''}">Student</button><button type="button" id="auth-teacher-btn" class="role-btn ${this.state.authRole === 'teacher' ? 'active' : ''}">Teacher</button></div>${signup ? `<label>Name<input id="auth-name" value="${this.escapeHtml(this.state.authName)}" placeholder="e.g. Maya Chen" autocomplete="name"></label>` : ''}<label>Email<input id="auth-email" value="${this.escapeHtml(this.state.authEmail || '')}" type="email" placeholder="you@example.com" autocomplete="email" required></label><label>Password<input id="auth-password" type="password" placeholder="At least 6 characters" autocomplete="current-password" required></label>${this.state.authError ? `<div class="form-error" role="alert">${this.escapeHtml(this.state.authError)}</div>` : ''}${this.state.authMessage ? `<div class="form-message">${this.escapeHtml(this.state.authMessage)}</div>` : ''}<button type="submit" class="primary-btn">${signup ? 'Create account' : 'Log in'}</button><div class="demo-login"><span>Demo access</span><button type="button" id="demo-student-btn">Student demo</button><button type="button" id="demo-teacher-btn">Teacher demo</button></div><p class="auth-footnote">Demo accounts persist in this browser so attempts and teacher insights stay connected.</p></form></main>`;
  }

  topbar(role) { return `<header class="topbar"><div class="topbar-inner"><div class="brand-mark small">LearnLoop</div><div class="topbar-spacer"></div><span class="session-label">${role === 'teacher' ? 'Teacher workspace' : 'Student workspace'}</span><span class="user-pill">${this.escapeHtml(this.user?.name || '')}</span><button type="button" id="logout-btn" class="ghost-btn">Log out</button></div></header>`; }
  renderTopicPill(topicId) { const topic = TAG_BY_ID[topicId]; return `<span class="topic-pill" style="--topic:${topic?.color || PURPLE}">${this.escapeHtml(topic?.short || topicId)}</span>`; }
  renderMasteryCard(user, topic) { const mastery = this.getMastery(user, topic.id), pct = Math.round(mastery.score * 100), state = mastery.attempts === 0 ? 'New' : pct < 55 ? 'Needs practice' : pct < 80 ? 'Building' : 'Strong'; return `<div class="mastery-card"><div class="mastery-card-top"><span>${this.escapeHtml(topic.label)}</span><strong>${pct}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${topic.color}"></div></div><div class="mastery-card-bottom"><span>${state}</span><span>${mastery.attempts} signal${mastery.attempts === 1 ? '' : 's'}</span></div></div>`; }

  renderStudentHome() {
    const student = this.student, weakest = this.weakestTopics(student)[0], stats = { attempts: student.attempts?.length || 0, correct: student.attempts?.filter(attempt => attempt.correct).length || 0 }, accuracy = stats.attempts ? Math.round(stats.correct / stats.attempts * 100) : 0;
    const recent = [...(student.attempts || [])].reverse().slice(0, 5);
    return `${this.topbar('student')}<main class="page-shell student-shell"><section class="hero-row"><div><span class="eyebrow">Adaptive practice · ${this.escapeHtml(student.profile?.favorite || 'Maths')}</span><h1>Build the pattern, not just the answer.</h1><p>Your next question is chosen from the skills that will help you most right now.</p></div><div class="student-score"><span>Momentum</span><strong>${student.streak || 0}</strong><small>streak days</small></div></section><section class="stats-grid"><div class="stat-card"><span>Questions solved</span><strong>${stats.attempts}</strong><small>${stats.correct} correct</small></div><div class="stat-card"><span>Accuracy</span><strong>${accuracy}%</strong><small>across all topics</small></div><div class="stat-card"><span>Learning sparks</span><strong>${student.xp || 0}</strong><small>+12 for a correct answer</small></div><div class="stat-card"><span>Question bank</span><strong>${QUESTION_BANK.length}+</strong><small>curated + generated</small></div></section><section class="recommendation-card"><div class="recommendation-icon">↗</div><div class="recommendation-copy"><span class="eyebrow">Recommended next</span><h2>${this.escapeHtml(weakest.label)}</h2><p>${this.escapeHtml(weakest.blurb)} ${this.getMastery(student, weakest.id).attempts ? `Current signal: ${this.masteryPercent(student, weakest.id)}% mastery.` : 'Start here to establish a baseline.'}</p></div><button type="button" id="start-practice-btn" class="primary-btn">Start adaptive practice</button></section><section class="section-heading"><div><span class="eyebrow">Living concept map</span><h2>Topic mastery</h2></div><span class="muted">Updates after every answer</span></section><div class="mastery-grid">${TOPICS.map(topic => this.renderMasteryCard(student, topic)).join('')}</div><section class="two-column"><div class="panel"><div class="panel-heading"><div><span class="eyebrow">Evidence trail</span><h2>Recent answers</h2></div><span class="muted">${recent.length} shown</span></div>${recent.length ? `<div class="attempt-list">${recent.map(attempt => `<div class="attempt-row"><div class="attempt-status ${attempt.correct ? 'correct' : 'incorrect'}">${attempt.correct ? '✓' : '!'}</div><div class="attempt-main"><strong>${this.escapeHtml(attempt.questionSnapshot?.title || 'Question')}</strong><span>${attempt.tags.map(tag => TAG_BY_ID[tag]?.short || tag).join(' · ')} · ${new Date(attempt.timestamp).toLocaleDateString()}</span></div><div class="attempt-result">${attempt.correct ? 'Correct' : 'Review'}</div></div>`).join('')}</div>` : `<div class="empty-state">Your first answer will create a learning signal here.</div>`}</div><div class="panel"><div class="panel-heading"><div><span class="eyebrow">How it adapts</span><h2>Weakest topics rise</h2></div></div><p class="panel-copy">LearnLoop combines accuracy, recency, confidence and tagged subskills. It then chooses a nearby question or generates a fresh one when you have worked through the bank.</p><div class="engine-steps"><div><b>1</b><span>Capture answer + misconception</span></div><div><b>2</b><span>Update topic and subskill mastery</span></div><div><b>3</b><span>Serve the next useful question</span></div></div></div></section></main>`;
  }

  renderPractice() {
    const question = this.state.currentQuestion, selected = this.state.selectedOption, checked = this.state.checked, result = this.state.result;
    if (!question) return '';
    return `${this.topbar('student')}<main class="page-shell practice-shell"><button type="button" id="back-dashboard-btn" class="back-link">← Back to dashboard</button><div class="practice-header"><div><span class="eyebrow">Adaptive question ${question.id.startsWith('gen-') ? '· generated for your current gap' : '· from the curated bank'}</span><h1>${this.escapeHtml(question.title)}</h1><div class="tag-row">${question.tags.map(tag => this.renderTopicPill(tag)).join('')}<span class="difficulty-pill">Difficulty ${question.difficulty}/4</span></div></div><div class="practice-progress"><span>Question ${this.student.attempts.length + (checked ? 0 : 1)}</span><strong>${this.masteryPercent(this.student, question.tags[0])}%</strong><small>${TAG_BY_ID[question.tags[0]]?.short} mastery</small></div></div><section class="question-card"><div class="question-prompt">${this.escapeHtml(question.prompt)}</div>${!checked ? `<div class="option-grid">${question.options.map(option => `<button type="button" class="answer-option ${selected === option.id ? 'selected' : ''}" data-option-id="${option.id}"><span class="option-letter">${option.id.toUpperCase()}</span><span>${this.escapeHtml(option.text)}</span></button>`).join('')}</div><div class="hint-area">${this.state.hintShown ? `<div class="hint-box">Hint: identify the rule or representation named by the question before calculating.</div>` : `<button type="button" id="hint-btn" class="hint-btn">Need a hint?</button>`}</div><div class="confidence-row"><label for="confidence-slider">How sure are you? <strong>${['Not sure', 'A bit', 'Fairly sure', 'Very sure', 'Certain'][this.state.confidence - 1]}</strong></label><input id="confidence-slider" type="range" min="1" max="5" value="${this.state.confidence}"></div><button type="button" id="check-answer-btn" class="primary-btn full-btn" ${selected ? '' : 'disabled'}>Check answer</button>` : `<div class="answer-review ${result.correct ? 'success' : 'needs-review'}"><div class="review-title"><span>${result.correct ? '✓' : '!'}</span><div><h2>${result.correct ? 'Correct — useful evidence.' : 'Not quite — useful evidence.'}</h2><p>You selected <strong>${this.escapeHtml(result.selectedText)}</strong>.</p></div></div><div class="diagnosis-box"><span class="eyebrow">What the system learned</span><p>${this.escapeHtml(result.diagnosis)}</p></div><div class="explanation-box"><span class="eyebrow">Right solution</span><p>${this.escapeHtml(result.explanation)}</p></div><div class="tag-row">${question.skills.map(skill => `<span class="skill-pill">${this.escapeHtml(skill)}</span>`).join('')}</div><div class="practice-actions"><button type="button" id="next-question-btn" class="primary-btn">${result.correct ? 'Next adaptive question' : 'Try the next one'}</button><button type="button" id="back-dashboard-btn-bottom" class="secondary-btn">Review dashboard</button></div></div>`}</section></main>`;
  }

  renderTeacherDashboard() {
    const stats = this.classStats(), topics = this.classTopicSummary(), diagnostics = this.getClassDiagnostics().slice(0, 6), students = this.classStudents();
    return `${this.topbar('teacher')}<main class="page-shell teacher-shell"><section class="hero-row"><div><span class="eyebrow">${this.escapeHtml(this.store.classes.find(item => this.teacher.classIds?.includes(item.id))?.name || 'Teacher workspace')}</span><h1>See the pattern behind the mistake.</h1><p>Class-level mastery, subskill signals and the exact reasoning gap behind each wrong answer.</p></div><div class="teacher-badge"><span>Signals captured</span><strong>${stats.attempts}</strong><small>from live student attempts</small></div></section><section class="stats-grid"><div class="stat-card"><span>Students active</span><strong>${stats.active}/${stats.students}</strong><small>in this class</small></div><div class="stat-card"><span>Class mastery</span><strong>${stats.mastery}%</strong><small>across tagged topics</small></div><div class="stat-card"><span>Need a nudge</span><strong>${stats.support}</strong><small>below 55% on a topic</small></div><div class="stat-card"><span>Diagnostic patterns</span><strong>${this.getClassDiagnostics().length}</strong><small>grouped by subskill</small></div></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">Class concept map</span><h2>Where the class is now</h2></div><span class="muted">Average mastery</span></div><div class="class-topic-grid">${topics.map(topic => `<div class="class-topic-card"><div class="class-topic-top"><span>${this.escapeHtml(topic.label)}</span><strong>${Math.round(topic.score * 100)}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${Math.round(topic.score * 100)}%;background:${topic.color}"></div></div><small>${topic.attempts} tagged answer${topic.attempts === 1 ? '' : 's'}</small></div>`).join('')}</div></section><section class="two-column teacher-columns"><div class="panel"><div class="panel-heading"><div><span class="eyebrow">Pattern detection</span><h2>Shared reasoning gaps</h2></div><span class="muted">Click to inspect</span></div>${diagnostics.length ? `<div class="diagnostic-list">${diagnostics.map((item, index) => `<button type="button" class="diagnostic-row" data-diagnostic-index="${index}"><div class="diagnostic-rank">${index + 1}</div><div class="diagnostic-main"><strong>${this.escapeHtml(item.skill)}</strong><span>${this.escapeHtml(item.diagnosis)}</span></div><div class="diagnostic-count">${item.count}<small>${item.students} student${item.students === 1 ? '' : 's'}</small></div></button>`).join('')}</div>` : `<div class="empty-state">As students answer questions, shared misconceptions will appear here.</div>`}</div><div class="panel"><div class="panel-heading"><div><span class="eyebrow">Roster</span><h2>Student snapshots</h2></div><span class="muted">${students.length} enrolled</span></div><div class="roster-list">${students.map(student => { const weak = this.weakestTopics(student)[0]; return `<button type="button" class="roster-row" data-student-id="${student.id}"><div class="avatar">${this.escapeHtml(student.name.split(' ').map(part => part[0]).join('').slice(0, 2))}</div><div class="roster-main"><strong>${this.escapeHtml(student.name)}</strong><span>${student.attempts.length} attempts · weakest: ${this.escapeHtml(weak.short)}</span></div><div class="roster-score">${this.masteryPercent(student, weak.id)}%</div></button>`; }).join('')}</div></div></section>${this.state.selectedDiagnostic ? `<div class="modal-backdrop" id="diagnostic-modal"><div class="detail-modal"><button type="button" id="close-diagnostic-btn" class="modal-close">×</button><span class="eyebrow">${this.escapeHtml(this.state.selectedDiagnostic.skill)}</span><h2>${this.escapeHtml(this.state.selectedDiagnostic.diagnosis)}</h2><p>This is a pattern across ${this.state.selectedDiagnostic.students} student${this.state.selectedDiagnostic.students === 1 ? '' : 's'}, not a single question.</p><div class="evidence-list">${this.state.selectedDiagnostic.examples.map(example => `<div><strong>${this.escapeHtml(example.student.name)}</strong><span>${this.escapeHtml(example.attempt.questionSnapshot.title)} · selected “${this.escapeHtml(example.attempt.selectedOptionText)}”</span></div>`).join('')}</div></div></div>` : ''}</main>`;
  }

  renderTeacherStudent() {
    const student = this.store.users.find(user => user.id === this.state.selectedStudentId) || this.classStudents()[0];
    if (!student) return this.renderTeacherDashboard();
    const weak = this.weakestTopics(student), incorrect = [...(student.attempts || [])].filter(attempt => !attempt.correct).reverse().slice(0, 8), interventions = (this.teacher.interventions || []).filter(item => item.studentId === student.id);
    const patterns = [...(student.subskills || [])].filter(item => item.attempts && item.score < 0.8 && student.attempts.some(attempt => !attempt.correct && attempt.skills?.includes(item.skill))).sort((a, b) => a.score - b.score);
    return `${this.topbar('teacher')}<main class="page-shell teacher-shell"><button type="button" id="back-teacher-btn" class="back-link">← Back to class overview</button><section class="student-detail-hero"><div class="avatar large">${this.escapeHtml(student.name.split(' ').map(part => part[0]).join('').slice(0, 2))}</div><div><span class="eyebrow">Student diagnostic profile</span><h1>${this.escapeHtml(student.name)}</h1><p>${student.attempts.length} attempts · ${student.attempts.filter(attempt => attempt.correct).length} correct · ${student.xp} sparks</p></div><div class="detail-highlight"><span>Priority topic</span><strong>${this.escapeHtml(weak[0].short)}</strong><small>${this.masteryPercent(student, weak[0].id)}% mastery</small></div></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">Topic-level signal</span><h2>What to reteach first</h2></div><span class="muted">Updated after every answer</span></div><div class="mastery-grid">${TOPICS.map(topic => this.renderMasteryCard(student, topic)).join('')}</div></section><section class="two-column teacher-columns"><div class="panel"><div class="panel-heading"><div><span class="eyebrow">Subskill diagnosis</span><h2>Pinpoint the gap</h2></div></div>${patterns.length ? `<div class="subskill-list">${patterns.map(pattern => { const evidence = [...student.attempts].reverse().find(attempt => !attempt.correct && attempt.skills?.includes(pattern.skill)); return `<div class="subskill-row"><div><strong>${this.escapeHtml(pattern.skill)}</strong><span>${this.escapeHtml(evidence?.diagnosis || pattern.lastDiagnosis || 'Needs more evidence')}</span></div><div class="subskill-score">${Math.round(pattern.score * 100)}%</div></div>`; }).join('')}</div>` : `<div class="empty-state">More incorrect attempts will make the subskill profile more precise.</div>`}</div><div class="panel"><div class="panel-heading"><div><span class="eyebrow">Teacher action</span><h2>Assign a follow-up</h2></div></div><textarea id="intervention-note" class="note-input" placeholder="e.g. Revisit the chain rule with two worked examples, then assign a generated practice set."></textarea>${this.state.interventionMessage ? `<div class="form-message">${this.escapeHtml(this.state.interventionMessage)}</div>` : ''}<button type="button" id="assign-intervention-btn" class="primary-btn full-btn">Save intervention</button>${interventions.length ? `<div class="intervention-history"><span class="eyebrow">Saved actions</span>${interventions.slice(-3).reverse().map(item => `<div><span>${this.escapeHtml(item.note)}</span><small>${new Date(item.createdAt).toLocaleDateString()}</small></div>`).join('')}</div>` : ''}</div></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">Answer evidence</span><h2>Recent incorrect responses</h2></div><span class="muted">Exact selection + diagnosis</span></div>${incorrect.length ? `<div class="evidence-table">${incorrect.map(attempt => `<div class="evidence-table-row"><div><strong>${this.escapeHtml(attempt.questionSnapshot.title)}</strong><span>${attempt.tags.map(tag => TAG_BY_ID[tag]?.short || tag).join(' · ')} · ${new Date(attempt.timestamp).toLocaleDateString()}</span></div><div><strong>Selected: ${this.escapeHtml(attempt.selectedOptionText)}</strong><span>${this.escapeHtml(attempt.diagnosis)}</span></div></div>`).join('')}</div>` : `<div class="empty-state">No incorrect responses yet. Nice signal.</div>`}</section></main>`;
  }

  attachEventListeners() {
    document.getElementById('auth-login-btn')?.addEventListener('click', this.handleAuthLogin); document.getElementById('auth-signup-btn')?.addEventListener('click', this.handleAuthSignup); document.getElementById('auth-student-btn')?.addEventListener('click', this.handleAuthRoleStudent); document.getElementById('auth-teacher-btn')?.addEventListener('click', this.handleAuthRoleTeacher); document.getElementById('auth-form')?.addEventListener('submit', this.handleSubmitAuth); document.getElementById('demo-student-btn')?.addEventListener('click', () => this.handleDemoLogin('student')); document.getElementById('demo-teacher-btn')?.addEventListener('click', () => this.handleDemoLogin('teacher')); document.getElementById('logout-btn')?.addEventListener('click', this.handleLogout);
    document.getElementById('start-practice-btn')?.addEventListener('click', this.startPractice); document.getElementById('back-dashboard-btn')?.addEventListener('click', this.backToStudentHome); document.getElementById('back-dashboard-btn-bottom')?.addEventListener('click', this.backToStudentHome); document.getElementById('hint-btn')?.addEventListener('click', this.showHint); document.getElementById('check-answer-btn')?.addEventListener('click', this.checkAnswer); document.getElementById('next-question-btn')?.addEventListener('click', this.nextQuestion); document.getElementById('confidence-slider')?.addEventListener('input', event => this.setConfidence(event.target.value));
    document.querySelectorAll('[data-option-id]').forEach(button => button.addEventListener('click', () => this.chooseOption(button.dataset.optionId))); document.querySelectorAll('[data-student-id]').forEach(button => button.addEventListener('click', () => this.openTeacherStudent(button.dataset.studentId))); document.getElementById('back-teacher-btn')?.addEventListener('click', this.backToTeacherDashboard); document.getElementById('assign-intervention-btn')?.addEventListener('click', this.assignIntervention); document.querySelectorAll('[data-diagnostic-index]').forEach(button => button.addEventListener('click', () => { const item = this.getClassDiagnostics().slice(0, 6)[Number(button.dataset.diagnosticIndex)]; if (item) this.openDiagnostic(item); })); document.getElementById('close-diagnostic-btn')?.addEventListener('click', () => this.setState({ selectedDiagnostic: null })); document.getElementById('diagnostic-modal')?.addEventListener('click', event => { if (event.target.id === 'diagnostic-modal') this.setState({ selectedDiagnostic: null }); });
  }
}

const app = new LearnLoop();
app.render();
