import { Node } from "@/model/interface/node";
import { IConnection, queryCallback } from "./connection";
import * as fs from "fs";
import IoRedis from "ioredis";
import IORedis from "ioredis";

export class RedisConnection extends IConnection {
    private conneted: boolean;
    private client: IoRedis.Redis | IORedis.Cluster;
    constructor(private node: Node) {
        super()
        let config = {
            port: node.port,
            host: node.host,
            username: node.user || undefined,
            password: node.password,
            connectTimeout: node.connectTimeout || 5000,
            db: node.database as any as number,
            family: 4,
            reconnectOnError() {
                return false;
            },
        } as IoRedis.RedisOptions;
        if (node.useSSL) {
            config.tls = {
                rejectUnauthorized: false,
                ca: (node.caPath) ? fs.readFileSync(node.caPath) : null,
                cert: (node.clientCertPath) ? fs.readFileSync(node.clientCertPath) : null,
                key: (node.clientKeyPath) ? fs.readFileSync(node.clientKeyPath) : null,
                minVersion: 'TLSv1'
            }
        }
        this.client = node.isCluster ? new IoRedis.Cluster([{ host: config.host, port: config.port }], { redisOptions: config }) : new IoRedis(config);


    }
    query(sql: string, callback?: queryCallback): void;
    query(sql: string, values: any, callback?: queryCallback): void;
    query(sql: any, values?: any, callback?: any) {
        const param: string[] = sql.replace(/ +/g, " ").split(' ')
        const command = param.shift()
        if (this.client instanceof IoRedis) {
            this.client.send_command(command, param, callback)
        } else {
            throw new Error("Redis cluster not support send command!")
        }
    }
    run(callback: (client: IoRedis.Redis | IORedis.Cluster) => void) {

        callback(this.client)
    }

    connect(callback: (err: Error) => void): void {
        let occurError = false;
        this.client.on('error', err => {
            if (occurError) return;
            occurError = true;
            callback(err)
        })
        setTimeout(() => {
            if (occurError) return;
            occurError = true;
            callback(new Error("Connect to redis server time out."))
        }, this.node.connectTimeout || 5000);
        this.client.ping((err) => {
            if (occurError) return;
            occurError = true;
            callback(err)
        })
    }
    beginTransaction(callback: (err: Error) => void): void {
    }
    rollback(): void {
    }
    commit(): void {
    }
    end(): void {
    }
    isAlive(): boolean {
        return this.conneted;
    }

}