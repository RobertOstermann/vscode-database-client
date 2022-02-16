import * as vscode from "vscode";
import { Pattern } from "../../../common/constants";
import { Util } from "../../../common/util";
import { ColumnNode } from "../../../model/other/columnNode";
import { ConnectionManager } from "../../../service/connectionManager";
import { ComplectionChain, ComplectionContext } from "../complectionContext";

export class ColumnChain implements ComplectionChain {

    private needStop = true;
    public async getComplection(context: ComplectionContext): Promise<vscode.CompletionItem[]> {

        if (ConnectionManager.tryGetConnection() == null) {
            return []
        }

        if (context.currentToken?.content === ".") {
            let subComplectionItems = await this.generateColumnComplectionItem(context.previousToken?.content);
            if (subComplectionItems != null && subComplectionItems.length > 0) { this.needStop = true }
            const tableReg = new RegExp(`${Pattern.TABLE_PATTERN}(?=${Pattern.ALIAS_PATTERN}\\b${context.previousToken?.content}\\b)`, "ig");
            let result = tableReg.exec(context.sqlBlock.sql);
            while (result != null && subComplectionItems.length === 0) {
                subComplectionItems = await this.generateColumnComplectionItem(
                    Util.getTableName(result[0], Pattern.TABLE_PATTERN)
                );
                this.needStop = true;
                if (subComplectionItems.length > 0) {
                    break;
                }
                result = tableReg.exec(context.sqlBlock.sql);
            }
            return subComplectionItems;
        }

        const updateTableName = Util.getTableName(context.sqlBlock.sql, Pattern.TABLE_PATTERN)
        if (updateTableName) {
            this.needStop = false;
            return await this.generateColumnComplectionItem(updateTableName);
        }

        return null;
    }

    public stop(): boolean {
        return this.needStop;
    }

    private async generateColumnComplectionItem(tableName: string): Promise<vscode.CompletionItem[]> {

        if (!tableName) {
            return [];
        }

        let lcp = ConnectionManager.tryGetConnection()

        const tableSplit = tableName.split(".")
        if (tableSplit.length == 2) {
            const connectcionid = lcp?.getUid({ schema: tableSplit[0], withSchema: true });
            lcp = ColumnNode.nodeCache[connectcionid]
            tableName = tableSplit[1]
        }

        let columnNodes = (await lcp?.getByRegion(tableName)?.getChildren()) as ColumnNode[];
        if (!columnNodes) {
            return []
        }

        return columnNodes.map<vscode.CompletionItem>((columnNode) => {
            const completionItem = new vscode.CompletionItem(columnNode.label);
            completionItem.detail = columnNode.description as string
            completionItem.insertText = columnNode.column.name
            completionItem.kind = vscode.CompletionItemKind.Field;
            return completionItem;
        });
    }

}
