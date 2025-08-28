import * as vscode from 'vscode';
import fs from "fs";
import path from "path";

// Interface for better type safety
interface BookMemory {
	[key: string]: number;
}

interface BookFile {
	name: string;
	pathUrl: string;
}

// Timer for auto-scrolling
let autoScrollTimer: NodeJS.Timeout | null = null;
let autoScrollInterval = 500; // Default 0.5s

export function activate(context: vscode.ExtensionContext) {
	// Read configuration
	const config = vscode.workspace.getConfiguration('g-reader');
	const bookResource = config.get<string>('resource') as string;
	const textCount = config.get<number>('textCount') as number;

	if (!bookResource) {
		vscode.window.showErrorMessage('请配置书籍资源文件夹路径');
		return;
	}

	if (!fs.existsSync(bookResource)) {
		vscode.window.showErrorMessage(`请配置正确的资源文件夹路径: ${bookResource}`);
		return;
	}

	// Create status bar item
	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);

	// Set content
	statusBarItem.text = 'g-reader text area';
	statusBarItem.tooltip = 'This is g-reader';

	// Click command
	statusBarItem.command = 'g-reader.toggleAutoScroll';

	// Show status bar item
	statusBarItem.show();

	// Add to subscriptions for automatic cleanup
	context.subscriptions.push(statusBarItem);

	// Register previous page command
	context.subscriptions.push(
		vscode.commands.registerCommand('g-reader.previous', () => {
			try {
				const bookMemory: BookMemory = JSON.parse(context.globalState.get<string>('bookMemory') || '{}');
				const currentBook = context.globalState.get<string>('currentBook');
				if (!currentBook) {
					vscode.window.showInformationMessage('请先选择一本书籍');
					return;
				}

				const currentPosition = bookMemory[currentBook] || 0;
				// Move back by textCount, but not below 0
				bookMemory[currentBook] = Math.max(0, currentPosition - textCount);
				context.globalState.update('bookMemory', JSON.stringify(bookMemory));
				updateStatusBar(context, statusBarItem, bookResource, textCount);
			} catch (error) {
				vscode.window.showErrorMessage(`更新阅读位置时出错: ${error}`);
			}
		})
	);

	// Register next page command
	context.subscriptions.push(
		vscode.commands.registerCommand('g-reader.next', () => {
			try {
				const bookMemory: BookMemory = JSON.parse(context.globalState.get<string>('bookMemory') || '{}');
				const currentBook = context.globalState.get<string>('currentBook');
				if (!currentBook) {
					vscode.window.showInformationMessage('请先选择一本书籍');
					return;
				}

				bookMemory[currentBook] = bookMemory[currentBook] ? bookMemory[currentBook] + textCount : textCount;
				context.globalState.update('bookMemory', JSON.stringify(bookMemory));
				updateStatusBar(context, statusBarItem, bookResource, textCount);
			} catch (error) {
				vscode.window.showErrorMessage(`更新阅读位置时出错: ${error}`);
			}
		})
	);

	// Register jump to position command
	context.subscriptions.push(
		vscode.commands.registerCommand('g-reader.jumpToPosition', async () => {
			try {
				const currentBook = context.globalState.get<string>('currentBook');
				if (!currentBook) {
					vscode.window.showInformationMessage('请先选择一本书籍');
					return;
				}

				// Get current position
				const bookMemory: BookMemory = JSON.parse(context.globalState.get<string>('bookMemory') || '{}');
				const currentPosition = bookMemory[currentBook] || 0;

				// Ask user for new position
				const newPositionStr = await vscode.window.showInputBox({
					prompt: '请输入要跳转到的位置',
					value: currentPosition.toString(),
					validateInput: (value: string) => {
						const num = parseInt(value, 10);
						if (isNaN(num) || num < 0) {
							return '请输入一个有效的非负整数';
						}
						return null;
					}
				});

				if (newPositionStr !== undefined) {
					const newPosition = parseInt(newPositionStr, 10);
					bookMemory[currentBook] = newPosition;
					await context.globalState.update('bookMemory', JSON.stringify(bookMemory));
					updateStatusBar(context, statusBarItem, bookResource, textCount);
					vscode.window.showInformationMessage(`已跳转到位置 ${newPosition}`);
				}
			} catch (error) {
				vscode.window.showErrorMessage(`跳转位置时出错: ${error}`);
			}
		})
	);

	// Register start auto-scroll command
	context.subscriptions.push(
		vscode.commands.registerCommand('g-reader.startAutoScroll', () => {
			// Clear existing timer if any
			if (autoScrollTimer) {
				clearInterval(autoScrollTimer);
			}
			autoScrollInterval = context.globalState.get('autoScrollInterval', 500);

			// Start new timer
			autoScrollTimer = setInterval(() => {
				try {
					const bookMemory: BookMemory = JSON.parse(context.globalState.get<string>('bookMemory') || '{}');
					const currentBook = context.globalState.get<string>('currentBook');
					if (!currentBook) {
						// Stop timer if no book is selected
						if (autoScrollTimer) {
							clearInterval(autoScrollTimer);
							autoScrollTimer = null;
						}
						return;
					}

					bookMemory[currentBook] = bookMemory[currentBook] ? bookMemory[currentBook] + textCount : textCount;
					context.globalState.update('bookMemory', JSON.stringify(bookMemory));
					updateStatusBar(context, statusBarItem, bookResource, textCount);
				} catch (error) {
					vscode.window.showErrorMessage(`自动滚动时出错: ${error}`);
					// Stop timer on error
					if (autoScrollTimer) {
						clearInterval(autoScrollTimer);
						autoScrollTimer = null;
					}
				}
			}, autoScrollInterval);

			vscode.window.showInformationMessage(`已开始自动滚动，间隔 ${autoScrollInterval}ms`);
		})
	);

	// Register toggle auto-scroll command
	context.subscriptions.push(
		vscode.commands.registerCommand('g-reader.toggleAutoScroll', () => {
			if (autoScrollTimer) {
				clearInterval(autoScrollTimer);
				autoScrollTimer = null;
				vscode.window.showInformationMessage('已停止自动滚动');
			} else {
				vscode.commands.executeCommand('g-reader.startAutoScroll');
				vscode.window.showInformationMessage('已开始自动滚动');
			}
		})
	);

	// Register command to increase auto-scroll interval
	context.subscriptions.push(
		vscode.commands.registerCommand('g-reader.increaseScrollInterval', () => {
			autoScrollInterval += 100;
			context.globalState.update('autoScrollInterval', autoScrollInterval);
			vscode.window.showInformationMessage(`自动滚动间隔已增加至 ${autoScrollInterval}ms`);

			// If timer is running, restart it with new interval
			if (autoScrollTimer) {
				vscode.commands.executeCommand('g-reader.startAutoScroll');
			}
		})
	);

	// Register command to decrease auto-scroll interval
	context.subscriptions.push(
		vscode.commands.registerCommand('g-reader.decreaseScrollInterval', () => {
			autoScrollInterval = Math.max(100, autoScrollInterval - 100);
			context.globalState.update('autoScrollInterval', autoScrollInterval);
			vscode.window.showInformationMessage(`自动滚动间隔已减少至 ${autoScrollInterval}ms`);

			// If timer is running, restart it with new interval
			if (autoScrollTimer) {
				vscode.commands.executeCommand('g-reader.startAutoScroll');
			}
		})
	);

	// Register WebviewViewProvider
	const provider = new GReadProvider(context, statusBarItem, bookResource);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(GReadProvider.viewType, provider)
	);

	// Initial update
	provider.updateList();

	// Update status bar on activation
	updateStatusBar(context, statusBarItem, bookResource, textCount);
}

