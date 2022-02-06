import { Console } from "@/common/Console";
import { ConfigKey, Constants, ModelType } from "@/common/constants";
import { Global } from "@/common/global";
import { RedisDBMeta } from "@/common/typeDef";
import { Util } from "@/common/util";
import { ViewManager } from "@/common/viewManager";
import { CommandKey, Node } from "@/model/interface/node";
import { NodeUtil } from "@/model/nodeUtil";
import { DbTreeDataProvider } from "@/provider/treeDataProvider";
import { Cluster, Redis } from "ioredis";
import * as path from "path";
import * as vscode from "vscode";
import RedisBaseNode from "./redisBaseNode";
import { RedisDbNode } from "./redisDbNode";
var commandExistsSync = require('command-exists').sync;

export class RedisConnectionNode extends RedisBaseNode {

    contextValue = ModelType.REDIS_CONNECTION;
    iconPath: string | vscode.ThemeIcon = path.join(Constants.RES_PATH, `image/redis_connection.png`);

    constructor(readonly key: string, readonly parent: Node) {
        super(key)
        this.init(parent)
        this.label = (this.usingSSH) ? `${this.ssh.host}@${this.ssh.port}` : `${this.host}@${this.port}`;
        if (parent.name) {
            this.name = parent.name
            const preferName = Global.getConfig(ConfigKey.PREFER_CONNECTION_NAME, true)
            preferName ? this.label = parent.name : this.description = parent.name;
        }
        if (this.disable) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.None;
            this.description = (this.description || '') + " closed"
            return;
        }
        const version = RedisConnectionNode.versionMap[this.key]
        if (version) {
            this.description = (this.description || '') + " " + version
        }
        this.getVerison()
    }

    async getChildren(): Promise<RedisBaseNode[]> {
        const client = await this.getClient();
        const keyspace = await client.info('keyspace');
        let dbs: RedisDBMeta[] = keyspace.split('\n')
            .filter(line => line.trim().startsWith('db'))
            .map(line => {
                const [db, infos] = line.trim().split(':', 2);
                const infoList = infos.split(',').map(i => i.split('='));

                return { name: db.replace('db', ''), ...Object.fromEntries(infoList) };
            });

        if (!dbs.length) {
            return [new RedisDbNode({ name: this.database || "0" }, this)];
        }
        if (this.database && !dbs.filter(db => db.name == this.database).length) {
            dbs.unshift({ name: this.database });
        }
        return dbs.map(db => new RedisDbNode(db, this));
    }

    async openTerminal(): Promise<any> {
        if (!this.password && commandExistsSync('redis-cli')) {
            super.openTerminal();
            return;
        }
        const client = await this.getClient()
        if (client instanceof Cluster) {
            vscode.window.showErrorMessage("Redis cluster not support open internal terminal!")
            return;
        }
        ViewManager.createWebviewPanel({
            splitView: true, title: `${this.host}@${this.port}`, preserveFocus: false,
            iconPath: {
                light: Util.getExtPath("image", "redis_connection.png"),
                dark: Util.getExtPath("image", "redis_connection.png"),
            }, path: "app",
            eventHandler: (handler) => {
                handler.on("init", () => {
                    handler.emit("route", 'terminal')
                }).on("route-terminal", async () => {
                    handler.emit("config", NodeUtil.removeParent(this))
                }).on("exec", async (content) => {
                    if (!content) {
                        return;
                    }
                    const splitCommand: string[] = content.replace(/ +/g, " ").split(' ')
                    const command = splitCommand.shift()
                    const reply = await (client as Redis).send_command(command, splitCommand)
                    handler.emit("result", reply)
                }).on("exit", () => {
                    handler.panel.dispose()
                })
            }
        })
    }

    async getVerison() {
        if (RedisConnectionNode.versionMap[this.key]) return;
        const client = await this.getClient()
        client.info('Server').then(info => {
            const version = info.match(/redis_version:(.+)/)[1]
            this.description = " " + version;
            RedisConnectionNode.versionMap[this.key] = version
            DbTreeDataProvider.refresh(this)
        })
    }

    async showStatus(): Promise<any> {
        const client = await this.getClient()
        client.info((err, reply) => {
            ViewManager.createWebviewPanel({
                title: "Redis Server Status", splitView: false,
                path: "app",
                eventHandler: (handler) => {
                    handler.on("init", () => {
                        handler.emit("route", 'redisStatus')
                    }).on("route-redisStatus", async () => {
                        handler.emit("info", reply)
                    })
                }
            })
        })
    }

    public copyName() {
        Util.copyToBoard(this.host)
    }

    public async deleteConnection(context: vscode.ExtensionContext) {

        Util.confirm(`Are you want to Remove Connection ${this.label} ? `, async () => {
            this.indent({ command: CommandKey.delete })
        })

    }

}

