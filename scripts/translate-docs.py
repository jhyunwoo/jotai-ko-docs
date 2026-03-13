#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
from functools import lru_cache
from pathlib import Path

os.environ.setdefault('translators_default_region', 'EN')

import translators as ts


ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / 'translation-manifest.json'
PLACEHOLDER_PREFIX = '⟦'
INLINE_CODE_RE = re.compile(r'(`+)(.+?)\1')
LINK_RE = re.compile(r'(!?)\[([^\]]+)\]\(([^)]+)\)')
HTML_TAG_RE = re.compile(r'<[^>\n]+>')
URL_RE = re.compile(r'https?://[^\s)]+')

EXACT_TEXT_OVERRIDES = {
  'Documentation': '문서',
  'Table of contents': '목차',
  'Features': '특징',
  'Core': '핵심',
  'Utilities': '유틸리티',
  'Extensions': '확장',
  'Third-party': '서드파티',
  'Tools': '도구',
  'Basics': '기초',
  'Guides': '가이드',
  'Recipes': '레시피',
  'Hydration': '하이드레이션',
  'Sync with router': '라우터와 동기화',
  'Examples': '예제',
  'How to use Jotai with Next.js': 'Jotai를 Next.js와 함께 사용하는 방법',
  'Provider': 'Provider',
  'Store': 'Store',
  'atom': 'atom',
  'useAtom': 'useAtom',
  'Cache': '캐시',
}


def load_manifest() -> dict:
  return json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))


def split_frontmatter(content: str) -> tuple[list[str] | None, str]:
  if not content.startswith('---\n'):
    return None, content
  end = content.find('\n---\n', 4)
  if end == -1:
    return None, content
  frontmatter = content[4:end].splitlines()
  body = content[end + 5 :]
  return frontmatter, body


@lru_cache(maxsize=10000)
def bing_translate(text: str) -> str:
  last_error = None
  for _ in range(5):
    try:
      return ts.translate_text(
        text,
        translator='bing',
        from_language='en',
        to_language='ko',
      )
    except Exception as error:  # noqa: BLE001
      last_error = error
  raise RuntimeError(f'Failed to translate text: {last_error}') from last_error


@lru_cache(maxsize=10000)
def translate_plain(text: str) -> str:
  if not text or not re.search(r'[A-Za-z]', text):
    return text

  stripped = text.strip()
  if not stripped:
    return text

  leading = text[: len(text) - len(text.lstrip())]
  trailing = text[len(text.rstrip()) :]
  core = text[len(leading) : len(text) - len(trailing)]

  if not re.search(r'[A-Za-z]', core):
    return text

  if core in EXACT_TEXT_OVERRIDES:
    return f'{leading}{EXACT_TEXT_OVERRIDES[core]}{trailing}'

  pieces = []
  buffer = []
  current_length = 0
  for line in core.split('\n'):
    if current_length + len(line) + 1 > 400:
      pieces.append('\n'.join(buffer))
      buffer = [line]
      current_length = len(line)
    else:
      buffer.append(line)
      current_length += len(line) + 1
  if buffer:
    pieces.append('\n'.join(buffer))

  translated = ''.join(
    bing_translate(piece) if piece.strip() else piece for piece in pieces
  )
  return f'{leading}{translated}{trailing}'


def replace_with_placeholders(text: str) -> tuple[str, dict[str, str]]:
  replacements: dict[str, str] = {}
  index = 0

  def add_placeholder(value: str) -> str:
    nonlocal index
    key = f'{PLACEHOLDER_PREFIX}{index}⟧'
    replacements[key] = value
    index += 1
    return key

  def replace_links(source: str) -> str:
    def _repl(match: re.Match[str]) -> str:
      bang, label, target = match.groups()
      translated_label = translate_inline_text(label)
      return add_placeholder(f'{bang}[{translated_label}]({target})')

    return LINK_RE.sub(_repl, source)

  processed = replace_links(text)
  processed = INLINE_CODE_RE.sub(lambda m: add_placeholder(m.group(0)), processed)
  processed = HTML_TAG_RE.sub(lambda m: add_placeholder(m.group(0)), processed)
  processed = URL_RE.sub(lambda m: add_placeholder(m.group(0)), processed)
  return processed, replacements


