# g-reader README

A simple VS Code extension that displays text content in the status bar for easy reading while coding.

## Features

- Display text files content directly in VS Code status bar
- Switch between different text files using the sidebar view
- Automatically saves your reading position for each file
- Clean and intuitive user interface
- Jump to specific position in the current book
- Previous and next page navigation
- Keyboard shortcuts for navigation
- Automatically activates when VS Code starts

## Requirements

- VS Code version 1.103.0 or higher
- Text files in .txt format

## Extension Settings

This extension contributes the following settings:

- `g-reader.resource`: Path to the folder containing your text files
- `g-reader.textCount`: Number of characters to display in the status bar (default: 10)

## How to Use

1. Set the `g-reader.resource` setting to point to a folder containing your .txt files
2. The extension automatically activates when VS Code starts
3. Open the g-reader sidebar view from the activity bar
4. Select a text file from the list
5. Use the "Previous page" or "Next page" commands, keyboard shortcuts, or click the status bar item to navigate through the text
6. Use the "Jump to position" command to go to a specific position in the current book

## Keyboard Shortcuts

- Next page: `Alt+Shift+]`
- Previous page: `Alt+Shift+[`

## Known Issues

- Only supports .txt files
- No search or navigation within files

## Release Notes

### 0.0.1

Initial release with basic reading functionality

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
- Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
- Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
