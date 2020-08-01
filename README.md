# inkdrop preview finder

Provides finder in preview.

![Screenshot](https://raw.githubusercontent.com/basyura/inkdrop-preview-finder/master/images/screenshot.png)

## Install

```
ipm install preview-finder
```

## Keybindings

| Command                  | Explanation |
| ------------------------ | ----------- |
| preview-finder:open      | open finder |
| preview-finder:find-next | find next   |
| preview-finder:find-prev | find prev   |


keymap.cson

```cson
'.mde-preview':
    '/': 'preview-finder:open'
    'n': 'preview-finder:find-next'
    'N': 'preview-finder:find-prev'
```