def restore_placeholders(text: str, replacements: dict[str, str]) -> str:
  for key, value in replacements.items():
    text = text.replace(key, value)
  return text


def translate_inline_text(text: str) -> str:
  if not re.search(r'[A-Za-z]', text):
    return text
  protected, replacements = replace_with_placeholders(text)
  translated = translate_plain(protected)
  return restore_placeholders(translated, replacements)


def translate_table_line(line: str) -> str:
  if re.fullmatch(r'[\s|:-]+', line):
    return line
  leading_pipe = line.startswith('|')
  trailing_pipe = line.endswith('|')
  parts = line.split('|')
  translated_parts = []
  for part in parts:
    stripped = part.strip()
    if stripped:
      translated_parts.append(part.replace(stripped, translate_inline_text(stripped), 1))
    else:
      translated_parts.append(part)
  joined = '|'.join(translated_parts)
  if leading_pipe and not joined.startswith('|'):
    joined = f'|{joined}'
  if trailing_pipe and not joined.endswith('|'):
    joined = f'{joined}|'
  return joined


def translate_markdown_line(line: str) -> str:
  if not line.strip():
    return line

  stripped = line.lstrip()
  if stripped.startswith('<'):
    return line
  if re.match(r'^\s*[-*]{3,}\s*$', line):
    return line
  if re.match(r'^\s*```', line):
    return line

  match = re.match(r'^(\s*>+\s*)(.*)$', line)
  if match:
    prefix, rest = match.groups()
    if not rest:
      return line
    heading_match = re.match(r'^(#{1,6}\s+)(.*)$', rest)
    if heading_match:
      heading_prefix, heading_text = heading_match.groups()
      return f'{prefix}{heading_prefix}{translate_inline_text(heading_text)}'
    return f'{prefix}{translate_inline_text(rest)}'

  match = re.match(r'^(\s{0,3}#{1,6}\s+)(.*)$', line)
  if match:
    prefix, rest = match.groups()
    return f'{prefix}{translate_inline_text(rest)}'

  match = re.match(r'^(\s*([-*+]|\d+\.)\s+)(.*)$', line)
  if match:
    prefix, _, rest = match.groups()
    return f'{prefix}{translate_inline_text(rest)}'

  if stripped.startswith('|'):
    return translate_table_line(line)

  return translate_inline_text(line)


def is_plain_text_line(line: str) -> bool:
  if not line.strip():
    return False
  stripped = line.lstrip()
  return not (
    stripped.startswith('<')
    or stripped.startswith('|')
    or re.match(r'^\s{0,3}#{1,6}\s+', line)
    or re.match(r'^(\s*>+\s*)', line)
    or re.match(r'^(\s*([-*+]|\d+\.)\s+)', line)
    or re.match(r'^\s*[-*]{3,}\s*$', line)
    or re.match(r'^\s*```', line)
    or re.match(r'^\s*~~~', line)
  )


def translate_comment_text(text: str) -> str:
  trimmed = text.strip()
  if not trimmed or not re.search(r'[A-Za-z]', trimmed):
    return text
  leading = text[: len(text) - len(text.lstrip())]
  trailing = text[len(text.rstrip()) :]
  core = text[len(leading) : len(text) - len(trailing)]
  translated = translate_inline_text(core)
  return f'{leading}{translated}{trailing}'


