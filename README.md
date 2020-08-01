# inkdrop preview finder

Provides finder in preview.

- open finder by `preview-finder:open`.
- input word and hit enter key.
- find next(or prev) word by `preview-finder:next` or `preview-finder:prev`.

![Screenshot](https://raw.githubusercontent.com/basyura/inkdrop-preview-finder/master/images/screenshot.png)

## Install

```
ipm install preview-finder
```

## Keybindings

| Command             | Explanation |
| ------------------- | ----------- |
| preview-finder:open | open finder |
| preview-finder:next | find next   |
| preview-finder:prev | find prev   |

keymap.cson

```cson
'.mde-preview':
    '/': 'preview-finder:open'
    'n': 'preview-finder:next'
    'N': 'preview-finder:prev'
```
