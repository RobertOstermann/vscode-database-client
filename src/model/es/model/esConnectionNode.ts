import { Global } from "@/common/global";
import { Util } from "@/common/util";
import { QueryGroup } from "@/model/query/queryGroup";
import { DbTreeDataProvider } from "@/provider/treeDataProvider";
import { QueryUnit } from "@/service/queryUnit";
import compareVersions from 'compare-versions';
import * as path from "path";
import { ExtensionContext, ThemeIcon, TreeItemCollapsibleState } from "vscode";
import { ConfigKey, Constants, ModelType } from "../../../common/constants";
import { ConnectionManager } from "../../../service/connectionManager";
import { CommandKey, Node } from "../../interface/node";
import { EsIndexGroup } from "./esIndexGroupNode";
import { EsTemplate } from "./esTemplate";
const extPackage=require("@/../package.json")

/**
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
 */
export class EsConnectionNode extends Node {

    public iconPath: string|ThemeIcon = path.join(Constants.RES_PATH, "icon/elasticsearch.svg");
    public contextValue: string = ModelType.ES_CONNECTION;
    constructor(readonly key: string, readonly parent: Node) {
        super(key)
        this.init(parent)
        if(compareVersions(extPackage.version,'3.6.6')===1){
            this.label = (this.usingSSH) ? `${this.ssh.host}@${this.ssh.port}` : `${this.host.replace(/(http:\/\/|https:\/\/)/,'')}`;
        }else{
            this.label = (this.usingSSH) ? `${this.ssh.host}@${this.ssh.port}` : `${this.host}@${this.port}`;
        }

        if (parent.name) {
            this.name = parent.name
            const preferName = Global.getConfig(ConfigKey.PREFER_CONNECTION_NAME, true)
            preferName ? this.label = parent.name : this.description = parent.name;
        }
        
        this.cacheSelf()
        const lcp = ConnectionManager.activeNode;

        if (this.disable) {
            this.collapsibleState = TreeItemCollapsibleState.None;
            this.description=(this.description||'')+" closed"
            return;
        }

        if (EsConnectionNode.versionMap[this.key]) {
            this.description = EsConnectionNode.versionMap[this.key]
        } else {
            this.execute<any>('get /').then(res => {
                this.description=res.version.number
                EsConnectionNode.versionMap[this.key]=this.description
                DbTreeDataProvider.refresh(this)
            }).catch(err=>{
                console.log(err)
            })
        }

        const basePath = Constants.RES_PATH + "/icon/server/";
        this.iconPath = basePath + (this.isActive(lcp) ? "elasticsearch_active.svg": "elasticsearch.svg" );

    }


    newQuery() {
        QueryUnit.showSQLTextDocument(this,EsTemplate.query,`${this.host.replace(/^(http|https):/,'').replace(/\//g,'')}.es`)
        ConnectionManager.changeActive(this)
    }

    async getChildren(): Promise<Node[]> {

        return [new EsIndexGroup(this),new QueryGroup(this)]

    }

    public copyName() {
        Util.copyToBoard(this.usingSSH ? this.ssh.host : this.host)
    }

    public async deleteConnection(context: ExtensionContext) {

        Util.confirm(`Are you want to Remove Connection ${this.label} ? `, async () => {
            this.indent({command:CommandKey.delete})
        })

    }

}