def translate_code_line(line: str) -> str:
  comment_line_patterns = [
    re.compile(r'^(\s*//\s?)(.*)$'),
    re.compile(r'^(\s*#\s)(.*)$'),
    re.compile(r'^(\s*--\s?)(.*)$'),
    re.compile(r'^(\s*/\*\*\s?)(.*?)(\s*\*/\s*)$'),
    re.compile(r'^(\s*/\*\s?)(.*?)(\s*\*/\s*)$'),
    re.compile(r'^(\s*\*\s?)(.*)$'),
    re.compile(r'^(\s*<!--\s?)(.*?)(\s*-->\s*)$'),
  ]
  for pattern in comment_line_patterns:
    match = pattern.match(line)
    if not match:
      continue
    groups = match.groups()
    if len(groups) == 2:
      prefix, comment = groups
      return f'{prefix}{translate_comment_text(comment)}'
    prefix, comment, suffix = groups
    return f'{prefix}{translate_comment_text(comment)}{suffix}'

  if ' //' in line and 'http://' not in line and 'https://' not in line:
    prefix, comment = line.split(' //', 1)
    return f'{prefix} //{translate_comment_text(comment)}'

  return line


def translate_body(body: str) -> str:
  lines = body.splitlines()
  translated_lines: list[str] = []
  in_code = False
  fence = ''
  in_mdx_block = False
  paragraph_buffer: list[str] = []

  def flush_paragraph_buffer() -> None:
    nonlocal paragraph_buffer
    if not paragraph_buffer:
      return
    translated_block = translate_inline_text('\n'.join(paragraph_buffer))
    translated_lines.extend(translated_block.split('\n'))
    paragraph_buffer = []

  for line in lines:
    fence_match = re.match(r'^(\s*)(```|~~~)', line)
    if fence_match:
      flush_paragraph_buffer()
      if not in_code:
        in_code = True
        fence = fence_match.group(2)
      elif line.strip().startswith(fence):
        in_code = False
        fence = ''
      translated_lines.append(line)
      continue

    if in_code:
      translated_lines.append(translate_code_line(line))
      continue

    stripped = line.strip()
    if in_mdx_block:
      translated_lines.append(line)
      if stripped.endswith('/>') or stripped.startswith('</'):
        in_mdx_block = False
      continue

    if stripped.startswith('<') and not stripped.startswith('<!--'):
      flush_paragraph_buffer()
      translated_lines.append(line)
      if not stripped.endswith('/>') and not stripped.startswith('</'):
        in_mdx_block = True
      continue

    if is_plain_text_line(line):
      paragraph_buffer.append(line)
      continue

    flush_paragraph_buffer()
    translated_lines.append(translate_markdown_line(line))

  flush_paragraph_buffer()
  output = '\n'.join(translated_lines)
  if body.endswith('\n'):
    output += '\n'
  return output


def translate_frontmatter(lines: list[str]) -> list[str]:
  translated = []
  for line in lines:
    if line.startswith('title:'):
      _, value = line.split(':', 1)
      translated.append(f'title: {translate_inline_text(value.strip())}')
      continue
    if line.startswith('description:'):
      _, value = line.split(':', 1)
      translated.append(f'description: {translate_inline_text(value.strip())}')
      continue
    translated.append(line)
  return translated


def translate_file(path: Path) -> None:
  original = path.read_text(encoding='utf-8')
  frontmatter, body = split_frontmatter(original)
  translated_body = translate_body(body)

  if frontmatter is None:
    path.write_text(translated_body, encoding='utf-8')
    return

  translated_frontmatter = translate_frontmatter(frontmatter)
  output = '---\n' + '\n'.join(translated_frontmatter) + '\n---\n' + translated_body
  path.write_text(output, encoding='utf-8')


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument(
    '--only',
    nargs='*',
    help='Specific docs/* paths to translate. Defaults to all files in translation-manifest.json.',
  )
  args = parser.parse_args()

  manifest = load_manifest()
  files = args.only or manifest['files']

  for relative_file in files:
    translate_file(ROOT / relative_file)
    print(relative_file, flush=True)


if __name__ == '__main__':
  main()
