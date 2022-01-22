import { CacheKey, CodeCommand, DatabaseType } from "@/common/constants";
import { FileManager, FileModel } from "@/common/filesManager";
import { ConnectionManager } from "@/service/connectionManager";
import { join, resolve } from "path";
import { homedir, platform } from "os";
import * as vscode from 'vscode'
import { commands, Disposable, window, workspace } from "vscode";
import { Global } from "../../common/global";
import { Util } from "../../common/util";
import { ViewManager } from "../../common/viewManager";
import { ConnectionNode } from "../../model/database/connectionNode";
import { Node } from "../../model/interface/node";
import { NodeUtil } from "../../model/nodeUtil";
import { DbTreeDataProvider } from "../../provider/treeDataProvider";
import { SSHClientManager } from "../ssh/clientManager";
import { ConnnetionConfig } from "./config/connnetionConfig";
import { exists, existsSync, fstatSync, readFileSync, unlinkSync } from "fs";
import { GlobalState, WorkState } from "@/common/state";
import { localize } from "vscode-nls-i18n";
var commandExistsSync = require('command-exists').sync;

export class ConnectService {

    public async openConnect(provider: DbTreeDataProvider, connectionNode?: ConnectionNode) {
        let node: any;
        if (connectionNode) {
            node = { ...NodeUtil.removeParent(connectionNode), isGlobal: connectionNode.global }
            if (node.ssh) {
                node.ssh.tunnelPort = null
                if (!node.ssh.algorithms) {
                    node.ssh.algorithms = { cipher: [] }
                }
            }
        }
        let plat: string = platform();
        ViewManager.createWebviewPanel({
            path: "app", title: connectionNode ? localize('ext.view.edit') : localize('ext.view.connect'),
            splitView: false, iconPath: Global.getExtPath("resources", "icon", "connection.svg"),
            eventHandler: (handler) => {
                handler.on("init", () => {
                    handler.emit('route', 'connect')
                    handler.emit('language', vscode.env.language)
                }).on("route-connect", async () => {
                    if (node) {
                        handler.emit("edit", node)
                    } else {
                        handler.emit("connect")
                    }
                    const pkPath = join(homedir(), '.ssh', 'id_rsa')
                    handler.emit("option", {
                        sqliteState: plat == 'win32' ? true : commandExistsSync("sqlite") || commandExistsSync("sqlite3"),
                        hasPk: existsSync(pkPath), pkPath
                    })
                }).on("installSqlite", () => {
                    let command: string;
                    switch (plat) {
                        case 'darwin':
                            command = `brew install sqlite3`
                            break;
                        case 'linux':
                            if (commandExistsSync("apt")) {
                                command = `sudo apt -y install sqlite`;
                            } else if (commandExistsSync("yum")) {
                                command = `sudo yum -y install sqlite3`;
                            } else if (commandExistsSync("dnf")) {
                                command = `sudo dnf install sqlite` // Fedora
                            } else {
                                command = `sudo pkg install -y sqlite3` // freebsd
                            }
                            break;
                        default: return;
                    }
                    const terminal = window.createTerminal("installSqlite")
                    terminal.sendText(command)
                    terminal.show()
                }).on("connecting", async (data) => {
                    const connectionOption = data.connectionOption
                    const node: Node = Util.trim(NodeUtil.of(connectionOption))
                    try {
                        node.initKey();
                        await this.connect(node)
                        await provider.addConnection(node)
                        const { key, connectionKey } = node
                        handler.emit("success", { message: localize('ext.connect.success'), key, connectionKey })
                    } catch (err) {
                        if (err?.message) {
                            handler.emit("error", err.message)
                        } else {
                            handler.emit("error", err)
                        }
                    }
                }).on('copy', value => {
                    Util.copyToBoard(value)
                }).on("close", () => {
                    handler.panel.dispose()
                }).on("choose", ({ event, filters }) => {
                    let defaultUri: vscode.Uri;
                    if (event == "privateKey") {
                        defaultUri = vscode.Uri.file(homedir() + "/.ssh")
                    }
                    window.showOpenDialog({ filters, defaultUri }).then((uris) => {
                        if (uris && uris[0]) {
                            const uri = uris[0]
                            handler.emit("choose", { event, path: uri.fsPath })
                        }
                    })
                })
            }
        });
    }

    public async connect(connectionNode: Node): Promise<void> {
        if (connectionNode.dbType == DatabaseType.SSH) {
            connectionNode.ssh.key = connectionNode.key;
            await SSHClientManager.getSSH(connectionNode.ssh, { withSftp: false })
            return;
        }
        ConnectionManager.removeConnection(connectionNode.getConnectId())
        await ConnectionManager.getConnection(connectionNode)
    }

    static listenConfig(): Disposable {
        const workConfigPath = vscode.workspace.rootPath ? join(vscode.workspace.rootPath, '.vscode', 'datbase-client.json') : null
        const configPath = resolve(FileManager.getPath("config.json"))
        workspace.onDidCloseTextDocument(e => {
            const changePath = resolve(e.uri.fsPath);
            if (changePath == configPath) {
                unlinkSync(configPath)
            }
        })
        return workspace.onDidSaveTextDocument(e => {
            const changePath = resolve(e.uri.fsPath);
            if (changePath == configPath) {
                this.saveConfig(configPath)
            } else if (changePath == workConfigPath) {
                this.saveConfig(workConfigPath, true)
            }
        });
    }

    private static async saveConfig(path: string, isWork?: boolean) {
        const configContent = readFileSync(path, { encoding: 'utf8' })
        try {
            const connectonConfig: ConnnetionConfig = JSON.parse(configContent)
            if (isWork) {
                await WorkState.update(CacheKey.DATBASE_CONECTIONS, connectonConfig[CacheKey.DATBASE_CONECTIONS]);
                await WorkState.update(CacheKey.NOSQL_CONNECTION, connectonConfig[CacheKey.NOSQL_CONNECTION]);
            } else {
                await GlobalState.update(CacheKey.DATBASE_CONECTIONS, connectonConfig.database);
                await GlobalState.update(CacheKey.NOSQL_CONNECTION, connectonConfig.nosql);
                unlinkSync(path)
            }
            DbTreeDataProvider.refresh();
        } catch (error) {
            window.showErrorMessage("Parse connect config fail!")
        }
    }

    public openConfig() {

        const connectonConfig: ConnnetionConfig = {
            database: GlobalState.get(CacheKey.DATBASE_CONECTIONS),
            nosql: GlobalState.get(CacheKey.NOSQL_CONNECTION)
        };

        FileManager.record("config.json", JSON.stringify(connectonConfig, this.trim, 2), FileModel.WRITE).then(filePath => {
            FileManager.show(filePath)
        })

    }

    public trim(key: string, value: any): any {
        switch (key) {
            case "iconPath":
            case "contextValue":
            case "parent":
            case "key":
            case "label":
            case "id":
            case "resourceUri":
            case "pattern":
            case "level":
            case "tooltip":
            case "descriptionz":
            case "collapsibleState":
            case "terminalService":
            case "forwardService":
            case "file":
            case "parentName":
            case "connectionKey":
            case "sshConfig":
            case "fullPath":
            case "uid":
            case "command":
            case "dialect":
            case "provider":
            case "context":
            case "isGlobal":
                return undefined;
        }
        return value;
    }

}