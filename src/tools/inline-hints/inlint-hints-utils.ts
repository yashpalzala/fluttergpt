import * as vscode from 'vscode';
import { CacheManager } from '../../utilities/cache-manager';
import * as os from 'os';


export async function activateInlineHints(cacheManager: CacheManager) {
    const completionDecoration = vscode.window.createTextEditorDecorationType({
        cursor: 'pointer',
        after: {
            contentText: getCompletionInlineHintText(),
            color: 'gray',
            fontStyle: 'italic',
            fontWeight: 'bold',
        },
    });

    vscode.workspace.onDidChangeTextDocument(async event => {
        const inlineCount = await cacheManager.getInlineCompletionCount();

        if (event.document.languageId === 'dart') {
            const activeEditor = vscode.window.activeTextEditor!;

            // Remove decorations after any change in the document
            activeEditor.setDecorations(completionDecoration, []);

            const currentLine = activeEditor.selection.active.line;
            const totalLines = activeEditor.document.lineCount;
            
            if(currentLine+1>=totalLines) {return ;}
            // Check if there's text on the first line
            const lineText = activeEditor.document.lineAt(currentLine + 1).text.trim();
            // check if the previous line is a comment
            const isComment = activeEditor.document.lineAt(currentLine).text.trim().startsWith('//');

            // If the user has not used inline completion for 5 times, show hint for the same
            if (inlineCount < 5) {
                if (lineText.length === 0) {
                    if (isComment || await isFirstLineOfSymbol(activeEditor)) {
                        // Set decoration on the current line
                        const range = new vscode.Range(currentLine + 1, activeEditor.document.lineAt(currentLine).range.end.character, currentLine + 1, activeEditor.document.lineAt(currentLine).range.end.character);
                        activeEditor.setDecorations(completionDecoration, [{ range }]);
                    }
                }
            }
        }
    });
}


export async function isFirstLineOfSymbol(editor: vscode.TextEditor): Promise<boolean> {
    const cursorLine = editor.selection.active.line;

    // Retrieve the document symbols
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', editor.document.uri);
    const flatSymbols: vscode.DocumentSymbol[] = [];

    // Flatten the symbol tree into an array
    function flattenSymbol(symbol: vscode.DocumentSymbol) {
        flatSymbols.push(symbol);
        if (symbol.children && symbol.children.length > 0) {
            symbol.children.forEach(child => flattenSymbol(child));
        }
    }

    if (symbols) {
        symbols.forEach(symbol => flattenSymbol(symbol));
    }

    // Check if the cursor is at the first line of a method, function, or class
    for (const symbol of flatSymbols) {
        if (symbol.kind === vscode.SymbolKind.Method || symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Class) {
            if (symbol.range.start.line === cursorLine) {
                return true;
            }
        }
    }

    return false;
}

function getCompletionInlineHintText(): string {
    const platform = os.platform();
    let hintText = 'Use (⌘) + (→) to auto complete using FlutterGPT';

    if (platform === 'win32') {
        hintText = 'Use (ctrl) + (→) to auto complete using FlutterGPT';
    } else if (platform === 'darwin') {
        hintText = 'Use (⌘) + (→) to auto complete using FlutterGPT';
    } else if (platform === 'linux') {
        hintText = 'Use (ctrl) + (→) to auto complete using FlutterGPT';
    }
    return hintText;
}
