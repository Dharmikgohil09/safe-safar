// Logic for the decoy calculator, kept free of any UI so it can be tested.
// Internal operators are + - * /. The screen shows them as + − × ÷.

export interface CalcState {
  /** What has been typed, e.g. "12+3*4". */
  expr: string;
  /** Set after "=": the answer, or "Error". */
  result: string | null;
}

export const EMPTY_CALC: CalcState = { expr: '', result: null };

const MAX_LEN = 16;
const OPERATORS = '+-*/';

function isOp(ch: string): boolean {
  return ch.length === 1 && OPERATORS.includes(ch);
}

/** + - * / with normal precedence and a leading minus. No eval(). Returns NaN when it cannot be read. */
function compute(expr: string): number {
  const tokens = expr.match(/\d+\.?\d*|\.\d+|[+\-*/]/g);
  if (!tokens || tokens.join('') !== expr) return NaN;
  let i = 0;

  const factor = (): number => {
    let sign = 1;
    while (tokens[i] === '-') {
      sign = -sign;
      i++;
    }
    const t = tokens[i];
    if (t === undefined || isOp(t)) return NaN;
    i++;
    return sign * parseFloat(t);
  };
  const term = (): number => {
    let v = factor();
    while (tokens[i] === '*' || tokens[i] === '/') {
      const op = tokens[i++];
      const r = factor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const sum = (): number => {
    let v = term();
    while (tokens[i] === '+' || tokens[i] === '-') {
      const op = tokens[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };

  const v = sum();
  return i === tokens.length ? v : NaN;
}

export function evaluate(expr: string): string {
  // "5+" is read as "5": a trailing operator is ignored, like on a real calculator
  let e = expr;
  while (e.length > 0 && isOp(e[e.length - 1])) e = e.slice(0, -1);
  if (e === '') return '0';
  const v = compute(e);
  if (!Number.isFinite(v)) return 'Error';
  return String(parseFloat(v.toPrecision(10)));
}

function lastNumber(expr: string): string {
  let i = expr.length;
  while (i > 0 && !isOp(expr[i - 1])) i--;
  return expr.slice(i);
}

/** keys: 0-9 . + - * / = C ⌫ */
export function press(s: CalcState, key: string): CalcState {
  if (/^\d$/.test(key)) {
    if (s.result !== null) return { expr: key, result: null };
    if (s.expr.length >= MAX_LEN) return s;
    return { expr: s.expr + key, result: null };
  }

  if (key === '.') {
    if (s.result !== null) return { expr: '0.', result: null };
    if (s.expr.length >= MAX_LEN) return s;
    if (s.expr === '' || isOp(s.expr[s.expr.length - 1])) return { expr: s.expr + '0.', result: null };
    if (lastNumber(s.expr).includes('.')) return s;
    return { expr: s.expr + '.', result: null };
  }

  if (isOp(key)) {
    if (s.result !== null) {
      if (s.result === 'Error') return { expr: key === '-' ? '-' : '', result: null };
      return { expr: s.result + key, result: null };
    }
    if (s.expr === '') return key === '-' ? { expr: '-', result: null } : s;
    if (s.expr === '-') return s;
    if (isOp(s.expr[s.expr.length - 1])) return { expr: s.expr.slice(0, -1) + key, result: null };
    if (s.expr.length >= MAX_LEN) return s;
    return { expr: s.expr + key, result: null };
  }

  if (key === '=') {
    if (s.expr === '' || s.result !== null) return s;
    return { expr: s.expr, result: evaluate(s.expr) };
  }

  if (key === 'C') return EMPTY_CALC;

  if (key === '⌫') {
    if (s.result !== null) return EMPTY_CALC;
    return { expr: s.expr.slice(0, -1), result: null };
  }

  return s;
}

/** What to show in the big display line. */
export function display(s: CalcState): string {
  return s.result ?? (s.expr === '' ? '0' : s.expr);
}

/** Operators drawn the way a calculator shows them. */
export function pretty(text: string): string {
  return text.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
}
