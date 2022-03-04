# Database Client for Visual Studio Code

<p align="center">
<a href="https://marketplace.visualstudio.com/items?itemName=RobertOstermann.database-client">
    <img src="https://img.shields.io/vscode-marketplace/v/RobertOstermann.database-client.svg?label=vscode%20marketplace">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=RobertOstermann.database-client">
    <img src="https://vsmarketplacebadge.apphb.com/installs-short/RobertOstermann.database-client.svg">
  </a>
  <a href="https://github.com/RobertOstermann/vscode-database-client">
    <img src="https://img.shields.io/github/stars/RobertOstermann/vscode-database-client?logo=github&style=flat">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=RobertOstermann.database-client">
    <img src="https://img.shields.io/vscode-marketplace/r/RobertOstermann.database-client.svg">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=RobertOstermann.database-client">
  <img alt="GitHub" src="https://img.shields.io/github/license/RobertOstermann/vscode-database-client">
  </a>
</p>
<br>

The Database Client makes your life easy. It supports manager MySQL/MariaDB, PostgreSQL, SQLite, Redis, and ElasticSearch.

> Project site: [vscode-database-client](https://github.com/RobertOstermann/vscode-database-client)

## Features

- [Database Client](#database-client)
  - [Connect](#connect)
  - [Table](#table)
  - [Execute SQL Query](#execute-sql-query)
  - [Backup/Import](#backupimport)
  - [Setting](#setting)
  - [Filter](#filter)
  - [Generate Mock Data](#generate-mock-data)
  - [History](#history)

## Installation

Install from vscode marketplace [vscode-database-client](https://marketplace.visualstudio.com/items?itemName=RobertOstermann.vscode-mysql-client2).

## Connect

1. Open Database Explorer panel, then click the `+` button.
2. Select your database type, input connection config then click the connect button.

![connection](images/connection.jpg)

## Table

1. Click table to open table view.
2. Then you can do data modification on the view page.

![query](images/QueryTable.jpg)

## Execute SQL Query

In the Database Explorer panel, click the `Open Query` button.

![newquery](images/newquery.jpg)

That will open a SQL editor bind of database, it provider:

1. IntelliSense SQL edit.
2. snippets:`sel、del、ins、upd、joi`...
3. Run selected or current cursor SQL (Shortcut : Ctrl+Enter).
4. Run all SQL (Shortcut : Ctrl+Shift+Enter).

Note: The extension is developed using Nodejs. Nodejs does not allow duplicate name attributes, so you need to avoid columns with the same name in your query, otherwise the results will not be displayed in full.

![run](images/run.jpg)

This extension supports codelen, but does not support stored procedures and functions. If you use them frequently, it is recommended to disable codelen
![image](https://user-images.githubusercontent.com/27798227/144196926-e581872e-5392-4744-a646-a644749c548c.png)

## Cache

In order to improve performance, the database information is cached. If your database structure changes externally, you need to click the refresh button to refresh the cache。

![](images/1638342622208.png)

## Backup/Import

Move to ant DatabaseNode or TableNode. The export/import options are listed in the context menu (right click to open).

The extension implements the backup function, but it is not stable enough. You can add mysql_dump or pg_dump to the environment variable, and the extension will use these tools for backup.

![bakcup](images/Backup.jpg)

## Setting

This extension contain some setting, can be modified as follows.

![image](https://user-images.githubusercontent.com/27798227/146523121-9de9c708-8a8e-4e3b-ae1d-9da36f3217e1.png)
![](images/1611910592756.png)

## Note

1. MSSQL, ClickHouse and MongoDB dit not get higt support and are only recommended for browsing data.
2. SQL formatter stop maintenance, do not report related issue.

## Filter

Used to quickly filter the table, if there is an input box to simplify the search operation, but unfortunately VSCode does not support this function.

![filter](images/filter.gif)

## Generate Mock Data

You can easily generate test data.

![mockData](images/mockData.jpg)

## History

Click the history button to open the list of recently executed query history records.

![history](images/history.jpg)

## Credits

- [mysql](https://github.com/cweijan/vscode-database-client) which this project is forked from.
- [sql-formatter](https://github.com/zeroturnaround/sql-formatter) Sql format lib.
- [umy-ui](https://github.com/u-leo/umy-ui): Result view render.
- [ssh2](https://github.com/mscdex/ssh2): SSH client.
- Client Lib:
  - [node-mysql2](https://github.com/sidorares/node-mysql2) : MySQL client.
  - [node-postgres](https://github.com/brianc/node-postgres): PostgreSQL client.
  - [tedious](https://github.com/tediousjs/tedious): SqlServer client.
  - [ioredis](https://github.com/luin/ioredis): Redis client.
  - [vscode-sqlite](https://github.com/AlexCovizzi/vscode-sqlite): SQLite client code reference.
