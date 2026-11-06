// Unit tests for js/validation.js. Run: node --test tests/validation.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../js/validation.js');

const ok = (fn, val, ...rest) => assert.equal(fn(val, ...rest), '', `${JSON.stringify(val)} should be valid`);
const bad = (fn, val, ...rest) => assert.notEqual(fn(val, ...rest), '', `${JSON.stringify(val)} should be invalid`);

test('name: accepts real names', () => {
  ['Mary Evans', 'Jo', "Seán O'Neill", 'Anne-Marie Dubois', 'Dr. Priya Nair', 'José Álvarez', 'Zoë'].forEach(n => ok(v.validateName, n));
});
test('name: rejects single characters, digits and symbols', () => {
  ['A', 'a', 'A.', 'John3', '3', 'Mary 2nd', 'R2D2', 'mary@home', 'Bob!', '  ', '', '-Jo', "'Al"].forEach(n => bad(v.validateName, n));
});
test('name: rejects over-long names', () => { bad(v.validateName, 'A'.repeat(81)); });

test('email: accepts standard formats', () => {
  ['mary@example.com', 'mary.evans@example.co.uk', 'm+care@northcrest.example', 'a_b-c@mail-server.org'].forEach(e => ok(v.validateEmail, e));
});
test('email: rejects missing @, missing domain and malformed addresses', () => {
  ['mary.example.com', 'mary@', '@example.com', 'mary@example', 'mary@example.', 'mary@.com', 'ma ry@example.com',
    'mary@@example.com', '.mary@example.com', 'mary.@example.com', 'ma..ry@example.com', 'mary@exa_mple.com', 'mary@example.c', ''].forEach(e => bad(v.validateEmail, e));
});

test('phone: accepts digits (spaces and a leading + allowed), 7 to 15 digits', () => {
  ['9876543210', '0161 496 0142', '+44 161 496 0142', '1234567', '123456789012345'].forEach(p => ok(v.validatePhone, p));
});
test('phone: rejects letters, other symbols and wrong lengths', () => {
  ['98765abc', 'abcdefg', '0163-296-0412', '(01632) 960412', '12345 6', '123456', '1234567890123456', '44+1632960412', '++441632960412', ''].forEach(p => bad(v.validatePhone, p));
});

test('date: today and future dates are valid, past dates are not', () => {
  const today = new Date(2026, 10, 4); // 4 Nov 2026
  ok(v.validateFutureDate, '2026-11-04', today);
  ok(v.validateFutureDate, '2026-11-05', today);
  ok(v.validateFutureDate, '2027-01-01', today);
  bad(v.validateFutureDate, '2026-11-03', today);
  bad(v.validateFutureDate, '2025-12-31', today);
});
test('date: rejects malformed and impossible dates', () => {
  const today = new Date(2026, 10, 4);
  ['', '04/11/2026', '2026-13-01', '2026-02-30', '2026-11-4', 'tomorrow'].forEach(d => bad(v.validateFutureDate, d, today));
});

test('password: at least 8 characters with a letter and a number', () => {
  ['abcd1234', 'Northcrest2027', 'correct horse 9'].forEach(x => ok(v.validatePassword, x));
  ['', 'short1', 'abcdefgh', '12345678', 'a1'.repeat(70)].forEach(x => bad(v.validatePassword, x));
});
test('validateField: password rule via name and data-match confirm', () => {
  assert.notEqual(v.validateField(field({ name: 'new-password', type: 'password', value: 'abc' })), '');
  assert.equal(v.validateField(field({ name: 'new-password', type: 'password', value: 'abcd1234' })), '');
  assert.equal(v.validateField(field({ name: 'password', type: 'password', value: 'x', required: true })), '', 'login password only needs to be present');
  const other = { value: 'abcd1234' };
  const confirm = field({ name: 'confirm', type: 'password', value: 'abcd9999', form: { querySelector: () => other }, attrs: { 'data-match': '#pw' } });
  assert.notEqual(v.validateField(confirm), '');
  confirm.value = 'abcd1234';
  assert.equal(v.validateField(confirm), '');
});

test('required: empty or whitespace is an error', () => {
  bad(v.validateRequired, ''); bad(v.validateRequired, '   '); bad(v.validateRequired, null);
  ok(v.validateRequired, 'x');
});

// validateField works with plain objects shaped like form controls
function field(o) { return Object.assign({ name: '', type: 'text', value: '', required: false, tagName: 'INPUT', getAttribute: (k) => (o.attrs || {})[k] || null }, o); }
test('validateField: infers the rule from name/type', () => {
  assert.notEqual(v.validateField(field({ name: 'name', value: 'J' })), '');
  assert.equal(v.validateField(field({ name: 'name', value: 'Jo' })), '');
  assert.notEqual(v.validateField(field({ name: 'email', type: 'email', value: 'mary@' })), '');
  assert.notEqual(v.validateField(field({ name: 'phone', type: 'tel', value: '98765abc' })), '');
  assert.equal(v.validateField(field({ name: 'phone', type: 'tel', value: '9876543210' })), '');
  assert.notEqual(v.validateField(field({ name: 'visit', type: 'date', value: '2000-01-01' })), '');
});
test('validateField: required vs optional, checkboxes, selects and data-rule', () => {
  assert.equal(v.validateField(field({ name: 'message', value: '' })), '');
  assert.notEqual(v.validateField(field({ name: 'message', value: '', required: true })), '');
  assert.equal(v.validateField(field({ name: 'phone', type: 'tel', value: '' })), '', 'optional empty phone is fine');
  assert.notEqual(v.validateField(field({ name: 'consent', type: 'checkbox', checked: false, required: true })), '');
  assert.equal(v.validateField(field({ name: 'consent', type: 'checkbox', checked: true, required: true })), '');
  assert.notEqual(v.validateField(field({ name: 'room', tagName: 'SELECT', type: 'select-one', value: '', required: true })), '');
  assert.notEqual(v.validateField(field({ name: 'relative', value: 'Ann3', attrs: { 'data-rule': 'name' } })), '');
});