// Must export deactivate function
export function deactivate() {
	// Clear timer when extension is deactivated
	if (autoScrollTimer) {
		clearInterval(autoScrollTimer);
	}
}

// Define WebviewViewProvider
class GReadProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'g-reader'; // Must match view id in package.json

	private _view?: vscode.WebviewView;
	private readonly _extensionUri: vscode.Uri;
	private _viewReady = false;
	private _cachedUpdate: any = null;

	constructor(
		private context: vscode.ExtensionContext,
		private statusBarItem: vscode.StatusBarItem,
		private bookResource: string
	) {
		this._extensionUri = context.extensionUri;
	}

	// Called when VS Code needs to create WebView content
	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		// Configure WebView options
		webviewView.webview.options = {
			// Allow WebView scripts to run
			enableScripts: true,
			// Define resource loading root paths
			localResourceRoots: [this._extensionUri]
		};

		// Set WebView's initial HTML content
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Update list when WebView view is loaded
		this.updateList();

		// Handle messages from WebView
		webviewView.webview.onDidReceiveMessage(message => {
			switch (message.type) {
				case 'ready':
					// WebView is ready, send cached update
					this._viewReady = true;
					if (this._cachedUpdate) {
						this._view?.webview.postMessage(this._cachedUpdate);
						this._cachedUpdate = null;
					}
					break;
				case 'choose':
					this.chooseFile(message.value);
					break;
				case 'refresh':
					this.updateList();
					break;
			}
		});

		// Handle view visibility changes
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				this.updateList();
			}
		});
	}

	public updateList() {
		try {
			const files = fs.readdirSync(this.bookResource);
			const targetFiles = files.filter(file => path.extname(file).toLowerCase() === '.txt');
			const message = {
				type: 'update',
				value: JSON.stringify({
					files: targetFiles,
					currentFile: this.context.globalState.get('currentBook')
				})
			};

			if (this._viewReady) {
				// If WebView is ready, send message directly
				this._view?.webview.postMessage(message);
			} else {
				// Otherwise cache message to send when WebView is ready
				this._cachedUpdate = message;
			}
		} catch (error) {
			vscode.window.showErrorMessage(`更新书籍列表时出错: ${error}`);
		}
	}

	private async chooseFile(bookName: string) {
		try {
			await this.context.globalState.update('currentBook', bookName);
			// Reset position when switching books
			const bookMemory: BookMemory = JSON.parse(this.context.globalState.get<string>('bookMemory') || '{}');
			if (bookMemory[bookName]) {
				delete bookMemory[bookName];
				await this.context.globalState.update('bookMemory', JSON.stringify(bookMemory));
			}

			updateStatusBar(this.context, this.statusBarItem, this.bookResource,
				vscode.workspace.getConfiguration('g-reader').get<number>('textCount') as number);
			this.updateList();
		} catch (error) {
			vscode.window.showErrorMessage(`选择书籍时出错: ${error}`);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Get URIs for resources (CSS, JS, images)
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'index.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'style.css'));

		// Use nonce (one-time random number) to satisfy Content Security Policy
		const nonce = getNonce();

		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" 
                    content="default-src 'none'; 
                             img-src ${webview.cspSource} https:; 
                             script-src ${webview.cspSource} 'nonce-${nonce}';
                             style-src ${webview.cspSource};">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>Book Reader</title>
            </head>
            <body>
				<div class="flex-row-between">
					<h1>书籍列表</h1>
					<svg id="refresh" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Material Symbols Light by Google - https://github.com/google/material-design-icons/blob/master/LICENSE --><path fill="currentColor" d="M3.5 12q0-3.616 2.664-6.058T12.5 3.5v-.692q0-.242.217-.354t.43.03l2.163 1.62q.323.242.323.646t-.323.646l-2.164 1.62q-.212.142-.429.03t-.217-.354V6Q9.86 6 7.93 7.718T6 12q0 .883.247 1.713t.73 1.556q.217.323.167.69t-.348.583l-.407.298q-.373.293-.818.227t-.711-.444q-.668-1.017-1.014-2.2Q3.5 13.241 3.5 12m8 8.5v.692q0 .243-.217.354q-.217.112-.43-.03l-2.162-1.62q-.324-.242-.324-.646t.323-.646l2.164-1.62q.212-.142.429-.03t.217.354V18q2.64 0 4.57-1.718T18 12q0-.883-.247-1.722q-.247-.84-.73-1.566q-.217-.323-.167-.69t.348-.583l.407-.298q.373-.293.818-.225t.712.442q.661 1.036 1.01 2.21T20.5 12q0 3.616-2.664 6.058T11.5 20.5"/></svg>
				</div>
                
				<ul id="bookList">
				  
				</ul>
            </body>
			<script src="${scriptUri}" nonce="${nonce}"></script>
            </html>`;
	}
}

function updateStatusBar(
	context: vscode.ExtensionContext,
	statusBarItem: vscode.StatusBarItem,
	bookResource: string,
	textCount: number
) {
	try {
		const currentBook = context.globalState.get<string>('currentBook');
		if (!currentBook) {
			statusBarItem.text = '请选择一本书籍';
			return;
		}

		// Get book files
		const files = fs.readdirSync(bookResource);
		const targetFiles = files
			.filter(file => path.extname(file).toLowerCase() === '.txt')
			.map(file => ({ name: file, pathUrl: path.join(bookResource, file) }));

		const currentBookFile = targetFiles.find(file => file.name === currentBook);
		if (!currentBookFile) {
			statusBarItem.text = '书籍不存在';
			return;
		}

		// Get reading position
		const bookMemory: BookMemory = JSON.parse(context.globalState.get<string>('bookMemory') || '{}');
		const position = bookMemory[currentBook] || 0;

		// Read the file as UTF-8 text
		const content = fs.readFileSync(currentBookFile.pathUrl, 'utf-8');

		// Extract the text segment
		let text = '';
		if (position < content.length) {
			text = content.substring(position, position + textCount);
		}

		// Remove newlines and extra spaces
		text = text.replace(/\s+/g, ' ').trim();

		if (text.length === 0) {
			// Check if we're at the end of the file
			if (position >= content.length) {
				text = '--- 已达文件末尾 ---';
			} else {
				text = '----------';
			}
		}

		statusBarItem.text = text;
	} catch (error) {
		statusBarItem.text = '读取书籍出错';
		vscode.window.showErrorMessage(`读取书籍时出错: ${error}`);
	}
}

// Helper function to generate nonce
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}