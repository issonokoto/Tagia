'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise the actual plugin functions without starting Eagle or its worker.
// TAGIA_PLUGIN_ROOT also lets the same tests verify the release staging copy.
const root = process.env.TAGIA_PLUGIN_ROOT || path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'plugin.js'), 'utf8');
const start = source.indexOf('  const TAGIA_START =');
const end = source.indexOf('  function isEngineReady(', start);
assert.ok(start >= 0 && end > start, 'Annotation functions must be present');
const applySource = source.match(/^  async function applyTagsToItem\([\s\S]*?^  }/m);
assert.ok(applySource, 'Batch annotation writer must be present');
const context = vm.createContext({});
vm.runInContext(source.slice(start, end) + '\n' + applySource[0] +
  '\nglobalThis.annotationApi = { mergeAnnotationSafe, applyTagsToItem };', context);
const { mergeAnnotationSafe, applyTagsToItem } = context.annotationApi;
const block = '<!-- Tagia -->\ncat, blue sky\n<!-- /Tagia -->';

function assertSameBytes(actual, expected) {
  assert.deepEqual(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8'));
}

const cases = [
  { name: 'first-line indentation', note: '    First line\nSecond line', separator: '\n\n' },
  { name: 'Markdown two trailing spaces', note: 'Markdown line  ', separator: '\n\n' },
  { name: 'Markdown spaces before final newline', note: 'Markdown line  \n', separator: '\n' },
  { name: 'one final LF', note: 'Note\n', separator: '\n' },
  { name: 'two final LFs', note: 'Note\n\n', separator: '' },
  { name: 'multiple final LFs', note: 'Note\n\n\n\n', separator: '' },
  { name: 'spaces-only Note', note: '   ', separator: '\n\n' },
  { name: 'tabs-only Note', note: '\t\t', separator: '\n\n' },
  { name: 'whitespace-only Note with final newlines', note: ' \t\n\n\n', separator: '' },
  { name: 'CRLF Note without final newline', note: 'First\r\nSecond', separator: '\r\n\r\n' },
  { name: 'one final CRLF', note: 'Note\r\n', separator: '\r\n' },
  { name: 'multiple final CRLFs', note: 'Note\r\n\r\n\r\n', separator: '' },
  { name: 'one final CR', note: 'Note\r', separator: '\r' },
  { name: 'Unicode and whitespace', note: '  メモ 😀  \n\n', separator: '' },
  { name: 'empty Note', note: '', separator: '' },
];

for (const { name, note, separator } of cases) {
  test('append preserves ' + name + ' byte-for-byte', async () => {
    const expected = note + separator + block;
    const result = mergeAnnotationSafe(note, 'cat, blue sky');
    assertSameBytes(result, expected);
    assertSameBytes(result.slice(0, note.length), note);
    assertSameBytes(mergeAnnotationSafe(result, 'cat, blue sky'), expected);

    // Cover both append-tags and replace-tags batch paths, including persistence.
    for (const append of [true, false]) {
      const saved = [];
      const item = {
        tags: ['manual'], annotation: note,
        async save() { saved.push({ tags: this.tags.slice(), annotation: this.annotation }); },
      };
      await applyTagsToItem(item, ['cat', 'blue sky'], { append, writeAnnotation: true });
      assert.equal(saved.length, 1);
      assertSameBytes(saved[0].annotation, expected);
      assert.deepEqual(Array.from(saved[0].tags), append ? ['manual', 'cat', 'blue sky'] : ['cat', 'blue sky']);
    }
  });
}

test('replace changes only the existing Tagia block', () => {
  const before = '    Intro  \r\n\r\n';
  const after = '\r\n  Final line  \r\n\r\n\r\n';
  const previous = before + '<!-- Tagia -->\r\nold\r\n<!-- /Tagia -->' + after;
  const result = mergeAnnotationSafe(previous, 'cat, blue sky');
  assertSameBytes(result, before + block + after);
  assertSameBytes(result.slice(0, before.length), before);
  assertSameBytes(result.slice(-after.length), after);
});

test('replacement inserts dollar characters literally', () => {
  const previous = '  Before\n<!-- Tagia -->\nold\n<!-- /Tagia -->\nAfter  \n';
  const tags = "$&, $$, $`, $'";
  assertSameBytes(mergeAnnotationSafe(previous, tags),
    '  Before\n<!-- Tagia -->\n' + tags + '\n<!-- /Tagia -->\nAfter  \n');
});

test('absent Note receives only the block', () => {
  for (const note of [null, undefined]) assertSameBytes(mergeAnnotationSafe(note, 'cat, blue sky'), block);
});

test('batch writes preserve Notes when annotation is disabled or tags are empty', async () => {
  const note = '    Note  \n\n\n';
  for (const [tags, writeAnnotation] of [[['cat'], false], [[], true]]) {
    let savedNote;
    const item = { tags: [], annotation: note, async save() { savedNote = this.annotation; } };
    await applyTagsToItem(item, tags, { append: true, writeAnnotation });
    assertSameBytes(savedNote, note);
  }
});
